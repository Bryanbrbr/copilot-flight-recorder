export function formatCaseAge(timestamp: string): string {
  const diffMs = Math.max(0, Date.now() - new Date(timestamp).getTime())
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

  if (diffHours < 1) return '<1h'
  if (diffHours < 24) return `${diffHours}h`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d`

  const diffWeeks = Math.floor(diffDays / 7)
  return `${diffWeeks}w`
}
