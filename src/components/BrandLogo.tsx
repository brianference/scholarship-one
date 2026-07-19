/**
 * Wordmark and mark for Scholarship One.
 *
 * Drawn as inline SVG rather than shipped as a file: it is a few hundred bytes,
 * costs no extra request, inherits currentColor so it works in both themes, and
 * stays sharp on any display. An emoji cap renders differently on every platform
 * and cannot be styled at all.
 */

/** The mark on its own — a graduation cap over a rising bar. */
export function BrandMark({ className = 'size-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} role="img" aria-label="Scholarship One" fill="none">
      <defs>
        <linearGradient id="so-mark" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--accent)" />
          <stop offset="1" stopColor="var(--accent-2)" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#so-mark)" />
      {/* Mortarboard */}
      <path d="M16 8.5 25 13l-9 4.5L7 13l9-4.5Z" fill="white" fillOpacity="0.95" />
      {/* Tassel drop */}
      <path d="M22.5 14.4v4.2" stroke="white" strokeOpacity="0.9" strokeWidth="1.6" strokeLinecap="round" />
      {/* Cap body, suggesting an upward step */}
      <path
        d="M10.5 15.4v3.4c0 1.9 2.5 3.4 5.5 3.4s5.5-1.5 5.5-3.4v-3.4"
        stroke="white"
        strokeOpacity="0.9"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** Mark plus wordmark, for the header and footer. */
export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <BrandMark className={compact ? 'size-6' : 'size-7'} />
      <span
        className={`font-extrabold tracking-tight text-[var(--text)] ${compact ? 'text-[15px]' : 'text-base sm:text-lg'}`}
      >
        Scholarship One
      </span>
    </span>
  )
}
