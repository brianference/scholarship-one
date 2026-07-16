/**
 * Pure catalog ranking / filtering — no React, easy to unit-test and reuse.
 */
import { CATALOG } from '../data/catalog'
import { BROWSE_CATEGORIES, itemMatchesCategory } from './categories'
import { hasNoEssayTag, matchesAmountBucket, type AmountBucket } from './amountFilter'
import { fitTips } from './fitTips'
import { matchWhy } from './matchWhy'
import type { Profile } from './profile'
import { scoreBreakdown } from './scoring'
import { urgency } from './urgency'
import type { EssayFilter, SortMode, UrgencyFilter } from '../features/matcher/MatcherFilters'

export type RankedRow = (typeof CATALOG)[number] & {
  score: number
  scoreParts: { label: string; points: number }[]
  scorePenalties: { label: string; points: number }[]
  urg: ReturnType<typeof urgency>
  pinned: boolean
  why: string[]
  tips: string[]
}

export type CatalogQuery = {
  profile: Profile
  listFilter: string
  categoryId: string
  onlyShort: boolean
  onlyAi: boolean
  shortlist: string[]
  pinnedIds: string[]
  urgencyFilter: UrgencyFilter
  sort: SortMode
  amountBucket: AmountBucket
  essayFilter: EssayFilter
}

function deadlineSortKey(deadline: string): number {
  if (/fafsa|cycle|varies|rolling|portal|campus|priority|recommended|annually/i.test(deadline)) {
    return Number.MAX_SAFE_INTEGER - 1
  }
  const parsed = Date.parse(deadline)
  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed
}

/** Counts per browse category (for chips). */
export function categoryCounts(): Record<string, number> {
  const counts: Record<string, number> = { all: CATALOG.length }
  for (const cat of BROWSE_CATEGORIES) {
    if (cat.id === 'all') continue
    counts[cat.id] = CATALOG.filter((item) => itemMatchesCategory(item.tags, cat.id)).length
  }
  return counts
}

/** Rank + filter the full catalog for the results list. */
export function queryCatalog(q: CatalogQuery): RankedRow[] {
  const rows = CATALOG.map((item) => {
    const breakdown = scoreBreakdown(item.tags, q.profile)
    return {
      ...item,
      score: breakdown.total,
      scoreParts: breakdown.parts,
      scorePenalties: breakdown.penalties,
      urg: urgency(item.deadline),
      pinned: q.pinnedIds.includes(item.id),
      why: matchWhy(item.tags, q.profile),
      tips: fitTips(item.tags, q.profile, breakdown.total),
    }
  }).filter((item) => {
    const okCategory = itemMatchesCategory(item.tags, q.categoryId)
    const okQuery =
      !q.listFilter ||
      `${item.name} ${item.summary} ${item.tags.join(' ')}`.toLowerCase().includes(q.listFilter.toLowerCase())
    const okShort = !q.onlyShort || q.shortlist.includes(item.id)
    const okAi = !q.onlyAi || item.pinned
    const okAmount = matchesAmountBucket(item.amount, q.amountBucket)
    const okEssay = q.essayFilter === 'all' || hasNoEssayTag(item.tags)
    let okUrg = true
    if (q.urgencyFilter === 'soon') okUrg = item.urg.kind === 'fixed' && (item.urg.daysLeft ?? 99) <= 45
    if (q.urgencyFilter === 'rolling') okUrg = item.urg.kind === 'cycle' || item.urg.kind === 'soft'
    if (q.urgencyFilter === 'passed') okUrg = item.urg.kind === 'passed'
    return okCategory && okQuery && okShort && okAi && okUrg && okAmount && okEssay
  })

  rows.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    if (q.sort === 'name') return a.name.localeCompare(b.name)
    if (q.sort === 'deadline') return deadlineSortKey(a.deadline) - deadlineSortKey(b.deadline)
    return b.score - a.score
  })
  return rows
}
