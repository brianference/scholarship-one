/** Awards the student marked "not interested". Local copy; mirrored to D1 when signed in. */

const KEY = 'scholarship-one-hidden'

/** Load hidden award ids. Anything that is not an array of strings is ignored. */
export function loadHidden(): string[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

export function saveHidden(ids: string[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids))
  } catch {
    /* ignore quota */
  }
}
