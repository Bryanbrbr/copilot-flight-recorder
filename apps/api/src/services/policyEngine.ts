import { db } from '@cfr/db'
import { policies, alerts } from '@cfr/db'
import { eq, and } from 'drizzle-orm'
import { randomUUID } from 'crypto'

type IngestedEvent = {
  id: string
  agentId: string
  tenantId: string
  type: string
  title: string
  summary: string
  outcome: string
  riskScore: number
  actor: string
  target?: string
  metadata?: Record<string, unknown>
}

type PolicyMatch = {
  policyId: string
  policyName: string
  severity: string
  action: string
}

/**
 * Evaluate an ingested event against all active policies for the tenant.
 * Returns any alerts that were created.
 */
export function evaluateEvent(event: IngestedEvent): PolicyMatch[] {
  const activePolicies = db.select().from(policies)
    .where(and(eq(policies.tenantId, event.tenantId), eq(policies.enabled, true)))
    .all()

  const matches: PolicyMatch[] = []

  for (const policy of activePolicies) {
    if (matchesPolicy(event, policy)) {
      // Create an alert
      const alertId = `alrt-${randomUUID().slice(0, 8)}`
      const now = new Date().toISOString()

      db.insert(alerts).values({
        id: alertId,
        tenantId: event.tenantId,
        agentId: event.agentId,
        policyId: policy.id,
        title: `Policy violation: ${policy.name}`,
        description: `Event "${event.title}" triggered policy "${policy.name}". ${event.summary}`,
        severity: policy.severity,
        status: 'open',
        createdAt: now,
        recommendedAction: getRecommendedAction(policy),
      }).run()

      matches.push({
        policyId: policy.id,
        policyName: policy.name,
        severity: policy.severity,
        action: policy.action,
      })
    }
  }

  return matches
}

function matchesPolicy(
  event: IngestedEvent,
  policy: { trigger: string; scope: string; severity: string },
): boolean {
  const trigger = policy.trigger.toLowerCase()
  const eventType = event.type.toLowerCase()

  // High risk score events match more aggressively
  if (event.riskScore >= 80) {
    // Critical risk — match policies about blocking or approval
    if (event.outcome === 'blocked' || event.outcome === 'failure') {
      return true
    }
  }

  // Sensitive data access without approval
  if (trigger.includes('sensitive') && trigger.includes('read')) {
    if (eventType === 'data.read' && event.riskScore >= 70) return true
    if (eventType === 'action.blocked') return true
  }

  // Repeated tool calls (loop detection)
  if (trigger.includes('repeated') || trigger.includes('loop')) {
    if (eventType === 'tool.called' && event.outcome === 'warning') return true
    if (eventType === 'tool.failed') return true
  }

  // External send with low confidence
  if (trigger.includes('external') && trigger.includes('confidence')) {
    if (eventType === 'response.generated' && event.outcome === 'warning') return true
    const confidence = event.metadata?.confidence as number | undefined
    if (confidence !== undefined && confidence < 0.6 && eventType === 'response.generated') return true
  }

  // Bulk write protection
  if (trigger.includes('bulk') && trigger.includes('write')) {
    if (eventType === 'data.write') {
      const records = event.metadata?.records as number | undefined
      if (records !== undefined && records > 25) return true
    }
  }

  // Approval skipped
  if (trigger.includes('approval')) {
    if (eventType === 'approval.skipped') return true
  }

  return false
}

function getRecommendedAction(policy: { action: string; name: string }): string {
  switch (policy.action) {
    case 'Block':
      return `The event was blocked by policy "${policy.name}". Review the blocked action, verify the agent configuration, and decide whether to adjust the policy or keep the block in place.`
    case 'Alert':
      return `Review the flagged activity against policy "${policy.name}". Investigate the root cause and determine if corrective action is needed.`
    case 'Require approval':
      return `An approval was required by policy "${policy.name}" but was not provided. Review the pending action and either approve or reject it.`
    case 'Quarantine':
      return `The agent's action was quarantined by policy "${policy.name}". Review the quarantined data and decide whether to release or delete it.`
    default:
      return `Review the event against policy "${policy.name}" and take appropriate action.`
  }
}
