import type { FastifyPluginAsync } from 'fastify'
import { db, policies } from '@cfr/db'
import { eq } from 'drizzle-orm'

export const policyRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/policies?tenantId=...
  app.get<{ Querystring: { tenantId?: string } }>('/', async (req) => {
    const { tenantId } = req.query
    if (tenantId) {
      return db.select().from(policies).where(eq(policies.tenantId, tenantId)).all()
    }
    return db.select().from(policies).all()
  })

  // GET /api/policies/:id
  app.get<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const row = db.select().from(policies).where(eq(policies.id, req.params.id)).get()
    if (!row) return reply.code(404).send({ error: 'Policy not found' })
    return row
  })

  // PATCH /api/policies/:id
  app.patch<{ Params: { id: string }; Body: { enabled?: boolean } }>('/:id', async (req, reply) => {
    const existing = db.select().from(policies).where(eq(policies.id, req.params.id)).get()
    if (!existing) return reply.code(404).send({ error: 'Policy not found' })
    db.update(policies).set(req.body).where(eq(policies.id, req.params.id)).run()
    return { ...existing, ...req.body }
  })
}
