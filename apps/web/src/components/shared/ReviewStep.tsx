type ReviewStepProps = {
  title: string
  detail: string
  status: 'complete' | 'active' | 'waiting'
}

export function ReviewStep({ title, detail, status }: ReviewStepProps) {
  return (
    <div className={`review-step ${status}`}>
      <span className="review-step-dot" aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <p>{detail}</p>
      </div>
    </div>
  )
}
