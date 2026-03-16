import { EventEmitter } from 'events'

/**
 * Simple in-process event bus for broadcasting ingested events
 * to SSE connections scoped by tenant.
 */
class TenantEventBus extends EventEmitter {
  broadcast(tenantId: string, event: Record<string, unknown>) {
    this.emit(`event:${tenantId}`, event)
  }

  subscribe(tenantId: string, handler: (event: Record<string, unknown>) => void) {
    this.on(`event:${tenantId}`, handler)
    return () => { this.off(`event:${tenantId}`, handler) }
  }
}

export const eventBus = new TenantEventBus()
