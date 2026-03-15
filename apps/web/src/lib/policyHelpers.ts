import type { Alert, Policy } from '@/types'
import type { PolicyRolloutMode } from '@/types'

export function getDefaultPolicyRolloutMode(policy: Policy, alerts: Alert[]): PolicyRolloutMode {
  if (!policy.enabled) return 'draft'
  return alerts.some((alert) => alert.policyId === policy.id && alert.status !== 'resolved') ? 'limited' : 'live'
}

export function getEffectivePolicyRolloutMode(
  policy: Policy | undefined,
  alerts: Alert[],
  rolloutModes: Record<string, PolicyRolloutMode>,
): PolicyRolloutMode {
  if (!policy) return 'draft'
  return rolloutModes[policy.id] ?? getDefaultPolicyRolloutMode(policy, alerts)
}

export function getEffectivePolicyStatusLabel(
  policy: Policy | undefined,
  alerts: Alert[],
  rolloutModes: Record<string, PolicyRolloutMode>,
): string {
  if (!policy) return 'Draft'

  const mode = getEffectivePolicyRolloutMode(policy, alerts, rolloutModes)
  if (mode === 'draft') return 'Draft'
  if (mode === 'limited') return 'Limited publish'

  const openCount = alerts.filter((alert) => alert.policyId === policy.id && alert.status !== 'resolved').length
  return openCount > 0 ? 'Published with active review' : 'Published'
}
