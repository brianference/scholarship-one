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
