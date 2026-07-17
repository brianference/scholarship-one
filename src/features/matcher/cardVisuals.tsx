/**
 * Shared visual bits for scholarship rows/cards: the category icon glyph and the
 * conic match-score ring. Used by both ScholarshipCard and the compact Matches rows.
 */

/** Pick a warm category glyph from an award's tags. */
export function iconForTags(tags: readonly string[]): string {
  const t = tags.join(' ').toLowerCase()
  if (/nurs|health|medic|nbna|aacn/.test(t)) return '🩺'
  if (/stem|engineer|math|science|swe|nsbe|shpe|tech|comput/.test(t)) return '🔬'
  if (/business|market|account|finance|mba|deloitte/.test(t)) return '📈'
  if (/sport|athlet|ncaa|track/.test(t)) return '🏅'
  if (/disab|accessib|lime|krause/.test(t)) return '♿'
  if (/women|latina|female|aauw/.test(t)) return '🌸'
  if (/state|regional|grant|cal|texas|florida|excelsior/.test(t)) return '📍'
  if (/art|design|music|creative/.test(t)) return '🎨'
  return '🎓'
}

/** Circular match-score indicator (conic ring). */
export function MatchRing({ score, size }: { score: number; size?: 'sm' | 'md' }) {
  const pct = Math.min(100, Math.max(0, Math.round(score)))
  return (
    <div
      className={`match-ring${size === 'sm' ? ' match-ring--sm' : ''}`}
      style={{ ['--p' as string]: `${pct}%` }}
      role="img"
      aria-label={`Match score ${pct} of 100`}
    >
      <i>{pct}</i>
    </div>
  )
}
