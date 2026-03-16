import { useEffect, useRef } from 'react'
import { useWorkspaceStore } from './useWorkspaceStore'
import type { ViewId } from '@/types'

/**
 * Global keyboard shortcuts for the admin dashboard.
 *
 * Navigation (vim-style chord: g then letter):
 *   g d — Dashboard overview
 *   g t — Timeline / incident view
 *   g a — Alert queue
 *   g p — Policy governance
 *   g s — Settings
 *
 * Quick access:
 *   / or Ctrl+K  — Focus search
 *   Escape       — Clear search / blur input
 *   ?            — Toggle keyboard shortcuts help
 *
 * Actions:
 *   Ctrl+Shift+A — Acknowledge selected alert
 *   Ctrl+Shift+R — Resolve selected alert
 */
export function useKeyboardShortcuts(callbacks?: { onToggleHelp?: () => void }) {
  const openView = useWorkspaceStore((s) => s.openView)
  const setSearchQuery = useWorkspaceStore((s) => s.setSearchQuery)
  const pendingRef = useRef<string | null>(null)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

      // Ctrl/Cmd + K → focus search (works everywhere)
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault()
        const searchInput = document.getElementById('workspace-search')
        if (searchInput) {
          searchInput.focus()
          ;(searchInput as HTMLInputElement).select()
        }
        return
      }

      // Ctrl/Cmd + Shift + A → acknowledge alert
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'A') {
        event.preventDefault()
        const state = useWorkspaceStore.getState()
        if (state.selectedAlertId) {
          state.updateAlertStatus(state.selectedAlertId, 'acknowledged')
        }
        return
      }

      // Ctrl/Cmd + Shift + R → resolve alert
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'R') {
        event.preventDefault()
        const state = useWorkspaceStore.getState()
        if (state.selectedAlertId) {
          state.updateAlertStatus(state.selectedAlertId, 'resolved')
        }
        return
      }

      // Don't process other shortcuts when typing in an input
      if (isInput) {
        // Escape → blur and clear search
        if (event.key === 'Escape') {
          ;(target as HTMLElement).blur()
          setSearchQuery('')
        }
        return
      }

      // ? → toggle keyboard shortcuts help
      if (event.key === '?' && callbacks?.onToggleHelp) {
        event.preventDefault()
        callbacks.onToggleHelp()
        return
      }

      // "g" prefix for vim-style navigation
      if (event.key === 'g' && !pendingRef.current) {
        pendingRef.current = 'g'
        setTimeout(() => { pendingRef.current = null }, 600)
        return
      }

      if (pendingRef.current === 'g') {
        pendingRef.current = null
        const navMap: Record<string, ViewId> = {
          d: 'dashboard',
          t: 'timeline',
          a: 'alerts',
          p: 'governance',
          s: 'settings',
        }
        if (navMap[event.key]) {
          event.preventDefault()
          openView(navMap[event.key])
          return
        }
      }

      // "/" to focus search
      if (event.key === '/') {
        event.preventDefault()
        const searchInput = document.getElementById('workspace-search')
        searchInput?.focus()
        return
      }

      // Escape outside input → clear search
      if (event.key === 'Escape') {
        setSearchQuery('')
        ;(document.activeElement as HTMLElement)?.blur()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [openView, setSearchQuery, callbacks])
}

/** Shortcut definitions for the help modal */
export const shortcutGroups = [
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['g', 'd'], description: 'Go to Dashboard' },
      { keys: ['g', 't'], description: 'Go to Timeline' },
      { keys: ['g', 'a'], description: 'Go to Alert queue' },
      { keys: ['g', 'p'], description: 'Go to Policies' },
      { keys: ['g', 's'], description: 'Go to Settings' },
    ],
  },
  {
    title: 'Search',
    shortcuts: [
      { keys: ['/'], description: 'Focus search bar' },
      { keys: ['Ctrl', 'K'], description: 'Focus search (anywhere)' },
      { keys: ['Esc'], description: 'Clear search / blur' },
    ],
  },
  {
    title: 'Actions',
    shortcuts: [
      { keys: ['Ctrl', 'Shift', 'A'], description: 'Acknowledge alert' },
      { keys: ['Ctrl', 'Shift', 'R'], description: 'Resolve alert' },
    ],
  },
  {
    title: 'Help',
    shortcuts: [
      { keys: ['?'], description: 'Toggle this panel' },
    ],
  },
]
