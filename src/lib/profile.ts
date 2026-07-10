/** User profile that drives ranking (local only). */
export type Profile = {
  major: string
  state: string
  level: string
  identity: string
  need: string
}

export const DEFAULT_PROFILE: Profile = {
  major: 'any',
  state: 'any',
  level: 'undergrad',
  identity: 'any',
  need: 'any',
}

const PROFILE_KEY = 'scholarship-one-profile'
const SHORTLIST_KEY = 'scholarship-one-shortlist'

function normalizeProfile(raw: Partial<Profile> | null): Profile {
  return {
    major: raw?.major || DEFAULT_PROFILE.major,
    state: raw?.state || DEFAULT_PROFILE.state,
    level: raw?.level || DEFAULT_PROFILE.level,
    identity: raw?.identity || DEFAULT_PROFILE.identity,
    need: raw?.need || DEFAULT_PROFILE.need,
  }
}

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    if (raw) return normalizeProfile(JSON.parse(raw) as Partial<Profile>)
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

/** Human-readable summary for the LLM. */
export function profileSummary(profile: Profile): string {
  const parts = [
    `level=${profile.level}`,
    `major=${profile.major}`,
    `identity=${profile.identity}`,
    `need=${profile.need}`,
    `state=${profile.state}`,
  ]
  return parts.join(', ')
}
