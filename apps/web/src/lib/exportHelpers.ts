import type { WorkspaceState, Alert, AgentEvent } from '@/types'

export function exportWorkspaceJSON(state: WorkspaceState): string {
  return JSON.stringify(state, null, 2)
}

export function exportAlertsCSV(alerts: Alert[]): string {
  const headers = ['ID', 'Agent ID', 'Title', 'Severity', 'Status', 'Created At', 'Policy ID', 'Description']
  const rows = alerts.map((alert) => [
    alert.id,
    alert.agentId,
    `"${alert.title}"`,
    alert.severity,
    alert.status,
    alert.createdAt,
    alert.policyId ?? '',
    `"${alert.description}"`,
  ])
  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')
}

export function exportEventsCSV(events: AgentEvent[]): string {
  const headers = ['ID', 'Agent ID', 'Timestamp', 'Type', 'Title', 'Outcome', 'Risk Score', 'Actor', 'Target']
  const rows = events.map((event) => [
    event.id,
    event.agentId,
    event.timestamp,
    event.type,
    `"${event.title}"`,
    event.outcome,
    event.riskScore,
    event.actor,
    event.target ?? '',
  ])
  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')
}

export function downloadFile(content: string, filename: string, mimeType = 'text/plain'): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
