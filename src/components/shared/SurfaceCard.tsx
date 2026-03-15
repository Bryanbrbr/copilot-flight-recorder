type SurfaceCardProps = {
  name: string
  status: string
  detail: string
}

export function SurfaceCard({ name, status, detail }: SurfaceCardProps) {
  return (
    <article className="surface-card">
      <div className="surface-topline">
        <strong>{name}</strong>
        <span className={`surface-state ${status}`}>{status}</span>
      </div>
      <p>{detail}</p>
    </article>
  )
}
