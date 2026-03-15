import type { Alert, EventOutcome } from '@/types'

export const severityLabels: Record<Alert['severity'], string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
}

export const severityRank: Record<Alert['severity'], number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
}

export const outcomeLabels: Record<EventOutcome, string> = {
  success: 'Success',
  warning: 'Watch',
  failure: 'Failure',
  blocked: 'Blocked',
}
