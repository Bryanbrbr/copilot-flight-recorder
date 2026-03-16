import type { FastifyPluginAsync } from 'fastify'
import { db, alerts, caseActivity } from '@cfr/db'
import { eq, and, desc } from 'drizzle-orm'

export const alertRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/alerts — always scoped to authenticated tenant
  app.get('/', async (req) => {
    const tenantId = req.auth!.tenantId
    return db.select().from(alerts).where(eq(alerts.tenantId, tenantId)).orderBy(desc(alerts.createdAt)).all()
  })

  // GET /api/alerts/:id — verify ownership
  app.get<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const tenantId = req.auth!.tenantId
    const row = db.select().from(alerts).where(and(eq(alerts.id, req.params.id), eq(alerts.tenantId, tenantId))).get()
    if (!row) return reply.code(404).send({ error: 'Alert not found' })
    return row
  })

  // PATCH /api/alerts/:id — update status (validate allowed values)
  app.patch<{ Params: { id: string }; Body: { status: string } }>('/:id', async (req, reply) => {
    const tenantId = req.auth!.tenantId
    const { status } = req.body
    const allowedStatuses = ['open', 'acknowledged', 'resolved']
    if (!allowedStatuses.includes(status)) {
      return reply.code(400).send({ error: 'Invalid status. Must be: open, acknowledged, or resolved' })
    }
    const existing = db.select().from(alerts).where(and(eq(alerts.id, req.params.id), eq(alerts.tenantId, tenantId))).get()
    if (!existing) return reply.code(404).send({ error: 'Alert not found' })
    db.update(alerts).set({ status }).where(eq(alerts.id, req.params.id)).run()
    return { ...existing, status }
  })

  // GET /api/alerts/:id/activity — scoped to tenant
  app.get<{ Params: { id: string } }>('/:id/activity', async (req) => {
    const tenantId = req.auth!.tenantId
    // Verify alert belongs to tenant first
    const alertRow = db.select().from(alerts).where(and(eq(alerts.id, req.params.id), eq(alerts.tenantId, tenantId))).get()
    if (!alertRow) return []
    return db
      .select()
      .from(caseActivity)
      .where(eq(caseActivity.alertId, req.params.id))
      .orderBy(desc(caseActivity.timestamp))
      .all()
  })

  // POST /api/alerts/:id/activity — add case activity entry (tenant-scoped)
  app.post<{ Params: { id: string }; Body: { actor: string; action: string; detail: string } }>('/:id/activity', async (req, reply) => {
    const tenantId = req.auth!.tenantId
    const { actor, action, detail } = req.body

    // Validate input lengths to prevent abuse
    if (!actor || typeof actor !== 'string' || actor.length > 200) {
      return reply.code(400).send({ error: 'Actor is required and must be under 200 characters' })
    }
    if (!action || typeof action !== 'string' || action.length > 200) {
      return reply.code(400).send({ error: 'Action is required and must be under 200 characters' })
    }
    if (!detail || typeof detail !== 'string' || detail.length > 2000) {
      return reply.code(400).send({ error: 'Detail is required and must be under 2000 characters' })
    }

    // Verify alert belongs to tenant
    const alertRow = db.select().from(alerts).where(and(eq(alerts.id, req.params.id), eq(alerts.tenantId, tenantId))).get()
    if (!alertRow) return reply.code(404).send({ error: 'Alert not found' })

    const id = `${req.params.id}-${Date.now()}`
    db.insert(caseActivity).values({
      id,
      tenantId,
      alertId: req.params.id,
      timestamp: new Date().toISOString(),
      actor,
      action,
      detail,
    }).run()
    return { id, tenantId, alertId: req.params.id, timestamp: new Date().toISOString(), actor, action, detail }
  })
}
