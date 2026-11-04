/**
 * Remind-to-apply dates, one per scholarship (YYYY-MM-DD, a calendar day).
 * Local copy; mirrored to D1 when signed in, where the daily job emails on the day.
 */
import { urgency } from './urgency'

const KEY = 'scholarship-one-remind-on'
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export type RemindMap = Record<string, string>

export function isRemindDate(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false
  const t = Date.parse(value)
  // Round-trip so 2026-02-31 (which rolls over to March) is rejected.
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === value
}

export function loadReminders(): RemindMap {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}
    const out: RemindMap = {}
    for (const [id, date] of Object.entries(parsed as Record<string, unknown>)) {
      if (isRemindDate(date)) out[id] = date
    }
    return out
  } catch {
    return {}
  }
}

export function saveReminders(map: RemindMap): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(map))
  } catch {
    /* ignore quota */
  }
}

/** Set or clear (date = null) one reminder without mutating the input. */
export function setReminderFor(map: RemindMap, id: string, date: string | null): RemindMap {
  const next = { ...map }
  if (date && isRemindDate(date)) next[id] = date
  else delete next[id]
  return next
}

/** A local calendar day as YYYY-MM-DD, `offsetDays` from `from`. */
export function dayString(offsetDays: number, from: Date = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + offsetDays)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

export type RemindPreset = { key: string; label: string; date: string }

/**
 * Quick choices for the picker. "A week before the deadline" only appears for a
 * fixed deadline that is more than 8 days away, so it is never today or the past.
 */
export function remindPresets(deadline: string, from: Date = new Date()): RemindPreset[] {
  const presets: RemindPreset[] = [
    { key: 'tomorrow', label: 'Tomorrow', date: dayString(1, from) },
    { key: '3d', label: 'In 3 days', date: dayString(3, from) },
    { key: '1w', label: 'In 1 week', date: dayString(7, from) },
  ]
  const u = urgency(deadline)
  if (u.kind === 'fixed' && u.daysLeft != null && u.daysLeft > 8) {
    presets.push({ key: 'before', label: 'A week before it is due', date: dayString(u.daysLeft - 7, from) })
  }
  return presets
}

/** "Nov 10" style label for a stored date; the date is read as a local calendar day. */
export function formatRemindOn(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** True when the reminder day is today or earlier, so the UI can flag it as due. */
export function isReminderDue(date: string, from: Date = new Date()): boolean {
  return date <= dayString(0, from)
}
