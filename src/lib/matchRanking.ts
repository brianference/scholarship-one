/**
 * Rank “Matches for you” rows: profile score × deadline urgency, demote irrelevant state grants.
 * Never surface low or zero match scores.
 */
import type { Profile } from './profile'
import type { RankedRow } from './catalogQuery'
import { urgency } from './urgency'
import { isBlackPrimary, isHispanicPrimary } from './scoring'

/** Hard floor — never show awards at or below this display match score. */
export const MIN_MATCH_DISPLAY_SCORE = 32

const TOP_N = 12

/**
 * True when the award is identity-locked to a group the student did not select.
 * Multi-tag awards (e.g. DACA + Hispanic) are OK if any dimension matches.
 */
export function identityLockedOut(row: RankedRow, profile: Profile): boolean {
  const id = profile.identity || 'any'
  const tags = row.tags.map((t) => t.toLowerCase())
  const black = isBlackPrimary(row.tags)
  const hispanic = isHispanicPrimary(row.tags)
  const lgbtq = tags.includes('lgbtq')
  const disability = tags.some((t) => ['disability', 'disabled', 'accessibility', 'blind', 'deaf'].includes(t))
  const undoc = tags.some((t) => ['undocumented', 'daca', 'immigrant'].includes(t))
  const military = tags.some((t) => ['military', 'veteran', 'spouse'].includes(t))
  const asian = tags.includes('asian') || tags.includes('pacific-islander')
  const native = tags.includes('native')
  const locked = black || hispanic || lgbtq || disability || undoc || military || asian || native
  if (!locked) return false
  if (id === 'any') return true
  if (id === 'black' && black) return false
  if (id === 'hispanic' && hispanic) return false
  if (id === 'lgbtq' && lgbtq) return false
  if (id === 'disability' && disability) return false
  if (id === 'undocumented' && undoc) return false
  if (id === 'military' && military) return false
  if (id === 'asian' && asian) return false
  if (id === 'native' && native) return false
  // women / first-gen do not unlock race/identity-locked awards
  return true
}

/**
 * Composite sort key: higher is better.
 */
export function matchRankScore(row: RankedRow, profile: Profile): number {
  let score = row.score
  const tags = row.tags.map((t) => t.toLowerCase())
  const stateOpen = !profile.state || profile.state === 'any'

  if (stateOpen && tags.some((t) => t === 'state')) {
    score -= 18
  } else if (!stateOpen && profile.state !== 'any') {
    const st = profile.state.toLowerCase()
    if (tags.includes(st)) score += 8
    else if (tags.some((t) => t === 'state') && !tags.includes(st)) score -= 22
  }

  const urg = urgency(row.deadline)
  if (urg.kind === 'fixed' && urg.daysLeft != null && urg.daysLeft >= 0) {
    if (urg.daysLeft <= 14) score += 16
    else if (urg.daysLeft <= 45) score += 10
    else if (urg.daysLeft <= 90) score += 4
  }

  if (row.pinned) score += 6

  if (profile.major && profile.major !== 'any') {
    const m = profile.major.toLowerCase()
    if (tags.some((t) => t === m || t.includes(m) || m.includes(t))) score += 10
    // Marketing-only should not rank for accounting even if pinned historically
    if (m === 'accounting' && tags.includes('marketing') && !tags.includes('accounting')) {
      score -= 35
    }
  }

  return score
}

/**
 * Build the Matches page list (top N) from full ranked catalog rows.
 * Drops low scores, identity mismatches, and never falls back to zero-score junk.
 */
export function selectTopMatches(ranked: RankedRow[], profile: Profile, limit = TOP_N): RankedRow[] {
  const eligible = ranked.filter((row) => {
    if (row.score < MIN_MATCH_DISPLAY_SCORE) return false
    if (identityLockedOut(row, profile)) return false
    // Hide senior-entry noise if still scoring somehow
    if (
      profile.level &&
      profile.level !== 'high-school' &&
      profile.level !== 'any' &&
      row.scorePenalties?.some((p) => /high school/i.test(p.label))
    ) {
      return false
    }
    return true
  })

  const scored = eligible
    .map((row) => ({ row, key: matchRankScore(row, profile) }))
    .filter((x) => x.key >= MIN_MATCH_DISPLAY_SCORE)
    .sort((a, b) => {
      // Primary: the displayed match score, high to low (e.g. 90 then 78).
      if (b.row.score !== a.row.score) return b.row.score - a.row.score
      // Ties: composite relevance (urgency / major / state), then suggested pins.
      if (b.key !== a.key) return b.key - a.key
      return a.row.pinned === b.row.pinned ? 0 : a.row.pinned ? -1 : 1
    })

  const out: RankedRow[] = []
  const seen = new Set<string>()
  for (const { row } of scored) {
    if (seen.has(row.id)) continue
    seen.add(row.id)
    out.push(row)
    if (out.length >= limit) break
  }

  return out
}
