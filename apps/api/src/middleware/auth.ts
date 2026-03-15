import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import type { JWTVerifyGetKey } from 'jose'

// Microsoft Entra ID JWKS endpoint
const JWKS_URI = 'https://login.microsoftonline.com/common/discovery/v2.0/keys'
const ISSUER_PREFIX = 'https://login.microsoftonline.com/'

// Cache the JWKS key set
let jwks: JWTVerifyGetKey | null = null

function getJwks(): JWTVerifyGetKey {
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(JWKS_URI))
  }
  return jwks
}

export type AuthPayload = {
  tenantId: string
  userId: string
  email: string
  name: string
}

declare module 'fastify' {
  interface FastifyRequest {
    auth?: AuthPayload
  }
}

const AUTH_ENABLED = Boolean(process.env.MSAL_CLIENT_ID)

export async function authMiddleware(app: FastifyInstance) {
  app.decorateRequest('auth', undefined)

  app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip auth for health check
    if (request.url === '/api/health') return

    if (!AUTH_ENABLED) {
      // Dev mode — inject mock auth
      request.auth = {
        tenantId: 'tenant-northwind',
        userId: 'dev-user-id',
        email: 'dev@northwind.com',
        name: 'Dev User',
      }
      return
    }

    const authHeader = request.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      reply.code(401).send({ error: 'Missing or invalid Authorization header' })
      return
    }

    const token = authHeader.slice(7)

    try {
      const { payload } = await jwtVerify(token, getJwks(), {
        audience: process.env.MSAL_CLIENT_ID,
      })

      // Validate issuer starts with Entra ID prefix
      const iss = payload.iss ?? ''
      if (!iss.startsWith(ISSUER_PREFIX)) {
        throw new Error(`Invalid issuer: ${iss}`)
      }

      request.auth = {
        tenantId: (payload.tid as string) ?? '',
        userId: (payload.oid as string) ?? (payload.sub as string) ?? '',
        email: (payload.preferred_username as string) ?? (payload.email as string) ?? '',
        name: (payload.name as string) ?? '',
      }
    } catch (err) {
      request.log.warn({ err }, 'JWT verification failed')
      reply.code(401).send({ error: 'Invalid or expired token' })
    }
  })
}
