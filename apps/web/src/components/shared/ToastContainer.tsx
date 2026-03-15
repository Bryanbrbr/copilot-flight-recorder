import { useEffect, useState, useCallback } from 'react'

export type Toast = {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

let toastListeners: Array<(toast: Toast) => void> = []

export function showToast(message: string, type: Toast['type'] = 'info') {
  const toast: Toast = { id: `toast-${Date.now()}`, message, type }
  toastListeners.forEach((fn) => fn(toast))
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((toast: Toast) => {
    setToasts((prev) => [...prev, toast])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toast.id))
    }, 4000)
  }, [])

  useEffect(() => {
    toastListeners.push(addToast)
    return () => {
      toastListeners = toastListeners.filter((fn) => fn !== addToast)
    }
  }, [addToast])

  if (toasts.length === 0) return null

  return (
    <div
      className="toast-container"
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        right: '1.5rem',
        zIndex: 'var(--z-toast, 200)' as unknown as number,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
      }}
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast-${toast.type}`}
          style={{
            padding: '0.75rem 1.25rem',
            borderRadius: 'var(--radius-md, 10px)',
            background: toast.type === 'error' ? 'var(--color-severity-critical, #d5536c)' : toast.type === 'success' ? 'var(--color-severity-low, #2fa56d)' : 'var(--color-primary, #1f4fa3)',
            color: '#fff',
            fontSize: '0.88rem',
            fontWeight: 500,
            boxShadow: 'var(--shadow-lg)',
            animation: 'slideIn 0.2s ease',
          }}
          role="status"
        >
          {toast.message}
        </div>
      ))}
    </div>
  )
}
