export type DeadlineKind = 'fixed' | 'cycle' | 'soft' | 'passed' | 'unknown'

export type Urgency = {
  label: string
  tone: string
  kind: DeadlineKind
  daysLeft: number | null
  /** Soft / cycle dates should be confirmed on the official site */
  confirmOfficial: boolean
}

const CYCLE_RE = /fafsa|cadaa|wasfa|orsaa|njfams|cycle|varies|rolling|portal|campus|priority|recommended|annually|term start|within \d+ days of/i
const SOFT_RE = /school priority|check portal|deadlines vary|varies by/i

/**
 * Classify deadlines so fixed dates rank differently from FAFSA/rolling cycles.
 */
export function classifyDeadline(deadline: string): Urgency {
  const raw = deadline.trim()
  if (!raw) {
    return {
      label: 'Date not listed',
      tone: 'chip-muted',
      kind: 'unknown',
      daysLeft: null,
      confirmOfficial: true,
    }
  }

  if (CYCLE_RE.test(raw) || SOFT_RE.test(raw)) {
    const kind: DeadlineKind = SOFT_RE.test(raw) && !/fafsa|cycle|rolling/i.test(raw) ? 'soft' : 'cycle'
    return {
      label: kind === 'soft' ? 'Soft / campus date — confirm official' : 'Rolling / aid cycle — confirm official',
      tone: 'chip-muted',
      kind,
      daysLeft: null,
      confirmOfficial: true,
    }
  }

  const parsed = Date.parse(raw)
  if (Number.isNaN(parsed)) {
    return {
      label: `${raw} — confirm official`,
      tone: 'chip-muted',
      kind: 'unknown',
      daysLeft: null,
      confirmOfficial: true,
    }
  }

  const days = Math.ceil((parsed - Date.now()) / 86400000)
  if (days < 0) {
    return {
      label: 'Deadline passed — confirm if still open',
      tone: 'chip-danger',
      kind: 'passed',
      daysLeft: days,
      confirmOfficial: true,
    }
  }
  if (days <= 14) {
    return {
      label: `Due in ${days}d (fixed)`,
      tone: 'chip-warn',
      kind: 'fixed',
      daysLeft: days,
      confirmOfficial: false,
    }
  }
  if (days <= 45) {
    return {
      label: `Due in ${days}d (fixed)`,
      tone: 'chip-ok',
      kind: 'fixed',
      daysLeft: days,
      confirmOfficial: false,
    }
  }
  return {
    label: `${raw} (fixed)`,
    tone: 'chip-muted',
    kind: 'fixed',
    daysLeft: days,
    confirmOfficial: false,
  }
}

/** Map free-text deadlines to urgency chips (compat wrapper). */
export function urgency(deadline: string): Urgency {
  return classifyDeadline(deadline)
}
