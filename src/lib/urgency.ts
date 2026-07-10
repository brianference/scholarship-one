export type Urgency = { label: string; tone: string }

/** Map free-text deadlines to urgency chips. */
export function urgency(deadline: string): Urgency {
  if (/fafsa|cycle|varies|rolling/i.test(deadline)) return { label: 'Rolling / cycle', tone: 'chip-muted' }
  const parsed = Date.parse(deadline)
  if (Number.isNaN(parsed)) return { label: deadline, tone: 'chip-muted' }
  const days = Math.ceil((parsed - Date.now()) / 86400000)
  if (days < 0) return { label: 'Deadline passed', tone: 'chip-danger' }
  if (days <= 14) return { label: `Due in ${days}d`, tone: 'chip-warn' }
  if (days <= 45) return { label: `Due in ${days}d`, tone: 'chip-ok' }
  return { label: deadline, tone: 'chip-muted' }
}
