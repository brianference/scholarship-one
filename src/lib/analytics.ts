/**
 * Privacy-light product analytics — local only, no third-party beacons.
 * Answers: what people search, save, open, and which categories they use.
 */

export type AnalyticsEvent =
  | { type: 'search'; q: string; at: number }
  | { type: 'save'; id: string; at: number }
  | { type: 'unsave'; id: string; at: number }
  | { type: 'official_click'; id: string; at: number }
  | { type: 'category'; id: string; at: number }
  | { type: 'onboarding_complete'; at: number }
  | { type: 'digest_email'; at: number }
  | { type: 'compare'; count: number; at: number }
  | { type: 'pipeline_move'; id: string; status: string; at: number }

export type AnalyticsSummary = {
  searches: number
  saves: number
  officialClicks: number
  topQueries: { q: string; n: number }[]
  topSavedIds: { id: string; n: number }[]
  topCategories: { id: string; n: number }[]
  onboardingCompleted: boolean
  last7DaysEvents: number
}

const KEY = 'scholarship-one-analytics'
const MAX = 400

export function loadEvents(): AnalyticsEvent[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as AnalyticsEvent[]
    return Array.isArray(parsed) ? parsed.slice(-MAX) : []
  } catch {
    return []
  }
}

function persist(events: AnalyticsEvent[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(events.slice(-MAX)))
  } catch {
    /* ignore */
  }
}

export function track(event: AnalyticsEvent): void {
  const next = [...loadEvents(), event].slice(-MAX)
  persist(next)
}

function countBy<T extends string>(items: T[]): { key: T; n: number }[] {
  const map = new Map<T, number>()
  for (const item of items) map.set(item, (map.get(item) || 0) + 1)
  return [...map.entries()]
    .map(([key, n]) => ({ key, n }))
    .sort((a, b) => b.n - a.n)
}

export function getAnalyticsSummary(): AnalyticsSummary {
  const events = loadEvents()
  const weekAgo = Date.now() - 7 * 86400000
  const searches = events.filter((e) => e.type === 'search') as Extract<AnalyticsEvent, { type: 'search' }>[]
  const saves = events.filter((e) => e.type === 'save') as Extract<AnalyticsEvent, { type: 'save' }>[]
  const official = events.filter((e) => e.type === 'official_click') as Extract<
    AnalyticsEvent,
    { type: 'official_click' }
  >[]
  const cats = events.filter((e) => e.type === 'category') as Extract<AnalyticsEvent, { type: 'category' }>[]

  return {
    searches: searches.length,
    saves: saves.length,
    officialClicks: official.length,
    topQueries: countBy(searches.map((e) => e.q.toLowerCase().slice(0, 60)))
      .slice(0, 5)
      .map(({ key, n }) => ({ q: key, n })),
    topSavedIds: countBy(saves.map((e) => e.id))
      .slice(0, 5)
      .map(({ key, n }) => ({ id: key, n })),
    topCategories: countBy(cats.map((e) => e.id))
      .slice(0, 5)
      .map(({ key, n }) => ({ id: key, n })),
    onboardingCompleted: events.some((e) => e.type === 'onboarding_complete'),
    last7DaysEvents: events.filter((e) => e.at >= weekAgo).length,
  }
}
