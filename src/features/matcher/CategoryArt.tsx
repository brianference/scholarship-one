/**
 * Deterministic SVG artwork for a scholarship, derived from its tags and id.
 *
 * Generated rather than sourced: a photograph next to a specific award implies a
 * recipient, an endorsement, or an outcome that we cannot stand behind. This is
 * decorative only, costs no network request, scales to any catalog size, and
 * renders identically every time for a given award.
 */

export type ArtTheme = {
  key: string
  label: string
  /** Two stops for the header wash. */
  from: string
  to: string
  /** Simple line glyph, drawn in the top-right of the header. */
  glyph: 'health' | 'stem' | 'business' | 'sport' | 'access' | 'community' | 'place' | 'arts' | 'general'
}

const THEMES: { test: RegExp; theme: Omit<ArtTheme, 'key'> }[] = [
  { test: /nurs|health|medic|nbna|aacn|dental|pharm/, theme: { label: 'Health and medicine', from: '#2f9e8f', to: '#7ed0b8', glyph: 'health' } },
  { test: /stem|engineer|math|science|swe|nsbe|shpe|tech|comput|robot/, theme: { label: 'STEM', from: '#3d6fd6', to: '#7bb0f0', glyph: 'stem' } },
  { test: /business|market|account|finance|mba|deloitte|entrepre/, theme: { label: 'Business', from: '#7a5cd0', to: '#b79bec', glyph: 'business' } },
  { test: /sport|athlet|ncaa|track/, theme: { label: 'Athletics', from: '#d4762a', to: '#f0b169', glyph: 'sport' } },
  { test: /disab|accessib|lime|krause|deaf|blind/, theme: { label: 'Accessibility', from: '#2d7fa8', to: '#7fc4dd', glyph: 'access' } },
  { test: /women|latina|female|aauw|hispanic|black|african|minority|native|asian|first-gen/, theme: { label: 'Community', from: '#c2497f', to: '#eb96bd', glyph: 'community' } },
  { test: /state|regional|grant|cal|texas|florida|excelsior|map/, theme: { label: 'State and regional', from: '#4a8c52', to: '#9ecb92', glyph: 'place' } },
  { test: /art|design|music|creative|film|writ/, theme: { label: 'Arts and design', from: '#b8543f', to: '#e8a07f', glyph: 'arts' } },
]

const FALLBACK: Omit<ArtTheme, 'key'> = { label: 'Scholarship', from: '#c45c26', to: '#e8a54b', glyph: 'general' }

/** Pick the theme for an award from its tags. First match wins, so order matters. */
export function themeForTags(tags: readonly string[]): ArtTheme {
  const haystack = tags.join(' ').toLowerCase()
  const found = THEMES.find((t) => t.test.test(haystack))
  const theme = found?.theme ?? FALLBACK
  return { ...theme, key: theme.label }
}

/** Stable 0-1 value from an id, so each award's pattern differs but never changes. */
function hashUnit(id: string): number {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 1000) / 1000
}

function Glyph({ kind }: { kind: ArtTheme['glyph'] }) {
  const common = {
    fill: 'none',
    stroke: 'white',
    strokeOpacity: 0.85,
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  switch (kind) {
    case 'health':
      return <path d="M12 5v14M5 12h14" {...common} />
    case 'stem':
      return <path d="M7 5v6a5 5 0 0 0 10 0V5M6 5h4M14 5h4M9 19h6" {...common} />
    case 'business':
      return <path d="M4 19V11M10 19V6M16 19v-5M22 19H3" {...common} />
    case 'sport':
      return (
        <g {...common}>
          <circle cx="12" cy="9" r="5" />
          <path d="M8.5 13.5 7 21l5-2.5L17 21l-1.5-7.5" />
        </g>
      )
    case 'access':
      return (
        <g {...common}>
          <circle cx="12" cy="5" r="2" />
          <path d="M8 9h8M12 9v6h5M9 15a4 4 0 1 0 4 4" />
        </g>
      )
    case 'community':
      return (
        <g {...common}>
          <circle cx="9" cy="8" r="3" />
          <circle cx="17" cy="10" r="2.4" />
          <path d="M3 20a6 6 0 0 1 12 0M15 20a5 5 0 0 1 6-4.6" />
        </g>
      )
    case 'place':
      return (
        <g {...common}>
          <path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z" />
          <circle cx="12" cy="10" r="2.5" />
        </g>
      )
    case 'arts':
      return (
        <g {...common}>
          <circle cx="12" cy="12" r="8" />
          <circle cx="9" cy="10" r="1.2" fill="white" stroke="none" />
          <circle cx="15" cy="10" r="1.2" fill="white" stroke="none" />
          <path d="M12 20a3 3 0 0 0 0-6" />
        </g>
      )
    default:
      return (
        <g {...common}>
          <path d="M12 6 21 10l-9 4-9-4 9-4Z" />
          <path d="M7 12.2V16c0 1.7 2.2 3 5 3s5-1.3 5-3v-3.8" />
        </g>
      )
  }
}

/**
 * Banner artwork for the detail page header.
 * `aria-hidden` throughout: it carries no information the page text does not.
 */
export function CategoryArt({ id, tags, className = '' }: { id: string; tags: readonly string[]; className?: string }) {
  const theme = themeForTags(tags)
  const unit = hashUnit(id)
  const gradientId = `art-${id.replace(/[^a-z0-9]/gi, '')}`
  // Ring placement varies per award so no two headers look identical.
  const cx = 62 + unit * 26
  const cy = 18 + unit * 20

  return (
    <div className={`relative overflow-hidden rounded-[var(--radius)] ${className}`} aria-hidden="true">
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-full w-full">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="100" y2="40" gradientUnits="userSpaceOnUse">
            <stop stopColor={theme.from} />
            <stop offset="1" stopColor={theme.to} />
          </linearGradient>
        </defs>
        <rect width="100" height="40" fill={`url(#${gradientId})`} />
        <circle cx={cx} cy={cy} r="16" fill="white" fillOpacity="0.09" />
        <circle cx={cx} cy={cy} r="24" fill="white" fillOpacity="0.06" />
        <circle cx={cx - 30} cy={40 - cy} r="10" fill="white" fillOpacity="0.05" />
      </svg>
      <div className="absolute inset-y-0 right-4 flex items-center">
        <svg viewBox="0 0 24 24" className="size-10 sm:size-12">
          <Glyph kind={theme.glyph} />
        </svg>
      </div>
    </div>
  )
}

/** Small square mark for cards and list rows. */
export function CategoryBadge({ id, tags, className = 'size-11' }: { id: string; tags: readonly string[]; className?: string }) {
  const theme = themeForTags(tags)
  const gradientId = `badge-${id.replace(/[^a-z0-9]/gi, '')}`
  return (
    <span className={`inline-grid shrink-0 place-items-center rounded-[var(--radius-sm)] ${className}`} role="img" aria-label={theme.label}>
      <svg viewBox="0 0 40 40" className="size-full">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop stopColor={theme.from} />
            <stop offset="1" stopColor={theme.to} />
          </linearGradient>
        </defs>
        <rect width="40" height="40" rx="11" fill={`url(#${gradientId})`} />
        <g transform="translate(8 8) scale(1)">
          <svg viewBox="0 0 24 24" width="24" height="24">
            <Glyph kind={theme.glyph} />
          </svg>
        </g>
      </svg>
    </span>
  )
}
