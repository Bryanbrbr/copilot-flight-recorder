import type { FastifyPluginAsync } from 'fastify'

/**
 * SSE event stream — pushes real-time events to connected clients.
 *
 * In production this would be wired to the DB insert pipeline.
 * For the demo, a server-side simulator generates events every 5 s.
 */

type SSEClient = {
  id: string
  tenantId: string
  send: (event: string, data: unknown) => void
  close: () => void
}

const clients = new Map<string, SSEClient>()

// ─── Event simulator (server-side demo) ─────────────────────────

const agentNames = [
  { id: 'agent-sales-triage', name: 'Sales Triage Copilot' },
  { id: 'agent-hr-onboarding', name: 'HR Onboarding Copilot' },
  { id: 'agent-finance-audit', name: 'Finance Audit Copilot' },
  { id: 'agent-it-helpdesk', name: 'IT Helpdesk Copilot' },
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

function generateEvent() {
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

function ensureSimulator() {
  if (simulatorInterval) return
  simulatorInterval = setInterval(() => {
    if (clients.size === 0) {
      clearInterval(simulatorInterval!)
      simulatorInterval = null
      return
    }
    const event = generateEvent()
    broadcast('event', event)
  }, 5000)
}

function broadcast(eventType: string, data: unknown) {
  for (const client of clients.values()) {
    try { client.send(eventType, data) } catch { /* client gone */ }
  }
}

// Public helper so other routes can push events
export function pushSSE(eventType: string, data: unknown) {
  broadcast(eventType, data)
}

// ─── Route ──────────────────────────────────────────────────────

export const streamRoutes: FastifyPluginAsync = async (app) => {
  app.get('/stream', async (req, reply) => {
    const clientId = `sse-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const tenantId = (req as any).auth?.tenantId ?? 'demo'

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
      },
    }

    clients.set(clientId, client)
    ensureSimulator()

    // Heartbeat every 30s to keep connection alive
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

  // GET /api/stream/clients — admin endpoint
  app.get('/clients', async () => ({
    count: clients.size,
    clients: [...clients.values()].map((c) => ({ id: c.id, tenantId: c.tenantId })),
  }))
}
