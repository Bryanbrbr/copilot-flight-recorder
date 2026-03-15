import type { FastifyPluginAsync } from 'fastify'
import { db, agents, agentEvents, policies, alerts, caseActivity } from '@cfr/db'
import { eq, desc } from 'drizzle-orm'

export const workspaceRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/workspace?tenantId=...  — single call to hydrate the full UI
  app.get<{ Querystring: { tenantId?: string } }>('/', async (req) => {
    const { tenantId } = req.query

    const agentRows = tenantId
      ? db.select().from(agents).where(eq(agents.tenantId, tenantId)).all()
      : db.select().from(agents).all()

    const eventRows = tenantId
      ? db.select().from(agentEvents).where(eq(agentEvents.tenantId, tenantId)).orderBy(desc(agentEvents.timestamp)).limit(200).all()
      : db.select().from(agentEvents).orderBy(desc(agentEvents.timestamp)).limit(200).all()

    const policyRows = tenantId
      ? db.select().from(policies).where(eq(policies.tenantId, tenantId)).all()
      : db.select().from(policies).all()

    const alertRows = tenantId
      ? db.select().from(alerts).where(eq(alerts.tenantId, tenantId)).orderBy(desc(alerts.createdAt)).all()
      : db.select().from(alerts).orderBy(desc(alerts.createdAt)).all()

    const activityRows = tenantId
      ? db.select().from(caseActivity).where(eq(caseActivity.tenantId, tenantId)).orderBy(desc(caseActivity.timestamp)).all()
      : db.select().from(caseActivity).orderBy(desc(caseActivity.timestamp)).all()

    // Group case activity by alertId
    const activityByAlert: Record<string, typeof activityRows> = {}
    for (const row of activityRows) {
      if (!activityByAlert[row.alertId]) activityByAlert[row.alertId] = []
      activityByAlert[row.alertId].push(row)
    }

    return {
      agents: agentRows,
      events: eventRows,
      policies: policyRows,
      alerts: alertRows,
      caseActivity: activityByAlert,
    }
  })
}
