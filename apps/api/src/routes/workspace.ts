import type { FastifyPluginAsync } from 'fastify'
import { db, agents, agentEvents, policies, alerts, caseActivity } from '@cfr/db'
import { eq, desc } from 'drizzle-orm'

export const workspaceRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/workspace — single call to hydrate the full UI (always tenant-scoped)
  app.get('/', async (req) => {
    const tenantId = req.auth!.tenantId

    const agentRows = db.select().from(agents).where(eq(agents.tenantId, tenantId)).all()
    const eventRows = db.select().from(agentEvents).where(eq(agentEvents.tenantId, tenantId)).orderBy(desc(agentEvents.timestamp)).limit(200).all()
    const policyRows = db.select().from(policies).where(eq(policies.tenantId, tenantId)).all()
    const alertRows = db.select().from(alerts).where(eq(alerts.tenantId, tenantId)).orderBy(desc(alerts.createdAt)).all()
    const activityRows = db.select().from(caseActivity).where(eq(caseActivity.tenantId, tenantId)).orderBy(desc(caseActivity.timestamp)).all()

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
