import type { FastifyPluginAsync } from 'fastify'
import { db, agentEvents } from '@cfr/db'
import { eq, and, desc } from 'drizzle-orm'

export const eventRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/events — always scoped to authenticated tenant
  app.get('/', async (req) => {
    const tenantId = req.auth!.tenantId
    return db.select().from(agentEvents).where(eq(agentEvents.tenantId, tenantId)).orderBy(desc(agentEvents.timestamp)).limit(100).all()
  })

  // GET /api/events/:id — verify ownership
  app.get<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const tenantId = req.auth!.tenantId
    const row = db.select().from(agentEvents).where(and(eq(agentEvents.id, req.params.id), eq(agentEvents.tenantId, tenantId))).get()
    if (!row) return reply.code(404).send({ error: 'Event not found' })
    return row
  })
}
