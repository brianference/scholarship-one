/**
 * Local record of last email digest attempt (for Activity page).
 */
const KEY = 'scholarship-one-digest-activity'

export type DigestActivity = {
  lastAttemptAt: number | null
  lastSuccessAt: number | null
  lastEmail: string | null
  lastError: string | null
  configured: boolean | null
}

const EMPTY: DigestActivity = {
  lastAttemptAt: null,
  lastSuccessAt: null,
  lastEmail: null,
  lastError: null,
  configured: null,
}

export function loadDigestActivity(): DigestActivity {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...EMPTY }
    return { ...EMPTY, ...(JSON.parse(raw) as DigestActivity) }
  } catch {
    return { ...EMPTY }
  }
}

export function saveDigestActivity(next: DigestActivity): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
}

export function recordDigestAttempt(input: {
  email: string
  ok: boolean
  configured: boolean
  error?: string
}): DigestActivity {
  const prev = loadDigestActivity()
  const next: DigestActivity = {
    ...prev,
    lastAttemptAt: Date.now(),
    lastEmail: input.email,
    configured: input.configured,
    lastError: input.ok ? null : input.error || 'send failed',
    lastSuccessAt: input.ok ? Date.now() : prev.lastSuccessAt,
  }
  saveDigestActivity(next)
  return next
}
