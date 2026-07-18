/**
 * Thin client for the account Functions (/api/auth/*, /api/saves).
 * All requests send cookies so the httpOnly session travels with them.
 */

export type AccountSave = {
  id: string
  savedAt: number
  updatedAt: number
  notes: string
  checklist: string[]
  applyStatus: string
  deadline: string
  reminderSent: string[]
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  const data = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) throw new Error((data as { error?: string })?.error || `request failed (${res.status})`)
  return data as T
}

/** Ask for a magic link. Returns devLink only in local dev. */
export function requestMagicLink(email: string): Promise<{ ok: boolean; devLink?: string }> {
  return req('/api/auth/request', { method: 'POST', body: JSON.stringify({ email }) })
}

export function verifyToken(token: string): Promise<{ ok: boolean; email: string | null }> {
  return req('/api/auth/verify', { method: 'POST', body: JSON.stringify({ token }) })
}

export function getAccountSession(): Promise<{ email: string | null }> {
  return req('/api/auth/session')
}

export function signOut(): Promise<{ ok: boolean }> {
  return req('/api/auth/signout', { method: 'POST' })
}

export function getSaves(): Promise<{ saves: AccountSave[] }> {
  return req('/api/saves')
}

export type SaveUpsert = {
  id: string
  saved_at?: number
  notes?: string
  checklist?: string[]
  apply_status?: string
  deadline?: string
}

export function putSaves(saves: SaveUpsert[]): Promise<{ ok: boolean; count: number }> {
  return req('/api/saves', { method: 'POST', body: JSON.stringify({ saves }) })
}

export function deleteSave(id: string): Promise<{ ok: boolean }> {
  return req(`/api/saves?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
}
