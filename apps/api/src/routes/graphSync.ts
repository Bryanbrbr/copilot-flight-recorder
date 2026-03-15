import type { FastifyPluginAsync } from 'fastify'
import { db, agents, alerts, agentEvents, graphSyncLog } from '@cfr/db'
import { eq, desc } from 'drizzle-orm'
import { syncFromGraph, mapGraphToDomain } from '../services/graphClient'
import { recordAudit } from '../services/auditService'
import type { GraphToken } from '../services/graphClient'

export const graphSyncRoutes: FastifyPluginAsync = async (app) => {
  // POST /api/graph/sync — trigger a manual Graph API sync
  app.post<{ Body: { accessToken: string } }>('/sync', async (req, reply) => {
    const tenantId = req.auth?.tenantId ?? 'tenant-northwind'
    const userId = req.auth?.userId ?? 'dev-user'
    const userEmail = req.auth?.email ?? 'dev@northwind.com'

    const syncId = crypto.randomUUID()
    const startedAt = new Date().toISOString()

    // Log sync start
    db.insert(graphSyncLog).values({
      id: syncId,
      tenantId,
      startedAt,
      status: 'running',
    }).run()

    try {
      const token: GraphToken = {
        accessToken: req.body.accessToken,
        tenantId,
      }

      const syncResult = await syncFromGraph(token)
      const domain = mapGraphToDomain(syncResult)

      // Upsert agents
      for (const agent of domain.agents) {
        const existing = db.select().from(agents).where(eq(agents.id, agent.id)).get()
        if (existing) {
          db.update(agents).set(agent).where(eq(agents.id, agent.id)).run()
        } else {
          db.insert(agents).values(agent).run()
        }
      }

      // Upsert alerts
      for (const alert of domain.alerts) {
        const existing = db.select().from(alerts).where(eq(alerts.id, alert.id)).get()
        if (existing) {
          db.update(alerts).set(alert).where(eq(alerts.id, alert.id)).run()
        } else {
          db.insert(alerts).values(alert).run()
        }
      }

      // Insert new events (skip duplicates)
      for (const event of domain.events) {
        const existing = db.select().from(agentEvents).where(eq(agentEvents.id, event.id)).get()
        if (!existing) {
          db.insert(agentEvents).values(event).run()
        }
      }

      // Mark sync complete
      db.update(graphSyncLog).set({
        completedAt: new Date().toISOString(),
        status: 'success',
        agentCount: domain.agents.length,
        alertCount: domain.alerts.length,
        eventCount: domain.events.length,
      }).where(eq(graphSyncLog.id, syncId)).run()

      // Audit log
      recordAudit({
        tenantId,
        userId,
        userEmail,
        action: 'graph.sync',
        resourceType: 'graph',
        resourceId: syncId,
        detail: `Synced ${domain.agents.length} agents, ${domain.alerts.length} alerts, ${domain.events.length} events from Microsoft Graph`,
      }, req)

      return {
        syncId,
        status: 'success',
        agents: domain.agents.length,
        alerts: domain.alerts.length,
        events: domain.events.length,
        syncedAt: syncResult.syncedAt,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)

      db.update(graphSyncLog).set({
        completedAt: new Date().toISOString(),
        status: 'failed',
        errorMessage: message,
      }).where(eq(graphSyncLog.id, syncId)).run()

      reply.code(502).send({ error: 'Graph sync failed', detail: message })
    }
  })

  // GET /api/graph/sync/history — view sync history
  app.get('/sync/history', async (req) => {
    const tenantId = req.auth?.tenantId ?? 'tenant-northwind'
    return db
      .select()
      .from(graphSyncLog)
      .where(eq(graphSyncLog.tenantId, tenantId))
      .orderBy(desc(graphSyncLog.startedAt))
      .limit(50)
      .all()
  })
}
