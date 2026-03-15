import type { Agent, AgentEvent, AgentInsight, Alert, Policy, WorkspaceState } from '@cfr/shared'

const severityRank = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
} as const

function compareSeverity(a: Alert['severity'], b: Alert['severity']) {
  return severityRank[b] - severityRank[a]
}

function buildInsights(agents: Agent[], events: AgentEvent[]): AgentInsight[] {
  return agents.map((agent) => {
    const agentEvents = events.filter((event) => event.agentId === agent.id)
    const riskyEvents = agentEvents.filter((event) => event.riskScore >= 70).length
    const blockedActions = agentEvents.filter((event) => event.outcome === 'blocked').length
    const sensitiveReads = agentEvents.filter(
      (event) => event.type === 'data.read' && event.metadata?.sensitivity === 'high',
    ).length
    const approvalBypasses = agentEvents.filter((event) => event.type === 'approval.skipped').length
    const failures = agentEvents.filter((event) => event.outcome === 'failure' || event.outcome === 'blocked').length
    const failureRate = agentEvents.length === 0 ? 0 : failures / agentEvents.length
    const averageRisk =
      agentEvents.length === 0
        ? 0
        : agentEvents.reduce((sum, event) => sum + event.riskScore, 0) / agentEvents.length

    const trustScore = Math.max(
      8,
      Math.round(
        100 - averageRisk * 0.55 - blockedActions * 4 - approvalBypasses * 10 - sensitiveReads * 8 - failures * 3,
      ),
    )

    return {
      agentId: agent.id,
      trustScore,
      riskyEvents,
      blockedActions,
      sensitiveReads,
      approvalBypasses,
      failureRate,
      lastEventAt: agentEvents.at(-1)?.timestamp ?? agent.lastDeployment,
    }
  })
}

function createAlerts(events: AgentEvent[], policies: Policy[]): Alert[] {
  const alerts: Alert[] = []
  const byAgent = new Map<string, AgentEvent[]>()

  for (const event of events) {
    const current = byAgent.get(event.agentId) ?? []
    current.push(event)
    byAgent.set(event.agentId, current)
  }

  for (const [agentId, agentEvents] of byAgent.entries()) {
    const sensitiveBreach = agentEvents.find(
      (event) => event.type === 'data.read' && event.metadata?.sensitivity === 'high' && event.outcome === 'blocked',
    )

    if (sensitiveBreach) {
      alerts.push({
        id: `alt-${agentId}-sensitive-read`,
        agentId,
        title: 'Sensitive access blocked',
        description: 'Agent attempted to access a high-sensitivity record before a valid approval token was present.',
        severity: 'critical',
        status: 'open',
        createdAt: sensitiveBreach.timestamp,
        policyId: policies.find((policy) => policy.id === 'pol-sensitive-read')?.id,
        recommendedAction: 'Review prompt chain and require explicit approval token propagation before retrying.',
      })
    }

    const repeatedToolCalls = agentEvents.filter((event) => event.type === 'tool.called')
    const groupedByTarget = repeatedToolCalls.reduce<Record<string, number>>((accumulator, event) => {
      if (!event.target) {
        return accumulator
      }

      accumulator[event.target] = (accumulator[event.target] ?? 0) + 1
      return accumulator
    }, {})

    for (const [target, count] of Object.entries(groupedByTarget)) {
      if (count >= 3) {
        const triggerEvent = agentEvents.find((event) => event.target === target && event.type === 'tool.called')
        alerts.push({
          id: `alt-${agentId}-${target}-loop`,
          agentId,
          title: 'Repeated tool loop detected',
          description: `The same tool was invoked ${count} times within the recent control window, increasing the chance of runaway execution.`,
          severity: 'high',
          status: 'open',
          createdAt: triggerEvent?.timestamp ?? agentEvents[0].timestamp,
          policyId: policies.find((policy) => policy.id === 'pol-loop-detection')?.id,
          recommendedAction: 'Add cooldown logic, cap retries, and quarantine the workflow if the same connector fails repeatedly.',
        })
      }
    }

    const riskyExternalResponse = agentEvents.find(
      (event) =>
        event.type === 'response.generated' &&
        event.metadata?.audience === 'external' &&
        typeof event.metadata?.confidence === 'number' &&
        Number(event.metadata.confidence) < 0.5,
    )

    if (riskyExternalResponse) {
      alerts.push({
        id: `alt-${agentId}-external-send`,
        agentId,
        title: 'Low-confidence external draft',
        description: 'An external-facing response was generated below the confidence threshold and should remain under human review.',
        severity: 'high',
        status: 'acknowledged',
        createdAt: riskyExternalResponse.timestamp,
        policyId: policies.find((policy) => policy.id === 'pol-external-send')?.id,
        recommendedAction: 'Require human sign-off and tighten routing instructions for pricing conversations.',
      })
    }
  }

  return alerts.sort((left, right) => compareSeverity(left.severity, right.severity))
}

export function buildWorkspaceState(agents: Agent[], events: AgentEvent[], policies: Policy[]): WorkspaceState {
  const orderedEvents = [...events].sort((left, right) => left.timestamp.localeCompare(right.timestamp))
  const insights = buildInsights(agents, orderedEvents).sort((left, right) => left.trustScore - right.trustScore)
  const alerts = createAlerts(orderedEvents, policies)

  return {
    agents,
    events: orderedEvents,
    policies,
    alerts,
    insights,
  }
}

export function formatTimestamp(timestamp: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp))
}

export function computeWorkspaceMetrics(state: WorkspaceState) {
  const openAlerts = state.alerts.filter((alert) => alert.status === 'open').length
  const criticalAlerts = state.alerts.filter((alert) => alert.severity === 'critical').length
  const averageTrust =
    state.insights.length === 0
      ? 0
      : Math.round(state.insights.reduce((sum, insight) => sum + insight.trustScore, 0) / state.insights.length)
  const blockedActions = state.insights.reduce((sum, insight) => sum + insight.blockedActions, 0)
  const highRiskEvents = state.events.filter((event) => event.riskScore >= 70).length

  return {
    totalAgents: state.agents.length,
    openAlerts,
    criticalAlerts,
    averageTrust,
    blockedActions,
    highRiskEvents,
  }
}

export function getAgentEvents(state: WorkspaceState, agentId: string) {
  return state.events.filter((event) => event.agentId === agentId).sort((left, right) => right.timestamp.localeCompare(left.timestamp))
}

export function getAgentAlerts(state: WorkspaceState, agentId: string) {
  return state.alerts.filter((alert) => alert.agentId === agentId)
}

export function getInsight(state: WorkspaceState, agentId: string) {
  return state.insights.find((insight) => insight.agentId === agentId)
}