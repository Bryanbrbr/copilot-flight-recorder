type LoadingSkeletonProps = {
  lines?: number
  height?: string
}

export function LoadingSkeleton({ lines = 3, height = '1rem' }: LoadingSkeletonProps) {
  return (
    <div className="loading-skeleton" aria-busy="true" aria-label="Loading content">
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className="skeleton-line"
          style={{
            height,
            width: i === lines - 1 ? '60%' : '100%',
            background: 'linear-gradient(90deg, var(--color-bg-muted, #f0f4f9) 25%, var(--color-border-light, #e8eef6) 50%, var(--color-bg-muted, #f0f4f9) 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
            borderRadius: 'var(--radius-sm, 6px)',
            marginBottom: '0.5rem',
          }}
        />
      ))}
    </div>
  )
}
