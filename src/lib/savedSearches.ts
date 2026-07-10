import type { Profile } from './profile'

export type SavedSearch = {
  id: string
  name: string
  query: string
  tag: string
  urgency: string
  sort: string
  onlyShort: boolean
  profile: Profile
  createdAt: number
}

const KEY = 'scholarship-one-saved-searches'
const MAX = 12

/** Load saved filter snapshots from localStorage. */
export function loadSavedSearches(): SavedSearch[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as SavedSearch[]
    return Array.isArray(parsed) ? parsed.slice(0, MAX) : []
  } catch {
    return []
  }
}

function persist(list: SavedSearch[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)))
  } catch {
    /* ignore */
  }
}

/** Save or replace a named search snapshot. */
export function upsertSavedSearch(input: Omit<SavedSearch, 'id' | 'createdAt'> & { id?: string }): SavedSearch[] {
  const list = loadSavedSearches()
  const id = input.id || `s-${Date.now()}`
  const next: SavedSearch = {
    id,
    name: input.name.trim().slice(0, 60) || 'Untitled search',
    query: input.query,
    tag: input.tag,
    urgency: input.urgency,
    sort: input.sort,
    onlyShort: input.onlyShort,
    profile: input.profile,
    createdAt: Date.now(),
  }
  const without = list.filter((s) => s.id !== id && s.name.toLowerCase() !== next.name.toLowerCase())
  const updated = [next, ...without].slice(0, MAX)
  persist(updated)
  return updated
}

export function deleteSavedSearch(id: string): SavedSearch[] {
  const updated = loadSavedSearches().filter((s) => s.id !== id)
  persist(updated)
  return updated
}
