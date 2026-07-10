/** User profile that drives ranking (local only). */
export type Profile = {
  major: string
  state: string
  level: string
}

export const DEFAULT_PROFILE: Profile = {
  major: 'accounting',
  state: 'any',
  level: 'undergrad',
}

const PROFILE_KEY = 'scholarship-one-profile'
const SHORTLIST_KEY = 'scholarship-one-shortlist'

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    if (raw) return JSON.parse(raw) as Profile
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_PROFILE }
}

export function saveProfile(profile: Profile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
  } catch {
    /* ignore */
  }
}

export function loadShortlist(): string[] {
  try {
    const raw = localStorage.getItem(SHORTLIST_KEY)
    if (raw) return JSON.parse(raw) as string[]
  } catch {
    /* ignore */
  }
  return []
}

export function saveShortlist(ids: string[]): void {
  try {
    localStorage.setItem(SHORTLIST_KEY, JSON.stringify(ids))
  } catch {
    /* ignore */
  }
}
