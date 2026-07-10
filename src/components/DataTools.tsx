import { useRef, useState } from 'react'
import type { BackupPayload } from '../lib/dataBackup'
import { buildBackup, downloadBackupJson, parseBackup } from '../lib/dataBackup'
import type { Profile } from '../lib/profile'
import type { ApplyStatus } from '../lib/applyStatus'
import type { SavedSearch } from '../lib/savedSearches'
import type { ChecklistState } from '../lib/checklist'

export type DataToolsProps = {
  profile: Profile
  shortlist: string[]
  applyMap: Record<string, ApplyStatus>
  notes: Record<string, string>
  checklist: ChecklistState
  savedSearches: SavedSearch[]
  recentlyViewed: string[]
  onRestore: (data: BackupPayload) => void
}

/**
 * Backup / restore local workspace data (JSON file).
 */
export function DataTools(props: DataToolsProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<string | null>(null)

  function handleExport() {
    const payload = buildBackup({
      profile: props.profile,
      shortlist: props.shortlist,
      applyMap: props.applyMap,
      notes: props.notes,
      checklist: props.checklist,
      savedSearches: props.savedSearches,
      recentlyViewed: props.recentlyViewed,
    })
    downloadBackupJson(payload)
    setStatus('Backup downloaded')
    window.setTimeout(() => setStatus(null), 2000)
  }

  function handleFile(file: File | null) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const parsed = parseBackup(String(reader.result || ''))
      if (!parsed) {
        setStatus('Invalid backup file')
        return
      }
      if (!window.confirm('Restore this backup? It will replace your current saved list, notes, and profile on this device.')) {
        return
      }
      props.onRestore(parsed)
      setStatus('Backup restored')
      window.setTimeout(() => setStatus(null), 2500)
    }
    reader.readAsText(file)
  }

  return (
    <div className="data-tools" aria-label="Backup and restore">
      <button type="button" className="btn btn-ghost" onClick={handleExport}>
        Backup data
      </button>
      <button type="button" className="btn btn-ghost" onClick={() => inputRef.current?.click()}>
        Restore backup
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        aria-label="Choose backup JSON file"
        onChange={(e) => {
          handleFile(e.target.files?.[0] || null)
          e.target.value = ''
        }}
      />
      {status ? (
        <span className="export-bar__note" role="status">
          {status}
        </span>
      ) : null}
    </div>
  )
}
