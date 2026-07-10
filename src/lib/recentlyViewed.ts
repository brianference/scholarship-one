const KEY = 'scholarship-one-recent'
const MAX = 12

export function loadRecentlyViewed(): string[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as string[]
    return Array.isArray(parsed) ? parsed.slice(0, MAX) : []
  } catch {
    return []
  }
}

export function pushRecentlyViewed(list: string[], id: string): string[] {
  const next = [id, ...list.filter((x) => x !== id)].slice(0, MAX)
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
  return next
}
