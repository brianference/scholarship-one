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

/**
 * An API failure carrying the server's per-field messages, so forms can mark
 * the offending input instead of only showing a banner.
 */
export class ApiError extends Error {
  readonly status: number
  readonly fields: Record<string, string>
  /** Seconds to wait, present on 429 responses. */
  readonly retryAfter: number | null

  constructor(message: string, status: number, fields: Record<string, string> = {}, retryAfter: number | null = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fields = fields
    this.retryAfter = retryAfter
  }
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      ...init,
    })
  } catch {
    // fetch only rejects on network failure, which is worth saying plainly.
    throw new ApiError('Could not reach the server. Check your connection and try again.', 0)
  }
  const data = (await res.json().catch(() => ({}))) as T & {
    error?: string
    fields?: Record<string, string>
    field?: string
  }
  if (!res.ok) {
    const retryHeader = res.headers.get('Retry-After')
    const fields = data?.fields ?? (data?.field && data?.error ? { [data.field]: data.error } : {})
    throw new ApiError(
      data?.error || `Something went wrong (${res.status}).`,
      res.status,
      fields,
      retryHeader ? Number(retryHeader) : null,
    )
  }
  return data as T
}

/** Ask for a magic link. Returns devLink only in local dev. */
export function requestMagicLink(email: string): Promise<{ ok: boolean; devLink?: string }> {
  return req('/api/auth/request', { method: 'POST', body: JSON.stringify({ email }) })
}

export function verifyToken(token: string): Promise<{ ok: boolean; email: string | null }> {
  return req('/api/auth/verify', { method: 'POST', body: JSON.stringify({ token }) })
}

/** Create a password account. The session cookie comes back on the response. */
export function registerAccount(email: string, password: string): Promise<{ ok: boolean; email: string }> {
  return req('/api/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) })
}

/** Sign in with a password. */
export function loginWithPassword(email: string, password: string): Promise<{ ok: boolean; email: string }> {
  return req('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
}

/** Ask for a password-reset email. Always resolves, even for unknown addresses. */
export function requestPasswordReset(email: string): Promise<{ ok: boolean }> {
  return req('/api/auth/password/reset-request', { method: 'POST', body: JSON.stringify({ email }) })
}

/** Redeem a reset token and set the new password. */
export function resetPassword(token: string, password: string): Promise<{ ok: boolean; email: string | null }> {
  return req('/api/auth/password/reset', { method: 'POST', body: JSON.stringify({ token, password }) })
}

/** Send a Contact Us message. */
export function sendContactMessage(input: {
  name: string
  email: string
  subject: string
  message: string
  website?: string
}): Promise<{ ok: boolean }> {
  return req('/api/contact', { method: 'POST', body: JSON.stringify(input) })
}

export function getAccountSession(): Promise<{ email: string | null; enabled?: boolean }> {
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
