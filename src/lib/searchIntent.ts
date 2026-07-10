import { applyChipToProfile } from './applyChipToProfile'
import type { Profile } from './profile'
import { BROWSE_CATEGORIES } from './categories'

export type SearchIntent = {
  /** Profile after applying free-text signals */
  profile: Profile
  /** Browse category to focus the list */
  categoryId: string
  /** Keywords useful for list text search (short) */
  listQuery: string
  /** Human summary of what we understood */
  summary: string
}

/**
 * Turn free-text search into profile + category + list focus.
 * Shared by hero search, chat chips, and list filters.
 */
export function parseSearchIntent(raw: string, current: Profile): SearchIntent {
  const text = raw.trim()
  const lower = text.toLowerCase()
  const profile = applyChipToProfile(current, text)

  let categoryId = 'all'
  const categoryHints: { id: string; re: RegExp }[] = [
    { id: 'disability', re: /\b(handicap|handicapped|disabilit|disabled|accessibility|ada\b|blind|deaf|iep|504)\b/ },
    { id: 'nursing', re: /\b(nurs(e|ing)?|rn\b|bsn|msn|healthcare)\b/ },
    { id: 'stem', re: /\b(stem|engineer|engineering|computer|coding|software|math|mathematics|science|physics|chemistry|biology)\b/ },
    { id: 'sports', re: /\b(sport|sports|athletic|athlete|ncaa|track|soccer|basketball|softball|volleyball|swimming|tennis)\b/ },
    { id: 'black', re: /\b(black|african[-\s]?american)\b/ },
    { id: 'hispanic', re: /\b(hispanic|latino|latina|mexican|chican[ao])\b/ },
    { id: 'women', re: /\b(woman|women|female|girl|ladies)\b/ },
    { id: 'need', re: /\b(need[-\s]?based|pell|fafsa|low[-\s]?income|financial aid)\b/ },
    { id: 'high-school', re: /\b(high[-\s]?school|12th|graduating senior)\b/ },
    { id: 'business', re: /\b(business|market(ing)?|account(ing)?|mba)\b/ },
    { id: 'first-gen', re: /\b(first[-\s]?gen|first generation)\b/ },
    { id: 'state', re: /\b(state grant|cal grant|bright futures|excelsior|hope scholarship|massgrant|regional)\b/ },
  ]

  for (const hint of categoryHints) {
    if (hint.re.test(lower)) {
      categoryId = hint.id
      break
    }
  }

  // Multi-signal: disability + STEM prefers disability (listed first above is correct)
  // disability + sports still disability first; sports is secondary in ranking

  const bits: string[] = []
  if (categoryId !== 'all') {
    bits.push(BROWSE_CATEGORIES.find((c) => c.id === categoryId)?.label || categoryId)
  }
  if (profile.major !== 'any' && profile.major !== current.major) {
    bits.push(profile.major.replace(/-/g, ' '))
  }
  if (profile.identity !== 'any' && profile.identity !== current.identity) {
    bits.push(profile.identity.replace(/-/g, ' '))
  }
  if (profile.level !== current.level) {
    bits.push(profile.level.replace(/-/g, ' '))
  }

  // List keyword: keep meaningful tokens, drop stopwords
  const stop = new Set([
    'i',
    'am',
    'a',
    'an',
    'the',
    'and',
    'or',
    'for',
    'to',
    'in',
    'of',
    'my',
    'me',
    'looking',
    'find',
    'show',
    'student',
    'students',
    'scholarship',
    'scholarships',
    'which',
    'that',
    'with',
    'your',
    'list',
    'please',
    'help',
  ])
  const listQuery = lower
    .split(/[^a-z0-9+]+/)
    .filter((t) => t.length > 2 && !stop.has(t))
    .slice(0, 6)
    .join(' ')

  return {
    profile,
    categoryId,
    listQuery,
    summary: bits.length ? bits.join(' · ') : text.slice(0, 80),
  }
}
