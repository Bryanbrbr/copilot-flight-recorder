import type { FastifyPluginAsync } from 'fastify'
import { eventBus } from '../services/eventBus.js'

/**
 * SSE event stream — pushes real-time events to connected clients.
 *
 * In production: events come from the ingest endpoint via eventBus.
 * In demo mode (tenant-northwind): a server-side simulator generates events.
 */

type SSEClient = {
  id: string
  tenantId: string
  send: (event: string, data: unknown) => void
  close: () => void
}

const clients = new Map<string, SSEClient>()

// ─── Event simulator (demo mode only) ──────────────────────────

const agentNames = [
  { id: 'agt-sales-triage', name: 'Sales Triage Copilot' },
  { id: 'agt-hr-onboard', name: 'HR Onboarding Agent' },
  { id: 'agt-fin-close', name: 'Finance Close Agent' },
  { id: 'agt-graph-sync', name: 'Graph Sync Worker' },
]

const eventTypes = [
  'message.received', 'tool.called', 'data.read', 'data.write',
  'approval.requested', 'response.generated', 'workflow.completed',
] as const

const outcomes = ['success', 'success', 'success', 'warning', 'warning', 'failure', 'blocked'] as const

const titles: Record<string, string[]> = {
  'message.received': ['Inbound message captured', 'User query received', 'Conversation started'],
  'tool.called': ['Connector invoked', 'API call dispatched', 'Tool execution started'],
  'data.read': ['Record loaded', 'Dataset queried', 'Profile accessed'],
  'data.write': ['Record updated', 'Notes saved', 'Status changed'],
  'approval.requested': ['Approval requested', 'Sign-off needed', 'Review escalated'],
  'response.generated': ['Reply drafted', 'Summary generated', 'Report compiled'],
  'workflow.completed': ['Workflow finished', 'Task completed', 'Process ended'],
}

let counter = 2000

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function generateDemoEvent() {
  const agent = pick(agentNames)
  const type = pick(eventTypes)
  const outcome = pick(outcomes)
  const riskScore = outcome === 'blocked' ? 70 + Math.floor(Math.random() * 30)
    : outcome === 'failure' ? 50 + Math.floor(Math.random() * 40)
    : outcome === 'warning' ? 30 + Math.floor(Math.random() * 50)
    : Math.floor(Math.random() * 40)

  counter += 1

  return {
    id: `evt-sse-${counter}`,
    agentId: agent.id,
    agentName: agent.name,
    timestamp: new Date().toISOString(),
    type,
    title: pick(titles[type]),
    summary: `Live event for ${agent.name} at ${new Date().toLocaleTimeString()}.`,
    outcome,
    riskScore,
    actor: agent.name,
    target: 'Copilot Studio',
  }
}

let simulatorInterval: ReturnType<typeof setInterval> | null = null

function ensureDemoSimulator() {
  if (simulatorInterval) return
  const demoClients = () => [...clients.values()].filter(c => c.tenantId === 'tenant-northwind')

  simulatorInterval = setInterval(() => {
    const dc = demoClients()
    if (dc.length === 0) {
      clearInterval(simulatorInterval!)
      simulatorInterval = null
      return
    }
    const event = generateDemoEvent()
    for (const client of dc) {
      try { client.send('event', event) } catch { /* client gone */ }
    }
  }, 5000)
}

// ─── Route ──────────────────────────────────────────────────────

export const streamRoutes: FastifyPluginAsync = async (app) => {
  app.get('/stream', async (req, reply) => {
    const clientId = `sse-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const tenantId = req.auth!.tenantId

    // SSE headers
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    })

    // Send initial connection event
    reply.raw.write(`event: connected\ndata: ${JSON.stringify({ clientId })}\n\n`)

    const client: SSEClient = {
      id: clientId,
      tenantId,
      send: (event, data) => {
        reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
      },
      close: () => {
        clients.delete(clientId)
        unsubscribe()
      },
    }

    clients.set(clientId, client)

    // Subscribe to real events from the ingest pipeline via eventBus
    const unsubscribe = eventBus.subscribe(tenantId, (event) => {
      try { client.send('event', event) } catch { /* client gone */ }
    })

    // For demo tenant, also start the simulator
    if (tenantId === 'tenant-northwind') {
      ensureDemoSimulator()
    }

    // Heartbeat every 30s
    const heartbeat = setInterval(() => {
      try { reply.raw.write(`:heartbeat\n\n`) } catch { clearInterval(heartbeat) }
    }, 30000)

    req.raw.on('close', () => {
      clearInterval(heartbeat)
      client.close()
    })

    // Don't let Fastify close the response
    await new Promise(() => {})
  })

  // GET /api/stream/clients — only show clients from caller's tenant
  app.get('/clients', async (req) => {
    const tenantId = req.auth!.tenantId
    const tenantClients = [...clients.values()].filter(c => c.tenantId === tenantId)
    return {
      count: tenantClients.length,
      clients: tenantClients.map(c => ({ id: c.id })),
    }
  })
}
