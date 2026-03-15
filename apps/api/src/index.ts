import Fastify from 'fastify'
import cors from '@fastify/cors'
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
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'

const PORT = Number(process.env.PORT ?? 3001)
const HOST = process.env.HOST ?? '0.0.0.0'
const __dirname = dirname(fileURLToPath(import.meta.url))

async function main() {
  const app = Fastify({ logger: true })

  await app.register(cors, { origin: true })

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
