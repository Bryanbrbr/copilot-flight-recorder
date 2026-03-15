import type { Alert } from '@/types'

type SeverityMeterProps = {
  severity: Alert['severity']
}

export function SeverityMeter({ severity }: SeverityMeterProps) {
  const bars = [0, 1, 2, 3]
  const activeCount = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
  }[severity]

  return (
    <div className="severity-meter" aria-hidden="true">
      {bars.map((bar) => (
        <span key={bar} className={`severity-meter-bar ${bar < activeCount ? `active ${severity}` : ''}`} />
      ))}
      <span className="sr-only">{severity} severity</span>
    </div>
  )
}
