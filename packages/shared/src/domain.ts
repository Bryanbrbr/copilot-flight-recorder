export type AgentStatus = 'healthy' | 'watch' | 'critical'
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical'
export type EventOutcome = 'success' | 'warning' | 'failure' | 'blocked'

export type Agent = {
  id: string
  name: string
  owner: string
  environment: 'Teams' | 'Copilot Studio' | 'Power Platform' | 'Graph Worker'
  businessPurpose: string
  autonomyLevel: 'assisted' | 'semi-autonomous' | 'autonomous'
  lastDeployment: string
  status: AgentStatus
  events24h: number
  openIncidents: number
}

export type AgentEvent = {
  id: string
  agentId: string
  timestamp: string
  type:
    | 'message.received'
    | 'tool.called'
    | 'tool.failed'
    | 'data.read'
    | 'data.write'
    | 'approval.requested'
    | 'approval.granted'
    | 'approval.skipped'
    | 'action.blocked'
    | 'response.generated'
    | 'workflow.completed'
  title: string
  summary: string
  outcome: EventOutcome
  riskScore: number
  actor: string
  target?: string
  metadata?: Record<string, string | number>
}

export type Policy = {
  id: string
  name: string
  description: string
  enabled: boolean
  severity: AlertSeverity
  scope: 'Global' | 'Finance' | 'HR' | 'Sales' | 'Support'
  trigger: string
  action: 'Alert' | 'Require approval' | 'Block' | 'Quarantine'
}

export type Alert = {
  id: string
  agentId: string
  title: string
  description: string
  severity: AlertSeverity
  status: 'open' | 'acknowledged' | 'resolved'
  createdAt: string
  policyId?: string
  recommendedAction: string
}

export type AgentInsight = {
  agentId: string
  trustScore: number
  riskyEvents: number
  blockedActions: number
  sensitiveReads: number
  approvalBypasses: number
  failureRate: number
  lastEventAt: string
}

export type WorkspaceState = {
  agents: Agent[]
  events: AgentEvent[]
  policies: Policy[]
  alerts: Alert[]
  insights: AgentInsight[]
}