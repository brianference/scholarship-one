const KEY = 'scholarship-one-digest-prefs'

export type DigestPrefs = {
  email: string
  optedIn: boolean
  lastSentAt: number | null
  remindInApp: boolean
}

export function loadDigestPrefs(): DigestPrefs {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { email: '', optedIn: false, lastSentAt: null, remindInApp: true }
    return { ...{ email: '', optedIn: false, lastSentAt: null, remindInApp: true }, ...JSON.parse(raw) }
  } catch {
    return { email: '', optedIn: false, lastSentAt: null, remindInApp: true }
  }
}

export function saveDigestPrefs(prefs: DigestPrefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs))
  } catch {
    /* ignore */
  }
}

/** True if opted in and last send was more than 6.5 days ago (or never). */
export function shouldPromptWeeklyDigest(prefs: DigestPrefs): boolean {
  if (!prefs.optedIn || !prefs.email) return false
  if (!prefs.lastSentAt) return true
  return Date.now() - prefs.lastSentAt > 6.5 * 86400000
}
