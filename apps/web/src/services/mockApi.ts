import type { Agent, AgentEvent, Alert, Policy, WorkspaceState } from '@/types'
import type { PolicyRolloutMode } from '@/types'
import type { AlertFilter, WorkspaceApi } from './types'
import { buildWorkspaceState } from '@cfr/shared'
import { agents, events, policies } from '@cfr/shared'

function delay(ms = 200 + Math.random() * 200): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function createMockApi(): WorkspaceApi {
  const workspace = buildWorkspaceState(agents, events, policies)
  const alertStatuses = new Map<string, Alert['status']>()
  const _policyRollouts = new Map<string, PolicyRolloutMode>()

  return {
    async getWorkspace(): Promise<WorkspaceState> {
      await delay()
      return {
        ...workspace,
        alerts: workspace.alerts.map((alert) => ({
          ...alert,
          status: alertStatuses.get(alert.id) ?? alert.status,
        })),
      }
    },

    async getAgent(agentId: string): Promise<Agent | undefined> {
      await delay(100)
      return workspace.agents.find((a) => a.id === agentId)
    },

    async getAgentEvents(agentId: string): Promise<AgentEvent[]> {
      await delay()
      return workspace.events
        .filter((e) => e.agentId === agentId)
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    },

    async getAlerts(filter?: AlertFilter): Promise<Alert[]> {
      await delay()
      let result = workspace.alerts.map((alert) => ({
        ...alert,
        status: alertStatuses.get(alert.id) ?? alert.status,
      }))

      if (filter?.status) result = result.filter((a) => a.status === filter.status)
      if (filter?.severity) result = result.filter((a) => a.severity === filter.severity)
      if (filter?.agentId) result = result.filter((a) => a.agentId === filter.agentId)

      return result
    },

    async updateAlertStatus(alertId: string, status: Alert['status']): Promise<Alert> {
      await delay(150)
      alertStatuses.set(alertId, status)
      const alert = workspace.alerts.find((a) => a.id === alertId)
      if (!alert) throw new Error(`Alert ${alertId} not found`)
      return { ...alert, status }
    },

    async getPolicies(): Promise<Policy[]> {
      await delay(100)
      return workspace.policies
    },

    async updatePolicyRollout(policyId: string, mode: PolicyRolloutMode): Promise<void> {
      await delay(150)
      _policyRollouts.set(policyId, mode)
    },
  }
}
