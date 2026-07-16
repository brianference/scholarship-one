/**
 * Deadline digests for the Deadlines page.
 * Saved awards always appear — even when rolling or outside the 7-day window.
 */
import type { CatalogItem } from '../data/catalog'

export type DigestItem = {
  id: string
  name: string
  amount: string
  deadline: string
  url: string
  /** null when rolling / unparseable */
  daysLeft: number | null
  saved: boolean
  kind: 'fixed' | 'rolling' | 'passed' | 'unknown'
  statusLabel: string
}

export type WeeklyDigest = {
  weekLabel: string
  /** Fixed deadlines inside the window (saved sorted first) */
  items: DigestItem[]
  /** Every saved award with deadline status (always shown on Deadlines page) */
  savedItems: DigestItem[]
  rollingCount: number
  plainText: string
}

function classifyItem(item: CatalogItem, saved: boolean): DigestItem {
  const deadline = item.deadline
  if (/fafsa|cycle|varies|rolling|portal|campus|priority|recommended|annually/i.test(deadline)) {
    return {
      id: item.id,
      name: item.name,
      amount: item.amount,
      deadline,
      url: item.url,
      daysLeft: null,
      saved,
      kind: 'rolling',
      statusLabel: 'Rolling / cycle — confirm official',
    }
  }
  const parsed = Date.parse(deadline)
  if (Number.isNaN(parsed)) {
    return {
      id: item.id,
      name: item.name,
      amount: item.amount,
      deadline,
      url: item.url,
      daysLeft: null,
      saved,
      kind: 'unknown',
      statusLabel: 'Date unclear — confirm official',
    }
  }
  const daysLeft = Math.ceil((parsed - Date.now()) / 86400000)
  if (daysLeft < 0) {
    return {
      id: item.id,
      name: item.name,
      amount: item.amount,
      deadline,
      url: item.url,
      daysLeft,
      saved,
      kind: 'passed',
      statusLabel: 'Deadline passed — confirm if still open',
    }
  }
  return {
    id: item.id,
    name: item.name,
    amount: item.amount,
    deadline,
    url: item.url,
    daysLeft,
    saved,
    kind: 'fixed',
    statusLabel: `Due in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
  }
}

/**
 * Build digest:
 * - items = fixed deadlines in the next `windowDays` days (catalog-wide, saved first)
 * - savedItems = ALL saved awards with full deadline status (never filtered out)
 */
export function buildWeeklyDigest(
  catalog: readonly CatalogItem[],
  savedIds: string[],
  windowDays = 7,
): WeeklyDigest {
  const savedSet = new Set(savedIds)
  const start = new Date()
  const end = new Date(Date.now() + windowDays * 86400000)
  const weekLabel = `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`

  const byId = new Map<string, CatalogItem>(catalog.map((c) => [c.id, c]))

  // Always surface every saved award
  const savedItems = savedIds
    .map((id) => {
      const item = byId.get(id)
      if (!item) return null
      return classifyItem(item, true)
    })
    .filter((x): x is DigestItem => Boolean(x))
    .sort((a, b) => {
      // fixed soonest first, then rolling, then passed
      const rank = (k: DigestItem['kind']) =>
        k === 'fixed' ? 0 : k === 'unknown' ? 1 : k === 'rolling' ? 2 : 3
      if (rank(a.kind) !== rank(b.kind)) return rank(a.kind) - rank(b.kind)
      if (a.daysLeft != null && b.daysLeft != null) return a.daysLeft - b.daysLeft
      return a.name.localeCompare(b.name)
    })

  // Week window: fixed dates only
  const items = catalog
    .map((item) => classifyItem(item, savedSet.has(item.id)))
    .filter((row) => row.kind === 'fixed' && row.daysLeft != null && row.daysLeft >= 0 && row.daysLeft <= windowDays)
    .sort((a, b) => {
      if (a.saved !== b.saved) return a.saved ? -1 : 1
      return (a.daysLeft ?? 999) - (b.daysLeft ?? 999)
    })

  const rollingCount = catalog.filter((item) =>
    /fafsa|cycle|varies|rolling|portal|campus|priority/i.test(item.deadline),
  ).length

  const savedLines =
    savedItems.length === 0
      ? 'No saved awards yet. Star programs on Results, then return here.'
      : savedItems
          .map(
            (i) =>
              `• ${i.name} — ${i.statusLabel} (${i.deadline}) — ${i.amount}\n  ${i.url}`,
          )
          .join('\n')

  const weekLines =
    items.length === 0
      ? 'No fixed catalog deadlines in the next 7 days.'
      : items
          .map(
            (i) =>
              `• ${i.name} — due in ${i.daysLeft}d (${i.deadline}) — ${i.amount}${i.saved ? ' [saved]' : ''}\n  ${i.url}`,
          )
          .join('\n')

  const plainText = [
    `Scholarship One — deadline digest (${weekLabel})`,
    '',
    'YOUR SAVED AWARDS',
    savedLines,
    '',
    'FIXED DEADLINES THIS WEEK (catalog)',
    weekLines,
    '',
    `Rolling or cycle-based programs in catalog: ${rollingCount}`,
    'Always confirm deadlines on the official site.',
  ].join('\n')

  return {
    weekLabel,
    items,
    savedItems,
    rollingCount,
    plainText,
  }
}

export function digestMailto(digest: WeeklyDigest): string {
  const subject = encodeURIComponent(`My scholarship deadlines (${digest.weekLabel})`)
  const body = encodeURIComponent(digest.plainText.slice(0, 1800))
  return `mailto:?subject=${subject}&body=${body}`
}
