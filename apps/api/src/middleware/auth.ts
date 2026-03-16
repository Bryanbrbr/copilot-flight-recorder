import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import fp from 'fastify-plugin'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import type { JWTVerifyGetKey } from 'jose'
import { verifyToken } from '../services/jwtService.js'

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

const MSAL_ENABLED = Boolean(process.env.MSAL_CLIENT_ID)

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/api/health', '/api/auth/register', '/api/auth/login']

async function authMiddlewarePlugin(app: FastifyInstance) {
  app.decorateRequest('auth', null)

  app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip auth for non-API routes
    if (!request.url.startsWith('/api/')) return

    // Skip auth for public routes
    if (PUBLIC_ROUTES.some(r => request.url.startsWith(r))) return

    // Skip auth for ingest routes (they use API key auth)
    if (request.url.startsWith('/api/ingest')) return

    // Skip auth for Stripe webhook
    if (request.url.startsWith('/api/billing/webhook')) return

    const authHeader = request.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      // In dev mode without MSAL, inject mock auth for backward compatibility
      if (!MSAL_ENABLED && process.env.NODE_ENV !== 'production') {
        request.auth = {
          tenantId: 'tenant-northwind',
          userId: 'dev-user-id',
          email: 'dev@northwind.com',
          name: 'Dev User',
        }
        return
      }
      reply.code(401).send({ error: 'Missing or invalid Authorization header' })
      return
    }

    const token = authHeader.slice(7)

    // Try local JWT first (faster, no network call)
    const localPayload = verifyToken(token)
    if (localPayload) {
      request.auth = {
        tenantId: localPayload.tenantId,
        userId: localPayload.userId,
        email: localPayload.email,
        name: localPayload.name,
      }
      return
    }

    // Try MSAL JWT if configured
    if (MSAL_ENABLED) {
      try {
        const { payload } = await jwtVerify(token, getJwks(), {
          audience: process.env.MSAL_CLIENT_ID,
        })

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
        return
      } catch {
        request.log.warn('JWT verification failed')
      }
    }

    reply.code(401).send({ error: 'Invalid or expired token' })
  })
}

export const authMiddleware = fp(authMiddlewarePlugin, {
  name: 'auth-middleware',
})
