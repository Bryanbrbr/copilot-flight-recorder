import type { FastifyPluginAsync } from 'fastify'
import { db, agents, agentEvents } from '@cfr/db'
import { eq, desc } from 'drizzle-orm'

export const agentRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/agents?tenantId=...
  app.get<{ Querystring: { tenantId?: string } }>('/', async (req) => {
    const { tenantId } = req.query
    if (tenantId) {
      return db.select().from(agents).where(eq(agents.tenantId, tenantId)).all()
    }
    return db.select().from(agents).all()
  })

  // GET /api/agents/:id
  app.get<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const row = db.select().from(agents).where(eq(agents.id, req.params.id)).get()
    if (!row) return reply.code(404).send({ error: 'Agent not found' })
    return row
  })

  // GET /api/agents/:id/events
  app.get<{ Params: { id: string } }>('/:id/events', async (req) => {
    return db
      .select()
      .from(agentEvents)
      .where(eq(agentEvents.agentId, req.params.id))
      .orderBy(desc(agentEvents.timestamp))
      .all()
  })
}
