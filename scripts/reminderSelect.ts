/**
 * Pure selection of which saved awards are due for a reminder today.
 * A reminder fires when a saved award has a *fixed* deadline exactly 7 or 1 days
 * out (UTC day granularity) and that mark hasn't been sent yet. Rolling / cycle /
 * "varies" deadlines have no fixed date and are skipped.
 */
const DAY_MS = 86_400_000
const NON_FIXED = /rolling|varies|cycle|fafsa|priority|portal|annually|ongoing|tbd|check|no deadline|campus/i

export type ReminderRow = {
  userId: string
  email: string
  scholarshipId: string
  deadline: string
  reminderSent: string[]
}

export type DueItem = { userId: string; scholarshipId: string; daysLeft: number; mark: 'd7' | 'd1' }
export type DueGroup = { email: string; items: DueItem[] }

/** Epoch ms of a fixed deadline, or null if it isn't a real fixed date. */
export function fixedDeadlineMs(deadline: string): number | null {
  if (!deadline || NON_FIXED.test(deadline)) return null
  const t = Date.parse(deadline)
  return Number.isNaN(t) ? null : t
}

const utcDay = (ms: number) => Math.floor(ms / DAY_MS)

/** Group due reminders by email; each item carries the mark to record (d7/d1). */
export function selectDueReminders(rows: ReminderRow[], nowMs: number): DueGroup[] {
  const byEmail = new Map<string, DueItem[]>()
  for (const row of rows) {
    const t = fixedDeadlineMs(row.deadline)
    if (t == null) continue
    const daysLeft = utcDay(t) - utcDay(nowMs)
    const mark: 'd7' | 'd1' | null = daysLeft === 7 ? 'd7' : daysLeft === 1 ? 'd1' : null
    if (!mark) continue
    if (row.reminderSent.includes(mark)) continue
    const item: DueItem = { userId: row.userId, scholarshipId: row.scholarshipId, daysLeft, mark }
    const list = byEmail.get(row.email)
    if (list) list.push(item)
    else byEmail.set(row.email, [item])
  }
  return [...byEmail.entries()].map(([email, items]) => ({ email, items }))
}

/** A student-chosen "remind me to apply" day on a saved award. */
export type CustomReminderRow = {
  userId: string
  email: string
  scholarshipId: string
  /** YYYY-MM-DD */
  remindOn: string
  /** The remind_on value already emailed, or ''. Changing the date re-arms the reminder. */
  remindSentOn: string
}

export type CustomDueItem = { userId: string; scholarshipId: string; remindOn: string }
export type CustomDueGroup = { email: string; items: CustomDueItem[] }

/** A reminder this far past its day is dropped rather than emailed late. */
export const CUSTOM_REMINDER_MAX_AGE_DAYS = 14

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

/**
 * Pick custom remind-to-apply rows that are due: the day is today or earlier (so a missed
 * cron run still sends), no more than CUSTOM_REMINDER_MAX_AGE_DAYS old, and not already
 * emailed for this exact date. Grouped by email so each user gets one message.
 */
export function selectDueCustomReminders(rows: CustomReminderRow[], nowMs: number): CustomDueGroup[] {
  const today = utcDay(nowMs)
  const byEmail = new Map<string, CustomDueItem[]>()
  for (const row of rows) {
    if (!DATE_ONLY.test(row.remindOn)) continue
    const t = Date.parse(row.remindOn)
    if (Number.isNaN(t)) continue
    const age = today - utcDay(t)
    if (age < 0 || age > CUSTOM_REMINDER_MAX_AGE_DAYS) continue
    if (row.remindSentOn === row.remindOn) continue
    const item: CustomDueItem = { userId: row.userId, scholarshipId: row.scholarshipId, remindOn: row.remindOn }
    const list = byEmail.get(row.email)
    if (list) list.push(item)
    else byEmail.set(row.email, [item])
  }
  return [...byEmail.entries()].map(([email, items]) => ({ email, items }))
}
