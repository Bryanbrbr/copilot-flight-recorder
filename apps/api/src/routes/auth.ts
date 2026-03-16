import type { FastifyInstance } from 'fastify'
import { db } from '@cfr/db'
import { users, tenants, policies } from '@cfr/db'
import { eq } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import { signToken, hashPassword, verifyPassword } from '../services/jwtService.js'

// Default policies created for each new tenant
const DEFAULT_POLICIES = [
  {
    name: 'Sensitive record access requires approval',
    description: 'Any HR or Finance data read above the confidentiality threshold must request approval.',
    severity: 'critical',
    scope: 'Global',
    trigger: 'Sensitive dataset read without approval token',
    action: 'Block',
  },
  {
    name: 'Repeated tool loop detection',
    description: 'Flag repeated calls to the same tool within a short execution window.',
    severity: 'high',
    scope: 'Global',
    trigger: '3+ repeated tool invocations in 5 minutes',
    action: 'Alert',
  },
  {
    name: 'External send requires confidence threshold',
    description: 'When an agent drafts or sends an external message, confidence must remain above policy threshold.',
    severity: 'high',
    scope: 'Global',
    trigger: 'External response generated with low confidence',
    action: 'Require approval',
  },
  {
    name: 'Bulk write protection',
    description: 'Prevent agents from modifying large batches of records without explicit human confirmation.',
    severity: 'critical',
    scope: 'Global',
    trigger: 'Bulk write to more than 25 records',
    action: 'Quarantine',
  },
]

export async function authRoutes(app: FastifyInstance) {
  // Register
  app.post('/register', async (request, reply) => {
    const body = request.body as { name?: string; email?: string; password?: string } | null
    if (!body) return reply.code(400).send({ error: 'Request body required' })

    const name = (body.name ?? '').trim()
    const email = (body.email ?? '').trim().toLowerCase()
    const password = body.password ?? ''

    if (!name || name.length > 200) return reply.code(400).send({ error: 'Valid name is required (max 200 chars).' })
    if (!email || !email.includes('@') || email.length > 200) return reply.code(400).send({ error: 'Valid email is required.' })
    if (password.length < 8 || password.length > 200) return reply.code(400).send({ error: 'Password must be 8-200 characters.' })

    // Check if email already exists
    const existing = db.select().from(users).where(eq(users.email, email)).get()
    if (existing) {
      return reply.code(409).send({ error: 'An account with this email already exists.' })
    }

    const tenantId = `tenant-${randomUUID().slice(0, 8)}`
    const userId = `user-${randomUUID().slice(0, 12)}`
    const now = new Date().toISOString()

    // Create tenant
    db.insert(tenants).values({
      id: tenantId,
      name: `${name}'s Workspace`,
      plan: 'free',
      createdAt: now,
    }).run()

    // Create user
    const passwordHash = hashPassword(password)
    db.insert(users).values({
      id: userId,
      tenantId,
      email,
      name,
      passwordHash,
      role: 'admin',
      createdAt: now,
    }).run()

    // Create default policies
    for (const policy of DEFAULT_POLICIES) {
      db.insert(policies).values({
        id: `pol-${randomUUID().slice(0, 8)}`,
        tenantId,
        ...policy,
        enabled: true,
      }).run()
    }

    const token = signToken({ userId, tenantId, email, name, role: 'admin' })

    return reply.code(201).send({
      token,
      user: { id: userId, tenantId, email, name, role: 'admin' },
    })
  })

  // Login
  app.post('/login', async (request, reply) => {
    const body = request.body as { email?: string; password?: string } | null
    if (!body) return reply.code(400).send({ error: 'Request body required' })

    const email = (body.email ?? '').trim().toLowerCase()
    const password = body.password ?? ''

    if (!email) return reply.code(400).send({ error: 'Email is required.' })
    if (!password) return reply.code(400).send({ error: 'Password is required.' })

    const user = db.select().from(users).where(eq(users.email, email)).get()
    if (!user) {
      return reply.code(401).send({ error: 'Invalid email or password.' })
    }

    const valid = verifyPassword(password, user.passwordHash)
    if (!valid) {
      return reply.code(401).send({ error: 'Invalid email or password.' })
    }

    // Get tenant name
    const tenant = db.select().from(tenants).where(eq(tenants.id, user.tenantId)).get()

    const token = signToken({
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      name: user.name,
      role: user.role,
    })

    return reply.send({
      token,
      user: {
        id: user.id,
        tenantId: user.tenantId,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantName: tenant?.name ?? 'Workspace',
      },
    })
  })

  // Get current user
  app.get('/me', async (request, reply) => {
    if (!request.auth) {
      return reply.code(401).send({ error: 'Not authenticated' })
    }

    const user = db.select().from(users).where(eq(users.email, request.auth.email)).get()
    const tenant = db.select().from(tenants).where(eq(tenants.id, request.auth.tenantId)).get()

    return reply.send({
      user: {
        id: request.auth.userId,
        tenantId: request.auth.tenantId,
        email: request.auth.email,
        name: request.auth.name,
        role: user?.role ?? 'viewer',
        tenantName: tenant?.name ?? 'Workspace',
        plan: tenant?.plan ?? 'free',
      },
    })
  })
}
