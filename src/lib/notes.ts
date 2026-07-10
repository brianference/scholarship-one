const KEY = 'scholarship-one-notes'

/** Load personal notes keyed by scholarship id. */
export function loadNotes(): Record<string, string> {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, string>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function saveNotes(map: Record<string, string>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(map))
  } catch {
    /* ignore quota */
  }
}

export function setNote(map: Record<string, string>, id: string, note: string): Record<string, string> {
  const next = { ...map }
  const trimmed = note.trim().slice(0, 2000)
  if (!trimmed) delete next[id]
  else next[id] = trimmed
  return next
}
