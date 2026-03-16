import type { FastifyPluginAsync } from 'fastify'
import { db, userRoles } from '@cfr/db'
import { eq, and } from 'drizzle-orm'
import { recordAudit } from '../services/auditService'

const ALLOWED_ROLES = ['admin', 'operator', 'viewer'] as const

export const roleRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/roles — list all roles for the tenant
  app.get('/', async (req) => {
    const tenantId = req.auth!.tenantId
    return db.select().from(userRoles).where(eq(userRoles.tenantId, tenantId)).all()
  })

  // GET /api/roles/me — get current user's role
  app.get('/me', async (req) => {
    const tenantId = req.auth!.tenantId
    const userId = req.auth!.userId

    const role = db.select().from(userRoles)
      .where(and(eq(userRoles.tenantId, tenantId), eq(userRoles.userId, userId)))
      .get()

    // Default to admin for first user
    return role ?? {
      id: 'default',
      tenantId,
      userId,
      userEmail: req.auth!.email,
      role: 'admin',
      assignedAt: new Date().toISOString(),
      assignedBy: 'system',
    }
  })

  // POST /api/roles — assign a role
  app.post<{
    Body: {
      userId: string
      userEmail: string
      role: string
    }
  }>('/', async (req, reply) => {
    const tenantId = req.auth!.tenantId
    const assignedBy = req.auth!.email

    // Validate role
    if (!ALLOWED_ROLES.includes(req.body.role as typeof ALLOWED_ROLES[number])) {
      return reply.code(400).send({ error: `Invalid role. Must be one of: ${ALLOWED_ROLES.join(', ')}` })
    }

    // Validate inputs
    if (!req.body.userId || typeof req.body.userId !== 'string' || req.body.userId.length > 200) {
      return reply.code(400).send({ error: 'Valid userId is required (max 200 characters)' })
    }
    if (!req.body.userEmail || typeof req.body.userEmail !== 'string' || req.body.userEmail.length > 200) {
      return reply.code(400).send({ error: 'Valid userEmail is required (max 200 characters)' })
    }

    // Check caller is admin
    const callerRole = db.select().from(userRoles)
      .where(and(eq(userRoles.tenantId, tenantId), eq(userRoles.userId, req.auth!.userId)))
      .get()

    if (callerRole && callerRole.role !== 'admin') {
      return reply.code(403).send({ error: 'Only admins can assign roles' })
    }

    const id = crypto.randomUUID()

    // Upsert: delete existing role for this user
    db.delete(userRoles).where(
      and(eq(userRoles.tenantId, tenantId), eq(userRoles.userId, req.body.userId))
    ).run()

    db.insert(userRoles).values({
      id,
      tenantId,
      userId: req.body.userId,
      userEmail: req.body.userEmail,
      role: req.body.role,
      assignedAt: new Date().toISOString(),
      assignedBy,
    }).run()

    recordAudit({
      tenantId,
      userId: req.auth!.userId,
      userEmail: assignedBy,
      action: 'user.role_change',
      resourceType: 'user',
      resourceId: req.body.userId,
      resourceName: req.body.userEmail,
      detail: `Assigned role '${req.body.role}' to ${req.body.userEmail}`,
      newValue: { role: req.body.role },
    }, req)

    return { id, status: 'assigned' }
  })

  // DELETE /api/roles/:id
  app.delete<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const tenantId = req.auth!.tenantId

    const role = db.select().from(userRoles)
      .where(and(eq(userRoles.id, req.params.id), eq(userRoles.tenantId, tenantId)))
      .get()

    if (!role) return reply.code(404).send({ error: 'Role not found' })

    db.delete(userRoles).where(eq(userRoles.id, req.params.id)).run()

    return { status: 'deleted' }
  })
}
