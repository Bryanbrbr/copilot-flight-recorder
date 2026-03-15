import type { Alert, WorkspaceState } from '@/types'
import type { CaseActivityEntry } from '@/types'

export function buildInitialCaseActivity(workspace: WorkspaceState): Record<string, CaseActivityEntry[]> {
  return Object.fromEntries(
    workspace.alerts.map((alert) => [
      alert.id,
      [
        {
          id: `${alert.id}-opened`,
          alertId: alert.id,
          timestamp: alert.createdAt,
          actor: 'Policy engine',
          action: 'Case opened',
          detail: alert.recommendedAction,
        },
      ],
    ]),
  ) as Record<string, CaseActivityEntry[]>
}

export function getReviewState(alert?: Alert) {
  if (!alert) {
    return {
      label: 'No active case',
      tone: 'low' as const,
      detail: 'No incident is currently attached to the selected workflow.',
      nextStep: 'Continue monitoring',
    }
  }

  if (alert.status === 'resolved') {
    return {
      label: 'Closed',
      tone: 'low' as const,
      detail: 'Containment and review have been completed for the current case.',
      nextStep: 'Document learning',
    }
  }

  if (alert.status === 'acknowledged') {
    return {
      label: 'In review',
      tone: 'medium' as const,
      detail: 'The case is assigned and currently under operator review.',
      nextStep: 'Confirm decision',
    }
  }

  return {
    label: 'Needs review',
    tone: alert.severity === 'critical' ? 'critical' : alert.severity === 'high' ? 'high' : 'medium',
    detail: 'The case is open and still needs triage or owner confirmation.',
    nextStep: 'Assign and contain',
  }
}
