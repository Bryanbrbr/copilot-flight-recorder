import type { FastifyInstance } from 'fastify'
import { db } from '@cfr/db'
import { apiKeys } from '@cfr/db'
import { eq, and } from 'drizzle-orm'
import { randomBytes, createHash } from 'crypto'

function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

function generateApiKey(): string {
  return 'cfr_' + randomBytes(24).toString('base64url')
}

export async function apiKeyRoutes(app: FastifyInstance) {
  // List API keys (prefix only, never the full key)
  app.get('/', async (request, reply) => {
    if (!request.auth) return reply.code(401).send({ error: 'Not authenticated' })

    const keys = db.select({
      id: apiKeys.id,
      name: apiKeys.name,
      prefix: apiKeys.prefix,
      createdAt: apiKeys.createdAt,
      lastUsedAt: apiKeys.lastUsedAt,
      revoked: apiKeys.revoked,
    })
      .from(apiKeys)
      .where(eq(apiKeys.tenantId, request.auth!.tenantId))
      .all()

    return reply.send({ keys })
  })

  // Create a new API key
  app.post('/', async (request, reply) => {
    if (!request.auth) return reply.code(401).send({ error: 'Not authenticated' })

    const body = request.body as { name?: string } | null
    const name = (body?.name ?? 'Default Key').trim().slice(0, 200)

    const rawKey = generateApiKey()
    const keyHash = hashApiKey(rawKey)
    const prefix = rawKey.slice(0, 12) // "cfr_" + 8 chars
    const id = `key-${randomBytes(6).toString('hex')}`
    const now = new Date().toISOString()

    db.insert(apiKeys).values({
      id,
      tenantId: request.auth!.tenantId,
      name,
      keyHash,
      prefix,
      createdAt: now,
      revoked: false,
    }).run()

    // Return the full key ONCE — it will never be shown again
    return reply.code(201).send({
      id,
      name,
      key: rawKey,
      prefix,
      createdAt: now,
    })
  })

  // Revoke an API key
  app.delete('/:id', async (request, reply) => {
    if (!request.auth) return reply.code(401).send({ error: 'Not authenticated' })

    const { id } = request.params as { id: string }

    const key = db.select().from(apiKeys)
      .where(and(eq(apiKeys.id, id), eq(apiKeys.tenantId, request.auth!.tenantId)))
      .get()

    if (!key) return reply.code(404).send({ error: 'API key not found' })

    db.update(apiKeys)
      .set({ revoked: true })
      .where(eq(apiKeys.id, id))
      .run()

    return reply.send({ ok: true })
  })
}
