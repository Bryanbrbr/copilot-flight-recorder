import type { FastifyPluginAsync } from 'fastify'
import { db, policies } from '@cfr/db'
import { eq, and } from 'drizzle-orm'

export const policyRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/policies — always scoped to authenticated tenant
  app.get('/', async (req) => {
    const tenantId = req.auth!.tenantId
    return db.select().from(policies).where(eq(policies.tenantId, tenantId)).all()
  })

  // GET /api/policies/:id — verify ownership
  app.get<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const tenantId = req.auth!.tenantId
    const row = db.select().from(policies).where(and(eq(policies.id, req.params.id), eq(policies.tenantId, tenantId))).get()
    if (!row) return reply.code(404).send({ error: 'Policy not found' })
    return row
  })

  // PATCH /api/policies/:id — only allow updating specific fields
  app.patch<{ Params: { id: string }; Body: { enabled?: boolean } }>('/:id', async (req, reply) => {
    const tenantId = req.auth!.tenantId
    const existing = db.select().from(policies).where(and(eq(policies.id, req.params.id), eq(policies.tenantId, tenantId))).get()
    if (!existing) return reply.code(404).send({ error: 'Policy not found' })
    // Only allow updating 'enabled' — never pass raw req.body to set()
    const updates: Record<string, unknown> = {}
    if (typeof req.body.enabled === 'boolean') updates.enabled = req.body.enabled
    if (Object.keys(updates).length === 0) return reply.code(400).send({ error: 'No valid fields to update' })
    db.update(policies).set(updates).where(eq(policies.id, req.params.id)).run()
    return { ...existing, ...updates }
  })
}
