/** Per-scholarship application status (local only). */
export type ApplyStatus = 'none' | 'interested' | 'applied' | 'submitted'

export const APPLY_STATUS_LABEL: Record<ApplyStatus, string> = {
  none: 'Not tracked',
  interested: 'Interested',
  applied: 'Started app',
  submitted: 'Submitted',
}

const KEY = 'scholarship-one-apply-status'

export function loadApplyStatus(): Record<string, ApplyStatus> {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, ApplyStatus>
  } catch {
    return {}
  }
}

export function saveApplyStatus(map: Record<string, ApplyStatus>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

export function setStatusFor(
  map: Record<string, ApplyStatus>,
  id: string,
  status: ApplyStatus,
): Record<string, ApplyStatus> {
  const next = { ...map }
  if (status === 'none') delete next[id]
  else next[id] = status
  return next
}
