/**
 * When signed in, mirror the saved-scholarship workspace to the account:
 *  - on sign-in, merge local saves with account rows (local fills gaps, then push up)
 *  - afterwards, debounce-mirror shortlist/notes/checklist/status changes, and
 *    delete rows that were unsaved.
 * Renders nothing. Signed out, it is inert.
 */
import { useEffect, useRef } from 'react'
import { useAccount } from '../state/account'
import { useScholarship } from '../state/ScholarshipContext'
import { buildBackup } from '../lib/dataBackup'
import { CATALOG } from '../data/catalog'
import { deleteSave, getSaves, putSaves, type SaveUpsert } from '../lib/accountApi'
import type { ApplyStatus } from '../lib/applyStatus'

const DEADLINE_BY_ID = new Map<string, string>(CATALOG.map((c) => [c.id, c.deadline]))
const MIRROR_DEBOUNCE_MS = 900

export function AccountSync() {
  const account = useAccount()
  const s = useScholarship()
  const hydratedRef = useRef(false)
  const lastSyncedRef = useRef<Set<string>>(new Set())
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Build the server payload for the current shortlist.
  function currentSaves(): SaveUpsert[] {
    return s.shortlist.map((id) => ({
      id,
      notes: s.notes[id] || '',
      checklist: s.checklist[id] || [],
      apply_status: s.applyMap[id] || 'none',
      deadline: DEADLINE_BY_ID.get(id) || '',
    }))
  }

  // Sign-in: merge account rows with local, load merged into context, push up.
  useEffect(() => {
    if (account.status !== 'signed-in') {
      hydratedRef.current = false
      return
    }
    if (hydratedRef.current) return
    let alive = true
    ;(async () => {
      try {
        const { saves } = await getSaves()
        if (!alive) return
        const acctById = new Map(saves.map((r) => [r.id, r]))
        const mergedIds = Array.from(new Set([...s.shortlist, ...saves.map((r) => r.id)]))

        const applyMap: Record<string, ApplyStatus> = {}
        const notes: Record<string, string> = {}
        const checklist: Record<string, string[]> = {}
        for (const id of mergedIds) {
          const acct = acctById.get(id)
          const localStatus = s.applyMap[id]
          applyMap[id] = (localStatus && localStatus !== 'none' ? localStatus : (acct?.applyStatus as ApplyStatus)) || 'none'
          notes[id] = s.notes[id] || acct?.notes || ''
          const localList = s.checklist[id]
          checklist[id] = localList && localList.length ? localList : acct?.checklist || []
        }

        s.restoreBackup(
          buildBackup({
            profile: s.profile,
            shortlist: mergedIds,
            applyMap,
            notes,
            checklist,
            savedSearches: s.savedSearches,
            recentlyViewed: s.recent,
          }),
        )

        await putSaves(
          mergedIds.map((id) => ({
            id,
            notes: notes[id] || '',
            checklist: checklist[id] || [],
            apply_status: applyMap[id] || 'none',
            deadline: DEADLINE_BY_ID.get(id) || '',
          })),
        )
        lastSyncedRef.current = new Set(mergedIds)
        hydratedRef.current = true
      } catch {
        // best-effort; the app keeps working locally
      }
    })()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account.status])

  // Mirror subsequent changes (debounced), including deletions.
  useEffect(() => {
    if (account.status !== 'signed-in' || !hydratedRef.current) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const current = new Set(s.shortlist)
      const removed = [...lastSyncedRef.current].filter((id) => !current.has(id))
      putSaves(currentSaves()).catch(() => {})
      for (const id of removed) deleteSave(id).catch(() => {})
      lastSyncedRef.current = current
    }, MIRROR_DEBOUNCE_MS)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account.status, s.shortlist, s.notes, s.checklist, s.applyMap])

  return null
}
