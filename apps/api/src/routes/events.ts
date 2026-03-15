import type { FastifyPluginAsync } from 'fastify'
import { db, agentEvents } from '@cfr/db'
import { eq, desc } from 'drizzle-orm'

export const eventRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/events?tenantId=...
  app.get<{ Querystring: { tenantId?: string } }>('/', async (req) => {
    const { tenantId } = req.query
    if (tenantId) {
      return db.select().from(agentEvents).where(eq(agentEvents.tenantId, tenantId)).orderBy(desc(agentEvents.timestamp)).limit(100).all()
    }
    return db.select().from(agentEvents).orderBy(desc(agentEvents.timestamp)).limit(100).all()
  })

  // GET /api/events/:id
  app.get<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const row = db.select().from(agentEvents).where(eq(agentEvents.id, req.params.id)).get()
    if (!row) return reply.code(404).send({ error: 'Event not found' })
    return row
  })
}
