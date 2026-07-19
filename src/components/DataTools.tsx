import { useRef, useState } from 'react'
import type { BackupPayload } from '../lib/dataBackup'
import { buildBackup, downloadBackupJson, parseBackup } from '../lib/dataBackup'
import type { Profile } from '../lib/profile'
import type { ApplyStatus } from '../lib/applyStatus'
import type { SavedSearch } from '../lib/savedSearches'
import type { ChecklistState } from '../lib/checklist'
import { ConfirmDialog } from './ui/ConfirmDialog'

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

  const [pendingRestore, setPendingRestore] = useState<BackupPayload | null>(null)

  function handleFile(file: File | null) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const parsed = parseBackup(String(reader.result || ''))
      if (!parsed) {
        setStatus('Invalid backup file')
        return
      }
      // Hold the parsed payload and let ConfirmDialog gate it. window.confirm
      // blocks the main thread, cannot be styled or themed, and on mobile
      // renders as a jarring system sheet.
      setPendingRestore(parsed)
    }
    reader.readAsText(file)
  }

  return (
    <div className="data-tools" aria-label="Backup and restore">
      <ConfirmDialog
        open={!!pendingRestore}
        title="Restore this backup?"
        body="This replaces your current saved list, notes, and profile on this device. Anything not in the backup file is lost. Download a fresh backup first if you are unsure."
        confirmLabel="Replace my data"
        cancelLabel="Keep what I have"
        onCancel={() => setPendingRestore(null)}
        onConfirm={() => {
          if (pendingRestore) props.onRestore(pendingRestore)
          setPendingRestore(null)
          setStatus('Backup restored')
          window.setTimeout(() => setStatus(null), 2500)
        }}
      />
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
