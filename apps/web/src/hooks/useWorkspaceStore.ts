import { create } from 'zustand'
import type { Alert, WorkspaceState } from '@/types'
import type { CaseActivityEntry, PolicyRolloutMode, ViewId, SearchResult } from '@/types'
import { buildWorkspaceState, computeWorkspaceMetrics } from '@cfr/shared'
import { agents, events, policies } from '@cfr/shared'
import { buildInitialCaseActivity } from '@/lib/caseHelpers'
import { severityRank, severityLabels } from '@/constants/labels'

const workspace = buildWorkspaceState(agents, events, policies)
const metrics = computeWorkspaceMetrics(workspace)

type WorkspaceStore = {
  // Core data (readonly)
  workspace: WorkspaceState
  metrics: ReturnType<typeof computeWorkspaceMetrics>

  // UI state
  selectedAgentId: string
  activeView: ViewId
  searchQuery: string
  selectedAlertId: string
  alertStatuses: Record<string, Alert['status']>
  caseActivity: Record<string, CaseActivityEntry[]>
  policyRolloutModes: Record<string, PolicyRolloutMode>
  focusedPolicyId: string | undefined

  // Derived state (computed getters)
  getSelectedAgent: () => typeof workspace.agents[0]
  getLiveAlerts: () => Alert[]
  getSearchResults: () => SearchResult[]

  // Actions
  setSelectedAgentId: (agentId: string) => void
  setActiveView: (view: ViewId) => void
  setSearchQuery: (query: string) => void
  setSelectedAlertId: (alertId: string) => void
  setFocusedPolicyId: (policyId: string | undefined) => void

  updateAlertStatus: (alertId: string, status: Alert['status']) => void
  setPolicyRollout: (policyId: string, mode: PolicyRolloutMode) => void

  openView: (view: ViewId) => void
  openSearchResult: (result: SearchResult) => void
  handleSelectAgent: (agentId: string, openIncident?: boolean) => void
}

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  workspace,
  metrics,

  selectedAgentId: workspace.agents[0].id,
  activeView: 'dashboard',
  searchQuery: '',
  selectedAlertId: workspace.alerts[0]?.id ?? '',
  alertStatuses: {},
  caseActivity: buildInitialCaseActivity(workspace),
  policyRolloutModes: {},
  focusedPolicyId: undefined,

  getSelectedAgent: () => {
    const state = get()
    return state.workspace.agents.find((a) => a.id === state.selectedAgentId) ?? state.workspace.agents[0]
  },

  getLiveAlerts: () => {
    const state = get()
    return state.workspace.alerts.map((alert) => ({
      ...alert,
      status: state.alertStatuses[alert.id] ?? alert.status,
    }))
  },

  getSearchResults: () => {
    const state = get()
    const trimmed = state.searchQuery.trim().toLowerCase()
    if (!trimmed) return []

    const liveAlerts = state.getLiveAlerts()
    return [
      ...state.workspace.agents
        .filter((agent) =>
          `${agent.name} ${agent.owner} ${agent.environment} ${agent.businessPurpose}`.toLowerCase().includes(trimmed),
        )
        .map((agent) => ({
          kind: 'agent' as const,
          id: agent.id,
          title: agent.name,
          subtitle: 'Agent',
          detail: `${agent.owner} / ${agent.environment}`,
        })),
      ...liveAlerts
        .filter((alert) =>
          `${alert.title} ${alert.description} ${severityLabels[alert.severity]} ${alert.status}`.toLowerCase().includes(trimmed),
        )
        .map((alert) => ({
          kind: 'alert' as const,
          id: alert.id,
          title: alert.title,
          subtitle: 'Incident',
          detail: `${severityLabels[alert.severity]} / ${alert.status}`,
        })),
      ...state.workspace.policies
        .filter((policy) =>
          `${policy.name} ${policy.description} ${policy.scope} ${policy.action}`.toLowerCase().includes(trimmed),
        )
        .map((policy) => ({
          kind: 'policy' as const,
          id: policy.id,
          title: policy.name,
          subtitle: 'Policy',
          detail: `${policy.scope} / ${policy.action}`,
        })),
    ].slice(0, 8)
  },

  setSelectedAgentId: (agentId) => set({ selectedAgentId: agentId }),
  setActiveView: (view) => set({ activeView: view }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedAlertId: (alertId) => set({ selectedAlertId: alertId }),
  setFocusedPolicyId: (policyId) => set({ focusedPolicyId: policyId }),

  updateAlertStatus: (alertId, status) => {
    const state = get()
    const liveAlerts = state.getLiveAlerts()
    const targetAlert = liveAlerts.find((a) => a.id === alertId)

    set((prev) => ({
      alertStatuses: { ...prev.alertStatuses, [alertId]: status },
    }))

    if (!targetAlert) return

    const action =
      status === 'acknowledged'
        ? targetAlert.status === 'acknowledged'
          ? 'Returned to open review'
          : 'Case acknowledged'
        : status === 'resolved'
          ? 'Case resolved'
          : 'Case reopened'

    const detail =
      status === 'acknowledged'
        ? 'The case was moved into active operator review with the current policy context attached.'
        : status === 'resolved'
          ? 'The case was closed after containment and review were considered sufficient.'
          : 'The case was moved back into the active queue for another review pass.'

    set((prev) => ({
      caseActivity: {
        ...prev.caseActivity,
        [alertId]: [
          {
            id: `${alertId}-${Date.now()}`,
            alertId,
            timestamp: new Date().toISOString(),
            actor: 'Operator console',
            action,
            detail,
          },
          ...(prev.caseActivity[alertId] ?? []),
        ],
      },
    }))
  },

  setPolicyRollout: (policyId, mode) =>
    set((prev) => ({
      policyRolloutModes: { ...prev.policyRolloutModes, [policyId]: mode },
    })),

  openView: (view) => {
    const state = get()
    const liveAlerts = state.getLiveAlerts()
    const selectedAgent = state.getSelectedAgent()
    const selectedAgentAlerts = liveAlerts.filter((a) => a.agentId === selectedAgent.id)
    const linkedIncident =
      selectedAgentAlerts.find((a) => a.id === state.selectedAlertId) ??
      [...selectedAgentAlerts].sort((a, b) => severityRank[b.severity] - severityRank[a.severity])[0]

    const updates: Partial<WorkspaceStore> = { activeView: view }
    if (view !== 'dashboard' && linkedIncident) {
      updates.selectedAlertId = linkedIncident.id
    }
    if (view !== 'governance') {
      updates.focusedPolicyId = undefined
    }
    set(updates)
  },

  openSearchResult: (result) => {
    const state = get()
    const liveAlerts = state.getLiveAlerts()

    set({ searchQuery: '' })

    if (result.kind === 'agent') {
      set({ focusedPolicyId: undefined })
      state.handleSelectAgent(result.id, false)
      set({ activeView: 'dashboard' })
      return
    }

    if (result.kind === 'alert') {
      const alert = liveAlerts.find((a) => a.id === result.id)
      if (alert) {
        set({
          focusedPolicyId: undefined,
          selectedAlertId: alert.id,
          selectedAgentId: alert.agentId,
          activeView: 'timeline',
        })
      }
      return
    }

    const linkedAlert = liveAlerts.find((a) => a.policyId === result.id)
    set({
      focusedPolicyId: result.id,
      ...(linkedAlert
        ? { selectedAlertId: linkedAlert.id, selectedAgentId: linkedAlert.agentId }
        : {}),
      activeView: 'governance',
    })
  },

  handleSelectAgent: (agentId, openIncident = false) => {
    const state = get()
    const liveAlerts = state.getLiveAlerts()
    const agentAlerts = liveAlerts
      .filter((a) => a.agentId === agentId)
      .sort((a, b) => severityRank[b.severity] - severityRank[a.severity])

    const updates: Partial<WorkspaceStore> = { selectedAgentId: agentId }
    if (agentAlerts[0]) {
      updates.selectedAlertId = agentAlerts[0].id
    }
    if (openIncident) {
      updates.activeView = agentAlerts[0] ? 'timeline' : 'dashboard'
    }
    set(updates)
  },
}))
