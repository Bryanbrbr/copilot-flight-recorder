import { db } from '@cfr/db'
import { apiKeys } from '@cfr/db'
import { eq, and } from 'drizzle-orm'
import { createHash } from 'crypto'
import type { FastifyRequest, FastifyReply } from 'fastify'

function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

/**
 * Middleware hook for API key authentication.
 * Reads X-API-Key header, validates against database, injects tenantId.
 */
export async function validateApiKey(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const apiKey = request.headers['x-api-key'] as string | undefined

  if (!apiKey) {
    reply.code(401).send({ error: 'Missing X-API-Key header' })
    return
  }

  const keyHash = hashApiKey(apiKey)
  const key = db.select().from(apiKeys)
    .where(and(eq(apiKeys.keyHash, keyHash), eq(apiKeys.revoked, false)))
    .get()

  if (!key) {
    reply.code(401).send({ error: 'Invalid or revoked API key' })
    return
  }

  // Update last used timestamp
  db.update(apiKeys)
    .set({ lastUsedAt: new Date().toISOString() })
    .where(eq(apiKeys.id, key.id))
    .run()

  // Inject auth payload from API key
  request.auth = {
    tenantId: key.tenantId,
    userId: `apikey-${key.id}`,
    email: 'api-key',
    name: key.name,
  }
}
