import type { FastifyInstance } from 'fastify'
import { db } from '@cfr/db'
import { agentEvents, agents, tenants } from '@cfr/db'
import { eq, and } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import { validateApiKey } from '../middleware/apiKeyAuth.js'
import { evaluateEvent } from '../services/policyEngine.js'
import { eventBus } from '../services/eventBus.js'

const VALID_EVENT_TYPES = [
  'message.received', 'tool.called', 'tool.failed', 'data.read', 'data.write',
  'response.generated', 'approval.requested', 'approval.granted', 'approval.denied',
  'approval.skipped', 'action.blocked', 'workflow.completed', 'workflow.failed',
]

const VALID_OUTCOMES = ['success', 'warning', 'failure', 'blocked']

export async function ingestRoutes(app: FastifyInstance) {
  // Ingest events — authenticated by API key
  app.post('/events', { preHandler: validateApiKey }, async (request, reply) => {
    const tenantId = request.auth!.tenantId

    // Check plan limits
    const tenant = db.select().from(tenants).where(eq(tenants.id, tenantId)).get()
    if (!tenant) return reply.code(403).send({ error: 'Tenant not found' })

    const body = request.body as {
      agentId?: string
      agentName?: string
      type?: string
      title?: string
      summary?: string
      outcome?: string
      riskScore?: number
      actor?: string
      target?: string
      metadata?: Record<string, unknown>
    } | null

    if (!body) return reply.code(400).send({ error: 'Request body required' })

    const { agentId, agentName, type, title, summary, outcome, riskScore, actor, target, metadata } = body

    // Validation
    if (!agentId || typeof agentId !== 'string' || agentId.length > 100) {
      return reply.code(400).send({ error: 'agentId is required (string, max 100 chars)' })
    }
    if (!type || !VALID_EVENT_TYPES.includes(type)) {
      return reply.code(400).send({ error: `type must be one of: ${VALID_EVENT_TYPES.join(', ')}` })
    }
    if (!title || typeof title !== 'string' || title.length > 500) {
      return reply.code(400).send({ error: 'title is required (string, max 500 chars)' })
    }
    if (!summary || typeof summary !== 'string' || summary.length > 2000) {
      return reply.code(400).send({ error: 'summary is required (string, max 2000 chars)' })
    }
    if (!outcome || !VALID_OUTCOMES.includes(outcome)) {
      return reply.code(400).send({ error: `outcome must be one of: ${VALID_OUTCOMES.join(', ')}` })
    }

    const safeRiskScore = Math.max(0, Math.min(100, Number(riskScore) || 0))
    const safeActor = (actor ?? agentName ?? agentId).slice(0, 200)

    // Auto-create agent if it doesn't exist
    const existingAgent = db.select().from(agents)
      .where(and(eq(agents.id, agentId), eq(agents.tenantId, tenantId)))
      .get()

    if (!existingAgent) {
      // Check plan limits for agents
      if (tenant.plan === 'free') {
        const agentCount = db.select().from(agents).where(eq(agents.tenantId, tenantId)).all().length
        if (agentCount >= 5) {
          return reply.code(403).send({ error: 'Free plan limited to 5 agents. Upgrade to Pro for unlimited agents.' })
        }
      }

      db.insert(agents).values({
        id: agentId,
        tenantId,
        name: agentName ?? agentId,
        owner: safeActor,
        environment: 'Custom',
        businessPurpose: 'Connected via API',
        autonomyLevel: 'semi-autonomous',
        lastDeployment: new Date().toISOString(),
        status: 'healthy',
        events24h: 0,
        openIncidents: 0,
      }).run()
    }

    // Insert the event
    const eventId = `evt-${randomUUID().slice(0, 12)}`
    const now = new Date().toISOString()

    db.insert(agentEvents).values({
      id: eventId,
      tenantId,
      agentId,
      timestamp: now,
      type,
      title,
      summary,
      outcome,
      riskScore: safeRiskScore,
      actor: safeActor,
      target: target?.slice(0, 200) ?? null,
      metadata: metadata ? JSON.stringify(metadata) : null,
    }).run()

    // Update agent stats
    db.update(agents)
      .set({
        events24h: (existingAgent?.events24h ?? 0) + 1,
        status: safeRiskScore >= 80 ? 'critical' : safeRiskScore >= 50 ? 'watch' : existingAgent?.status ?? 'healthy',
        lastDeployment: now,
      })
      .where(eq(agents.id, agentId))
      .run()

    // Evaluate policies
    const policyMatches = evaluateEvent({
      id: eventId,
      agentId,
      tenantId,
      type,
      title,
      summary,
      outcome,
      riskScore: safeRiskScore,
      actor: safeActor,
      target,
      metadata,
    })

    // Broadcast to SSE clients
    const sseEvent = {
      id: eventId,
      agentId,
      agentName: existingAgent?.name ?? agentName ?? agentId,
      timestamp: now,
      type,
      title,
      summary,
      outcome,
      riskScore: safeRiskScore,
    }
    eventBus.broadcast(tenantId, sseEvent)

    return reply.code(201).send({
      eventId,
      agentId,
      policyMatches: policyMatches.length,
      alerts: policyMatches.map(m => ({
        policyName: m.policyName,
        severity: m.severity,
        action: m.action,
      })),
    })
  })

  // Register/update an agent
  app.post('/agents', { preHandler: validateApiKey }, async (request, reply) => {
    const tenantId = request.auth!.tenantId

    const body = request.body as {
      id?: string
      name?: string
      owner?: string
      environment?: string
      businessPurpose?: string
      autonomyLevel?: string
    } | null

    if (!body?.id) return reply.code(400).send({ error: 'Agent id is required' })
    if (!body?.name) return reply.code(400).send({ error: 'Agent name is required' })

    const existing = db.select().from(agents)
      .where(and(eq(agents.id, body.id), eq(agents.tenantId, tenantId)))
      .get()

    if (existing) {
      // Update
      db.update(agents).set({
        name: body.name.slice(0, 200),
        owner: (body.owner ?? existing.owner).slice(0, 200),
        environment: body.environment ?? existing.environment,
        businessPurpose: (body.businessPurpose ?? existing.businessPurpose).slice(0, 500),
        autonomyLevel: body.autonomyLevel ?? existing.autonomyLevel,
        lastDeployment: new Date().toISOString(),
      }).where(eq(agents.id, body.id)).run()

      return reply.send({ ok: true, action: 'updated' })
    }

    // Create
    const tenant = db.select().from(tenants).where(eq(tenants.id, tenantId)).get()
    if (tenant?.plan === 'free') {
      const count = db.select().from(agents).where(eq(agents.tenantId, tenantId)).all().length
      if (count >= 5) {
        return reply.code(403).send({ error: 'Free plan limited to 5 agents.' })
      }
    }

    db.insert(agents).values({
      id: body.id.slice(0, 100),
      tenantId,
      name: body.name.slice(0, 200),
      owner: (body.owner ?? 'Unknown').slice(0, 200),
      environment: body.environment ?? 'Custom',
      businessPurpose: (body.businessPurpose ?? 'Connected via API').slice(0, 500),
      autonomyLevel: body.autonomyLevel ?? 'semi-autonomous',
      lastDeployment: new Date().toISOString(),
      status: 'healthy',
      events24h: 0,
      openIncidents: 0,
    }).run()

    return reply.code(201).send({ ok: true, action: 'created' })
  })
}
