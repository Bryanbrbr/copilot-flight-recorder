import { useEffect, useRef, useState, useCallback } from 'react'
import { useWorkspaceStore } from '@/hooks/useWorkspaceStore'
import { SSEClient } from '@/services/sseClient'
import { EventSimulator } from '@/services/eventSimulator'

const outcomeColors: Record<string, string> = {
  success: '#22c55e',
  warning: '#eab308',
  failure: '#ef4444',
  blocked: '#dc2626',
}

const outcomeLabels: Record<string, string> = {
  success: 'OK',
  warning: 'Warn',
  failure: 'Fail',
  blocked: 'Blocked',
}

type Toast = {
  id: string
  title: string
  actor: string
  outcome: string
  timestamp: number
}

/**
 * Live event feed — connects to SSE stream (or falls back to local simulator)
 * and displays toast notifications for incoming events.
 */
export function LiveEventFeed() {
  const addLiveEvent = useWorkspaceStore((s) => s.addLiveEvent)
  const setSseConnected = useWorkspaceStore((s) => s.setSseConnected)
  const sseConnected = useWorkspaceStore((s) => s.sseConnected)
  const liveEvents = useWorkspaceStore((s) => s.liveEvents)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [showFeed, setShowFeed] = useState(false)
  const clientRef = useRef<SSEClient | null>(null)
  const simRef = useRef<EventSimulator | null>(null)

  const handleEvent = useCallback((event: any) => {
    addLiveEvent(event)
    // Add toast
    setToasts((prev) => [
      { id: event.id, title: event.title, actor: event.actor, outcome: event.outcome, timestamp: Date.now() },
      ...prev,
    ].slice(0, 5))
  }, [addLiveEvent])

  // Auto-remove toasts after 4s
  useEffect(() => {
    if (toasts.length === 0) return
    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => Date.now() - t.timestamp < 4000))
    }, 4100)
    return () => clearTimeout(timer)
  }, [toasts])

  // Connect to SSE or fall back to local simulator
  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL
    if (apiUrl) {
      const client = new SSEClient(`${apiUrl}/api/stream/stream`, {
        onEvent: handleEvent,
        onConnect: () => setSseConnected(true),
        onDisconnect: () => setSseConnected(false),
      })
      client.connect()
      clientRef.current = client
      return () => client.disconnect()
    }

    // Fallback: local simulator
    const sim = new EventSimulator({
      intervalMs: 6000,
      onEvent: handleEvent,
    })
    sim.start()
    simRef.current = sim
    setSseConnected(true) // Simulated connection
    return () => sim.stop()
  }, [handleEvent, setSseConnected])

  return (
    <>
      {/* Toast notifications */}
      <div className="live-toast-container" aria-live="polite">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="live-toast"
            style={{ borderLeftColor: outcomeColors[toast.outcome] ?? '#94a3b8' }}
          >
            <div className="live-toast-header">
              <span
                className="live-toast-dot"
                style={{ background: outcomeColors[toast.outcome] ?? '#94a3b8' }}
              />
              <span className="live-toast-outcome">{outcomeLabels[toast.outcome] ?? toast.outcome}</span>
              <span className="live-toast-actor">{toast.actor}</span>
            </div>
            <p className="live-toast-title">{toast.title}</p>
          </div>
        ))}
      </div>

      {/* Connection indicator + feed toggle */}
      <button
        type="button"
        className={`live-indicator ${sseConnected ? 'connected' : 'disconnected'}`}
        onClick={() => setShowFeed(!showFeed)}
        title={sseConnected ? 'Live event stream connected' : 'Event stream disconnected'}
      >
        <span className="live-indicator-dot" />
        <span>Live</span>
        <span className="live-indicator-count">{liveEvents.length}</span>
      </button>

      {/* Expandable event feed */}
      {showFeed && (
        <div className="live-feed-panel">
          <div className="live-feed-header">
            <strong>Live event feed</strong>
            <button type="button" className="live-feed-close" onClick={() => setShowFeed(false)}>
              &times;
            </button>
          </div>
          <div className="live-feed-list">
            {liveEvents.length === 0 ? (
              <p className="live-feed-empty">Waiting for events...</p>
            ) : (
              liveEvents.slice(0, 20).map((event) => (
                <div key={event.id} className="live-feed-item">
                  <span
                    className="live-feed-dot"
                    style={{ background: outcomeColors[event.outcome] ?? '#94a3b8' }}
                  />
                  <div className="live-feed-item-body">
                    <strong>{event.title}</strong>
                    <span>{event.actor} &middot; {new Date(event.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  )
}
