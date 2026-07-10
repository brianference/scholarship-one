/** Default application steps every student can track per award. */
export const DEFAULT_CHECKLIST = [
  { id: 'eligibility', label: 'Confirm eligibility' },
  { id: 'docs', label: 'Gather documents (transcript, essay, recs)' },
  { id: 'account', label: 'Create / log into portal' },
  { id: 'draft', label: 'Draft essay / answers' },
  { id: 'submit', label: 'Submit application' },
  { id: 'confirm', label: 'Save confirmation / deadline reminder' },
] as const

export type ChecklistState = Record<string, string[]> // scholarshipId -> completed step ids

const KEY = 'scholarship-one-checklist'

export function loadChecklist(): ChecklistState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as ChecklistState
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function saveChecklist(map: ChecklistState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

export function toggleCheckStep(map: ChecklistState, scholarshipId: string, stepId: string): ChecklistState {
  const current = new Set(map[scholarshipId] || [])
  if (current.has(stepId)) current.delete(stepId)
  else current.add(stepId)
  return { ...map, [scholarshipId]: Array.from(current) }
}

export function checklistProgress(completed: string[] | undefined): { done: number; total: number; percent: number } {
  const total = DEFAULT_CHECKLIST.length
  const done = (completed || []).filter((id) => DEFAULT_CHECKLIST.some((s) => s.id === id)).length
  return { done, total, percent: Math.round((done / total) * 100) }
}
