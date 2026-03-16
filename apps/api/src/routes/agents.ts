import type { FastifyPluginAsync } from 'fastify'
import { db, agents, agentEvents } from '@cfr/db'
import { eq, and, desc } from 'drizzle-orm'

export const agentRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/agents — always scoped to authenticated tenant
  app.get('/', async (req) => {
    const tenantId = req.auth!.tenantId
    return db.select().from(agents).where(eq(agents.tenantId, tenantId)).all()
  })

  // GET /api/agents/:id — verify ownership
  app.get<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const tenantId = req.auth!.tenantId
    const row = db.select().from(agents).where(and(eq(agents.id, req.params.id), eq(agents.tenantId, tenantId))).get()
    if (!row) return reply.code(404).send({ error: 'Agent not found' })
    return row
  })

  // GET /api/agents/:id/events — scoped to tenant
  app.get<{ Params: { id: string } }>('/:id/events', async (req) => {
    const tenantId = req.auth!.tenantId
    return db
      .select()
      .from(agentEvents)
      .where(and(eq(agentEvents.agentId, req.params.id), eq(agentEvents.tenantId, tenantId)))
      .orderBy(desc(agentEvents.timestamp))
      .all()
  })
}
