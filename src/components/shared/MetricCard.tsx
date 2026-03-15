type MetricCardProps = {
  label: string
  value: string | number
  helper: string
}

export function MetricCard({ label, value, helper }: MetricCardProps) {
  return (
    <article className="metric-card">
      <span className="metric-label">{label}</span>
      <strong className="metric-value">{value}</strong>
      <span className="metric-helper">{helper}</span>
    </article>
  )
}
