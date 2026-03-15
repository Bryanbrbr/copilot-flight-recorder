import { useEffect, useRef } from 'react'
import { useWorkspaceStore } from './useWorkspaceStore'

export function useKeyboardShortcuts() {
  const openView = useWorkspaceStore((s) => s.openView)
  const setSearchQuery = useWorkspaceStore((s) => s.setSearchQuery)
  const pendingRef = useRef<string | null>(null)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

      if (isInput) return

      // "g" prefix for navigation
      if (event.key === 'g' && !pendingRef.current) {
        pendingRef.current = 'g'
        setTimeout(() => { pendingRef.current = null }, 500)
        return
      }

      if (pendingRef.current === 'g') {
        pendingRef.current = null
        switch (event.key) {
          case 'd': openView('dashboard'); event.preventDefault(); return
          case 't': openView('timeline'); event.preventDefault(); return
          case 'a': openView('alerts'); event.preventDefault(); return
          case 'p': openView('governance'); event.preventDefault(); return
        }
      }

      // "/" to focus search
      if (event.key === '/') {
        event.preventDefault()
        const searchInput = document.getElementById('workspace-search')
        searchInput?.focus()
        return
      }

      // Esc to clear search
      if (event.key === 'Escape') {
        setSearchQuery('')
        ;(document.activeElement as HTMLElement)?.blur()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [openView, setSearchQuery])
}
