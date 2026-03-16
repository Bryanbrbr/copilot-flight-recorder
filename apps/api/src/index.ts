import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import cookie from '@fastify/cookie'
import csrf from '@fastify/csrf-protection'
import fastifyStatic from '@fastify/static'
import { connectDb } from '@cfr/db'
import { authMiddleware } from './middleware/auth'
import { agentRoutes } from './routes/agents'
import { alertRoutes } from './routes/alerts'
import { policyRoutes } from './routes/policies'
import { eventRoutes } from './routes/events'
import { workspaceRoutes } from './routes/workspace'
import { auditRoutes } from './routes/audit'
import { graphSyncRoutes } from './routes/graphSync'
import { notificationRoutes } from './routes/notifications'
import { exportRoutes } from './routes/exports'
import { roleRoutes } from './routes/roles'
import { streamRoutes } from './routes/stream'
import { authRoutes } from './routes/auth'
import { apiKeyRoutes } from './routes/apiKeys'
import { ingestRoutes } from './routes/ingest'
import { billingRoutes } from './routes/billing'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'

const PORT = Number(process.env.PORT ?? 3001)
const HOST = process.env.HOST ?? '0.0.0.0'
const __dirname = dirname(fileURLToPath(import.meta.url))

async function main() {
  const app = Fastify({ logger: true })

  // Security: CORS — restrict to known origins
  const ALLOWED_ORIGINS = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
    : ['http://localhost:5173']
  await app.register(cors, { origin: ALLOWED_ORIGINS, credentials: true })

  // Security: HTTP headers (CSP, HSTS, X-Frame-Options, etc.)
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https://login.microsoftonline.com', 'https://graph.microsoft.com'],
        fontSrc: ["'self'", 'https:', 'data:'],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
  })

  // Security: Rate limiting — prevent brute force & DoS
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  })

  // Security: CSRF protection — prevents cross-site request forgery
  await app.register(cookie)
  await app.register(csrf, {
    cookieOpts: { signed: false, httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production' },
  })

  // Auth middleware (no-op in dev mode without MSAL_CLIENT_ID)
  await app.register(authMiddleware)

  // Connect to database
  await connectDb()

  // Register API routes
  await app.register(agentRoutes, { prefix: '/api/agents' })
  await app.register(alertRoutes, { prefix: '/api/alerts' })
  await app.register(policyRoutes, { prefix: '/api/policies' })
  await app.register(eventRoutes, { prefix: '/api/events' })
  await app.register(workspaceRoutes, { prefix: '/api/workspace' })
  await app.register(auditRoutes, { prefix: '/api/audit' })
  await app.register(graphSyncRoutes, { prefix: '/api/graph' })
  await app.register(notificationRoutes, { prefix: '/api/notifications' })
  await app.register(exportRoutes, { prefix: '/api/export' })
  await app.register(roleRoutes, { prefix: '/api/roles' })
  await app.register(streamRoutes, { prefix: '/api/stream' })
  await app.register(authRoutes, { prefix: '/api/auth' })
  await app.register(apiKeyRoutes, { prefix: '/api/keys' })
  await app.register(ingestRoutes, { prefix: '/api/ingest' })
  await app.register(billingRoutes, { prefix: '/api/billing' })

  // Health check
  app.get('/api/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
  }))

  // Serve frontend SPA in production
  const webDistPath = resolve(__dirname, '../../../apps/web/dist')
  if (process.env.NODE_ENV === 'production' && existsSync(webDistPath)) {
    await app.register(fastifyStatic, {
      root: webDistPath,
      prefix: '/',
      wildcard: false,
    })

    // SPA fallback — serve index.html for non-API routes
    app.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith('/api/')) {
        reply.code(404).send({ error: 'Not found' })
      } else {
        reply.sendFile('index.html')
      }
    })
  }

  await app.listen({ port: PORT, host: HOST })
  console.log(`[api] Listening on http://${HOST}:${PORT}`)
}

main().catch((err) => {
  console.error('[api] Failed to start:', err)
  process.exit(1)
})
