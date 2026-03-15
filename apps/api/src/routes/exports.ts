import type { FastifyPluginAsync } from 'fastify'
import { db, agents, alerts, policies, agentEvents, caseActivity, auditLog } from '@cfr/db'
import { eq, desc, and, gte } from 'drizzle-orm'
import { recordAudit } from '../services/auditService'

export const exportRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/export/csv/alerts — Export alerts as CSV
  app.get<{
    Querystring: { since?: string; status?: string }
  }>('/csv/alerts', async (req, reply) => {
    const tenantId = req.auth?.tenantId ?? 'tenant-northwind'

    const conditions = [eq(alerts.tenantId, tenantId)]
    if (req.query.since) conditions.push(gte(alerts.createdAt, req.query.since))
    if (req.query.status) conditions.push(eq(alerts.status, req.query.status))

    const rows = db.select().from(alerts)
      .where(and(...conditions))
      .orderBy(desc(alerts.createdAt))
      .all()

    const header = 'ID,Title,Severity,Status,Agent ID,Policy ID,Created At,Description,Recommended Action'
    const csv = [
      header,
      ...rows.map((r) =>
        [r.id, csvEscape(r.title), r.severity, r.status, r.agentId, r.policyId ?? '', r.createdAt, csvEscape(r.description), csvEscape(r.recommendedAction)].join(',')
      ),
    ].join('\n')

    recordAudit({
      tenantId,
      userId: req.auth?.userId ?? 'dev-user',
      userEmail: req.auth?.email ?? 'dev@northwind.com',
      action: 'export.csv',
      resourceType: 'alerts',
      resourceId: 'bulk-export',
      detail: `Exported ${rows.length} alerts to CSV`,
    }, req)

    reply
      .header('Content-Type', 'text/csv')
      .header('Content-Disposition', `attachment; filename="cfr-alerts-${new Date().toISOString().slice(0, 10)}.csv"`)
      .send(csv)
  })

  // GET /api/export/csv/audit — Export audit log as CSV
  app.get<{
    Querystring: { since?: string }
  }>('/csv/audit', async (req, reply) => {
    const tenantId = req.auth?.tenantId ?? 'tenant-northwind'

    const conditions = [eq(auditLog.tenantId, tenantId)]
    if (req.query.since) conditions.push(gte(auditLog.timestamp, req.query.since))

    const rows = db.select().from(auditLog)
      .where(and(...conditions))
      .orderBy(desc(auditLog.timestamp))
      .all()

    const header = 'Timestamp,User,Email,Action,Resource Type,Resource ID,Resource Name,Detail,IP Address'
    const csv = [
      header,
      ...rows.map((r) =>
        [r.timestamp, csvEscape(r.userId), csvEscape(r.userEmail), r.action, r.resourceType, r.resourceId, csvEscape(r.resourceName ?? ''), csvEscape(r.detail ?? ''), r.ipAddress ?? ''].join(',')
      ),
    ].join('\n')

    reply
      .header('Content-Type', 'text/csv')
      .header('Content-Disposition', `attachment; filename="cfr-audit-${new Date().toISOString().slice(0, 10)}.csv"`)
      .send(csv)
  })

  // GET /api/export/csv/agents — Export agents as CSV
  app.get('/csv/agents', async (req, reply) => {
    const tenantId = req.auth?.tenantId ?? 'tenant-northwind'

    const rows = db.select().from(agents).where(eq(agents.tenantId, tenantId)).all()

    const header = 'ID,Name,Owner,Environment,Status,Autonomy Level,Business Purpose,Last Deployment,Events 24h,Open Incidents'
    const csv = [
      header,
      ...rows.map((r) =>
        [r.id, csvEscape(r.name), csvEscape(r.owner), r.environment, r.status, r.autonomyLevel, csvEscape(r.businessPurpose), r.lastDeployment, r.events24h, r.openIncidents].join(',')
      ),
    ].join('\n')

    reply
      .header('Content-Type', 'text/csv')
      .header('Content-Disposition', `attachment; filename="cfr-agents-${new Date().toISOString().slice(0, 10)}.csv"`)
      .send(csv)
  })

  // GET /api/export/json/report — Full compliance report as JSON
  app.get('/json/report', async (req, reply) => {
    const tenantId = req.auth?.tenantId ?? 'tenant-northwind'

    const agentRows = db.select().from(agents).where(eq(agents.tenantId, tenantId)).all()
    const alertRows = db.select().from(alerts).where(eq(alerts.tenantId, tenantId)).orderBy(desc(alerts.createdAt)).all()
    const policyRows = db.select().from(policies).where(eq(policies.tenantId, tenantId)).all()
    const activityRows = db.select().from(caseActivity).where(eq(caseActivity.tenantId, tenantId)).orderBy(desc(caseActivity.timestamp)).all()
    const auditRows = db.select().from(auditLog).where(eq(auditLog.tenantId, tenantId)).orderBy(desc(auditLog.timestamp)).limit(500).all()

    const report = {
      generatedAt: new Date().toISOString(),
      tenantId,
      summary: {
        totalAgents: agentRows.length,
        totalAlerts: alertRows.length,
        openAlerts: alertRows.filter((a) => a.status === 'open').length,
        criticalAlerts: alertRows.filter((a) => a.severity === 'critical' && a.status === 'open').length,
        activePolicies: policyRows.filter((p) => p.enabled).length,
        totalPolicies: policyRows.length,
      },
      agents: agentRows,
      alerts: alertRows,
      policies: policyRows,
      caseActivity: activityRows,
      auditTrail: auditRows,
    }

    recordAudit({
      tenantId,
      userId: req.auth?.userId ?? 'dev-user',
      userEmail: req.auth?.email ?? 'dev@northwind.com',
      action: 'export.pdf',
      resourceType: 'report',
      resourceId: 'compliance-report',
      detail: `Generated full compliance report`,
    }, req)

    reply
      .header('Content-Type', 'application/json')
      .header('Content-Disposition', `attachment; filename="cfr-compliance-report-${new Date().toISOString().slice(0, 10)}.json"`)
      .send(report)
  })
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}
