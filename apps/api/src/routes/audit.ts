import type { FastifyPluginAsync } from 'fastify'
import { queryAuditLog } from '../services/auditService'

export const auditRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/audit?since=...&resourceType=...&userId=...&limit=...
  app.get<{
    Querystring: {
      since?: string
      resourceType?: string
      userId?: string
      limit?: string
    }
  }>('/', async (req) => {
    const tenantId = req.auth?.tenantId ?? 'tenant-northwind'

    return queryAuditLog({
      tenantId,
      since: req.query.since,
      resourceType: req.query.resourceType,
      userId: req.query.userId,
      limit: req.query.limit ? parseInt(req.query.limit, 10) : 200,
    })
  })
}
