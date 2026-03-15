import type { AgentEvent } from '@/types'

type SSECallbacks = {
  onEvent: (event: AgentEvent) => void
  onConnect?: () => void
  onDisconnect?: () => void
}

/**
 * Connects to the backend SSE stream for real-time event updates.
 * Falls back to the local EventSimulator when the API is unavailable.
 */
export class SSEClient {
  private eventSource: EventSource | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private callbacks: SSECallbacks
  private url: string
  private reconnectDelay = 3000
  private maxReconnectDelay = 30000

  constructor(url: string, callbacks: SSECallbacks) {
    this.url = url
    this.callbacks = callbacks
  }

  connect(): void {
    if (this.eventSource) return

    try {
      this.eventSource = new EventSource(this.url)

      this.eventSource.addEventListener('connected', () => {
        this.reconnectDelay = 3000 // Reset on successful connect
        this.callbacks.onConnect?.()
      })

      this.eventSource.addEventListener('event', (e) => {
        try {
          const event = JSON.parse(e.data) as AgentEvent
          this.callbacks.onEvent(event)
        } catch {
          console.warn('[sse] Failed to parse event:', e.data)
        }
      })

      this.eventSource.onerror = () => {
        this.disconnect()
        this.scheduleReconnect()
      }
    } catch {
      this.scheduleReconnect()
    }
  }

  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
      this.callbacks.onDisconnect?.()
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  get isConnected(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, this.reconnectDelay)
    // Exponential backoff
    this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, this.maxReconnectDelay)
  }
}
