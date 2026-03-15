import type { Agent, AgentEvent, Alert, Policy, WorkspaceState } from '@/types'
import type { PolicyRolloutMode } from '@/types'

export type AlertFilter = {
  status?: Alert['status']
  severity?: Alert['severity']
  agentId?: string
}

export interface WorkspaceApi {
  getWorkspace(): Promise<WorkspaceState>
  getAgent(agentId: string): Promise<Agent | undefined>
  getAgentEvents(agentId: string): Promise<AgentEvent[]>
  getAlerts(filter?: AlertFilter): Promise<Alert[]>
  updateAlertStatus(alertId: string, status: Alert['status']): Promise<Alert>
  getPolicies(): Promise<Policy[]>
  updatePolicyRollout(policyId: string, mode: PolicyRolloutMode): Promise<void>
}
