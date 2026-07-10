import type { CatalogItem } from '../data/catalog'

export type DigestItem = {
  id: string
  name: string
  amount: string
  deadline: string
  url: string
  daysLeft: number
  saved: boolean
}

export type WeeklyDigest = {
  weekLabel: string
  items: DigestItem[]
  rollingCount: number
  plainText: string
}

function parseDaysLeft(deadline: string): number | null {
  if (/fafsa|cycle|varies|rolling|portal|campus|priority|recommended|annually/i.test(deadline)) return null
  const parsed = Date.parse(deadline)
  if (Number.isNaN(parsed)) return null
  return Math.ceil((parsed - Date.now()) / 86400000)
}

/**
 * Build a weekly deadline digest for the next `windowDays` days.
 * Prefers saved awards, then falls back to full catalog.
 */
export function buildWeeklyDigest(
  catalog: readonly CatalogItem[],
  savedIds: string[],
  windowDays = 7,
): WeeklyDigest {
  const saved = new Set(savedIds)
  const start = new Date()
  const end = new Date(Date.now() + windowDays * 86400000)
  const weekLabel = `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`

  const withDays = catalog
    .map((item) => {
      const daysLeft = parseDaysLeft(item.deadline)
      if (daysLeft === null) return null
      if (daysLeft < 0 || daysLeft > windowDays) return null
      return {
        id: item.id,
        name: item.name,
        amount: item.amount,
        deadline: item.deadline,
        url: item.url,
        daysLeft,
        saved: saved.has(item.id),
      } satisfies DigestItem
    })
    .filter((x): x is DigestItem => Boolean(x))
    .sort((a, b) => {
      if (a.saved !== b.saved) return a.saved ? -1 : 1
      return a.daysLeft - b.daysLeft
    })

  const rollingCount = catalog.filter((item) =>
    /fafsa|cycle|varies|rolling|portal|campus|priority/i.test(item.deadline),
  ).length

  const lines = [
    `Scholarship One — weekly deadline digest (${weekLabel})`,
    '',
    withDays.length
      ? withDays
          .map(
            (i) =>
              `• ${i.name} — due in ${i.daysLeft}d (${i.deadline}) — ${i.amount}${i.saved ? ' [saved]' : ''}\n  ${i.url}`,
          )
          .join('\n')
      : 'No fixed deadlines in the next week. Check rolling / FAFSA programs and your saved list.',
    '',
    `Rolling or cycle-based programs in catalog: ${rollingCount}`,
    'Always confirm deadlines on the official site.',
  ]

  return {
    weekLabel,
    items: withDays,
    rollingCount,
    plainText: lines.join('\n'),
  }
}

export function digestMailto(digest: WeeklyDigest): string {
  const subject = encodeURIComponent(`My scholarship deadlines (${digest.weekLabel})`)
  const body = encodeURIComponent(digest.plainText.slice(0, 1800))
  return `mailto:?subject=${subject}&body=${body}`
}
