/** Loading placeholders. Shape mirrors the real content so nothing jumps on swap. */

const SHIMMER =
  'relative overflow-hidden bg-[var(--border-strong)]/45 ' +
  'after:absolute after:inset-0 after:-translate-x-full after:animate-[shimmer_1.4s_infinite] ' +
  'after:bg-gradient-to-r after:from-transparent after:via-white/25 after:to-transparent ' +
  'motion-reduce:after:hidden'

export function Skeleton({
  className = '',
  'aria-label': ariaLabel,
}: {
  className?: string
  'aria-label'?: string
}) {
  return (
    <div
      className={`${SHIMMER} rounded-[var(--radius-sm)] ${className}`}
      // Labelled skeletons announce what is loading; unlabelled ones are
      // decorative and stay out of the accessibility tree entirely.
      {...(ariaLabel ? { role: 'status', 'aria-label': ariaLabel } : { 'aria-hidden': true })}
    />
  )
}

/** A few lines of fake text. The last line is short, the way real text wraps. */
export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={`h-3.5 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  )
}

/** Stand-in for a scholarship card while results load. */
export function SkeletonCard() {
  return (
    <div className="surface flex flex-col gap-3 p-4" aria-hidden="true">
      <div className="flex items-center gap-3">
        <Skeleton className="size-11 shrink-0 rounded-full" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-3/5" />
          <Skeleton className="h-3 w-2/5" />
        </div>
      </div>
      <SkeletonText lines={2} />
    </div>
  )
}

/**
 * Announces loading to assistive tech once, instead of every skeleton shouting.
 * Wrap a skeleton group in this.
 */
export function LoadingRegion({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  )
}
