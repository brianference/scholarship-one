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
const PROFILE_UPDATED_KEY = 'scholarship-one-profile-updated'

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

/** Epoch ms of the last local profile edit, 0 when the profile was never edited here. */
export function loadProfileUpdatedAt(): number {
  try {
    const n = Number(localStorage.getItem(PROFILE_UPDATED_KEY))
    return Number.isFinite(n) && n > 0 ? n : 0
  } catch {
    return 0
  }
}

export function saveProfileUpdatedAt(at: number): void {
  try {
    localStorage.setItem(PROFILE_UPDATED_KEY, String(at))
  } catch {
    /* ignore */
  }
}

/** True when every field is still the default, i.e. the student never set one. */
export function isDefaultProfile(profile: Profile): boolean {
  return (Object.keys(DEFAULT_PROFILE) as (keyof Profile)[]).every((k) => profile[k] === DEFAULT_PROFILE[k])
}

/** Validate a profile that came from the server or a file before trusting it. */
export function coerceProfile(raw: unknown): Profile | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const keys = Object.keys(DEFAULT_PROFILE) as (keyof Profile)[]
  if (!keys.every((k) => typeof o[k] === 'string' && (o[k] as string).length > 0)) return null
  return normalizeProfile(o as Partial<Profile>)
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
