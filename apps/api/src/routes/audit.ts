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
    const tenantId = req.auth!.tenantId

    // Validate and clamp limit to prevent DoS
    const rawLimit = req.query.limit ? parseInt(req.query.limit, 10) : 200
    const limit = Math.min(Math.max(isNaN(rawLimit) ? 200 : rawLimit, 1), 1000)

    // Validate since is a reasonable ISO date if provided
    if (req.query.since && isNaN(Date.parse(req.query.since))) {
      return { error: 'Invalid date format for since parameter' }
    }

    return queryAuditLog({
      tenantId,
      since: req.query.since,
      resourceType: req.query.resourceType,
      userId: req.query.userId,
      limit,
    })
  })
}
