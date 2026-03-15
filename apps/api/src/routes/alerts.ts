import type { FastifyPluginAsync } from 'fastify'
import { db, alerts, caseActivity } from '@cfr/db'
import { eq, desc } from 'drizzle-orm'

export const alertRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/alerts?tenantId=...
  app.get<{ Querystring: { tenantId?: string } }>('/', async (req) => {
    const { tenantId } = req.query
    if (tenantId) {
      return db.select().from(alerts).where(eq(alerts.tenantId, tenantId)).orderBy(desc(alerts.createdAt)).all()
    }
    return db.select().from(alerts).orderBy(desc(alerts.createdAt)).all()
  })

  // GET /api/alerts/:id
  app.get<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const row = db.select().from(alerts).where(eq(alerts.id, req.params.id)).get()
    if (!row) return reply.code(404).send({ error: 'Alert not found' })
    return row
  })

  // PATCH /api/alerts/:id  — update status
  app.patch<{ Params: { id: string }; Body: { status: 'open' | 'acknowledged' | 'resolved' } }>('/:id', async (req, reply) => {
    const { status } = req.body
    const existing = db.select().from(alerts).where(eq(alerts.id, req.params.id)).get()
    if (!existing) return reply.code(404).send({ error: 'Alert not found' })
    db.update(alerts).set({ status }).where(eq(alerts.id, req.params.id)).run()
    return { ...existing, status }
  })

  // GET /api/alerts/:id/activity
  app.get<{ Params: { id: string } }>('/:id/activity', async (req) => {
    return db
      .select()
      .from(caseActivity)
      .where(eq(caseActivity.alertId, req.params.id))
      .orderBy(desc(caseActivity.timestamp))
      .all()
  })

  // POST /api/alerts/:id/activity — add case activity entry
  app.post<{ Params: { id: string }; Body: { actor: string; action: string; detail: string } }>('/:id/activity', async (req) => {
    const { actor, action, detail } = req.body
    const id = `${req.params.id}-${Date.now()}`
    const alertRow = db.select().from(alerts).where(eq(alerts.id, req.params.id)).get()
    const tenantId = alertRow?.tenantId ?? ''

    db.insert(caseActivity).values({
      id,
      tenantId,
      alertId: req.params.id,
      timestamp: new Date().toISOString(),
      actor,
      action,
      detail,
    }).run()
    return { id, tenantId, alertId: req.params.id, timestamp: new Date().toISOString(), actor, action, detail }
  })
}
