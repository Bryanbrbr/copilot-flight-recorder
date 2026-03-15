import { describe, it, expect, beforeEach } from 'vitest'
import { useWorkspaceStore } from '../hooks/useWorkspaceStore'

describe('useWorkspaceStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useWorkspaceStore.setState({
      activeView: 'dashboard',
      searchQuery: '',
      alertStatuses: {},
      focusedPolicyId: undefined,
      liveEvents: [],
      sseConnected: false,
    })
  })

  it('initializes with seed data', () => {
    const state = useWorkspaceStore.getState()
    expect(state.workspace.agents.length).toBeGreaterThan(0)
    expect(state.workspace.events.length).toBeGreaterThan(0)
    expect(state.workspace.policies.length).toBeGreaterThan(0)
  })

  it('sets active view', () => {
    useWorkspaceStore.getState().setActiveView('timeline')
    expect(useWorkspaceStore.getState().activeView).toBe('timeline')
  })

  it('sets search query', () => {
    useWorkspaceStore.getState().setSearchQuery('sales')
    expect(useWorkspaceStore.getState().searchQuery).toBe('sales')
  })

  it('returns search results matching agents', () => {
    useWorkspaceStore.getState().setSearchQuery('sales')
    const results = useWorkspaceStore.getState().getSearchResults()
    expect(results.length).toBeGreaterThan(0)
    expect(results.some((r) => r.kind === 'agent')).toBe(true)
  })

  it('returns empty results for empty query', () => {
    useWorkspaceStore.getState().setSearchQuery('')
    const results = useWorkspaceStore.getState().getSearchResults()
    expect(results).toHaveLength(0)
  })

  it('updates alert status optimistically', () => {
    const state = useWorkspaceStore.getState()
    const alertId = state.workspace.alerts[0]?.id
    if (!alertId) return

    state.updateAlertStatus(alertId, 'acknowledged')
    const updated = useWorkspaceStore.getState()
    expect(updated.alertStatuses[alertId]).toBe('acknowledged')
  })

  it('adds live events', () => {
    const state = useWorkspaceStore.getState()
    state.addLiveEvent({
      id: 'test-live-1',
      agentId: 'agt-test',
      timestamp: new Date().toISOString(),
      type: 'test',
      title: 'Test event',
      summary: 'A test live event',
      outcome: 'success',
      riskScore: 10,
      actor: 'Test',
      target: null,
      metadata: null,
    })

    expect(useWorkspaceStore.getState().liveEvents).toHaveLength(1)
    expect(useWorkspaceStore.getState().liveEvents[0].id).toBe('test-live-1')
  })

  it('caps live events at 50', () => {
    const state = useWorkspaceStore.getState()
    for (let i = 0; i < 60; i++) {
      state.addLiveEvent({
        id: `test-${i}`,
        agentId: 'agt-test',
        timestamp: new Date().toISOString(),
        type: 'test',
        title: `Event ${i}`,
        summary: `Test event ${i}`,
        outcome: 'success',
        riskScore: 10,
        actor: 'Test',
        target: null,
        metadata: null,
      })
    }

    expect(useWorkspaceStore.getState().liveEvents.length).toBeLessThanOrEqual(50)
  })

  it('navigates views via openView', () => {
    useWorkspaceStore.getState().openView('alerts')
    expect(useWorkspaceStore.getState().activeView).toBe('alerts')
  })

  it('opens search result and navigates to correct view', () => {
    const state = useWorkspaceStore.getState()
    const agent = state.workspace.agents[0]

    state.openSearchResult({
      kind: 'agent',
      id: agent.id,
      title: agent.name,
      subtitle: 'Agent',
      detail: '',
    })

    const after = useWorkspaceStore.getState()
    expect(after.searchQuery).toBe('')
    expect(after.activeView).toBe('dashboard')
  })
})
