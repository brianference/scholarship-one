import type { Profile } from './profile'
import type { ApplyStatus } from './applyStatus'
import type { SavedSearch } from './savedSearches'
import type { ChecklistState } from './checklist'

export type BackupPayload = {
  version: 1
  exportedAt: string
  profile: Profile
  shortlist: string[]
  applyMap: Record<string, ApplyStatus>
  notes: Record<string, string>
  checklist: ChecklistState
  savedSearches: SavedSearch[]
  recentlyViewed: string[]
}

export function buildBackup(data: Omit<BackupPayload, 'version' | 'exportedAt'>): BackupPayload {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    ...data,
  }
}

export function downloadBackupJson(payload: BackupPayload): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `scholarship-one-backup-${payload.exportedAt.slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function parseBackup(raw: string): BackupPayload | null {
  try {
    const data = JSON.parse(raw) as BackupPayload
    if (!data || data.version !== 1) return null
    if (!data.profile || !Array.isArray(data.shortlist)) return null
    return data
  } catch {
    return null
  }
}
