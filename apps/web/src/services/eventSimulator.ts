import type { AgentEvent, EventOutcome } from '@/types'
import { agents } from '@cfr/shared'

const eventTypes: AgentEvent['type'][] = [
  'message.received',
  'tool.called',
  'data.read',
  'data.write',
  'approval.requested',
  'approval.granted',
  'response.generated',
  'workflow.completed',
]

const outcomes: EventOutcome[] = ['success', 'success', 'success', 'warning', 'warning', 'failure', 'blocked']

const titles: Record<AgentEvent['type'], string[]> = {
  'message.received': ['Inbound message captured', 'User query received', 'Conversation started'],
  'tool.called': ['Connector invoked', 'API call dispatched', 'Tool execution started'],
  'tool.failed': ['Tool timeout', 'Connector error', 'API failure'],
  'data.read': ['Record loaded', 'Dataset queried', 'Profile accessed'],
  'data.write': ['Record updated', 'Notes saved', 'Status changed'],
  'approval.requested': ['Approval requested', 'Sign-off needed', 'Review escalated'],
  'approval.granted': ['Approval confirmed', 'Sign-off received'],
  'approval.skipped': ['Approval bypassed', 'Token missing'],
  'action.blocked': ['Action stopped', 'Policy intervention'],
  'response.generated': ['Reply drafted', 'Summary generated', 'Report compiled'],
  'workflow.completed': ['Workflow finished', 'Task completed', 'Process ended'],
}

let counter = 1000

function randomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

function generateEvent(): AgentEvent {
  const agent = randomItem(agents)
  const type = randomItem(eventTypes)
  const outcome = randomItem(outcomes)
  const riskScore = outcome === 'blocked' ? 70 + Math.floor(Math.random() * 30)
    : outcome === 'failure' ? 50 + Math.floor(Math.random() * 40)
    : outcome === 'warning' ? 30 + Math.floor(Math.random() * 50)
    : Math.floor(Math.random() * 40)

  counter += 1

  return {
    id: `evt-sim-${counter}`,
    agentId: agent.id,
    timestamp: new Date().toISOString(),
    type,
    title: randomItem(titles[type]),
    summary: `Simulated event for ${agent.name} at ${new Date().toLocaleTimeString()}.`,
    outcome,
    riskScore,
    actor: agent.name,
    target: agent.environment,
  }
}

export type EventSimulatorOptions = {
  intervalMs?: number
  onEvent: (event: AgentEvent) => void
}

export class EventSimulator {
  private intervalId: ReturnType<typeof setInterval> | null = null
  private options: Required<EventSimulatorOptions>

  constructor(options: EventSimulatorOptions) {
    this.options = {
      intervalMs: options.intervalMs ?? 5000,
      onEvent: options.onEvent,
    }
  }

  start(): void {
    if (this.intervalId) return
    this.intervalId = setInterval(() => {
      this.options.onEvent(generateEvent())
    }, this.options.intervalMs)
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  get isRunning(): boolean {
    return this.intervalId !== null
  }
}
