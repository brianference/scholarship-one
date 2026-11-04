/**
 * When signed in, mirror the workspace to the account:
 *  - on sign-in, merge local data with the account (nothing is dropped: saves and
 *    hidden awards are unioned, the newer profile edit wins) and push the result up
 *  - afterwards, debounce-mirror saves, hidden awards, reminders and profile changes
 *    and delete rows that were removed.
 * Renders nothing. Signed out, it is inert.
 *
 * The profile and hidden list are optional channels: if either endpoint fails (for
 * example before its migration is applied) the saved-scholarship sync still works,
 * and that channel is simply not mirrored until the next sign-in.
 */
import { useEffect, useRef } from 'react'
import { useAccount } from '../state/account'
import { useScholarship } from '../state/ScholarshipContext'
import { findAward } from '../lib/awards'
import { mergeFindState, type FindState } from '../lib/newForYou'
import {
  addHiddenIds,
  deleteSave,
  getAccountProfile,
  getFindState,
  putFindState,
  getHiddenIds,
  getSaves,
  putAccountProfile,
  putSaves,
  removeHiddenId,
  type SaveUpsert,
} from '../lib/accountApi'
import type { ApplyStatus } from '../lib/applyStatus'
import { coerceProfile, isDefaultProfile } from '../lib/profile'
import { isRemindDate } from '../lib/reminders'

/**
 * Deadline snapshot for the reminder job, from the catalog or a verified web find. Undefined when the
 * award is unknown on this device, so the server keeps the deadline it already has.
 */
const deadlineOf = (id: string): string | undefined => findAward(id)?.deadline
const MIRROR_DEBOUNCE_MS = 900
/** Server limits for /api/hidden: slug-shaped ids, at most 500 per request. */
const HIDDEN_ID_RE = /^[a-z0-9][a-z0-9_-]*$/i
const HIDDEN_BATCH = 500

export function AccountSync() {
  const account = useAccount()
  const s = useScholarship()
  const hydratedRef = useRef(false)
  const lastSyncedRef = useRef<Set<string>>(new Set())
  const hiddenSyncedRef = useRef<Set<string> | null>(null)
  /** Profile edit time the server is known to hold; null when the profile channel is down. */
  const profileSyncedAtRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** What the account is known to hold for find-state; null while that channel is down. */
  const findSyncedRef = useRef<FindState | null>(null)
  const findTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** Reminder map as of the last mirror, to tell "cleared here" from "never set here". */
  const lastRemindRef = useRef<Record<string, string>>({})
  const hiddenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const profileTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Build the server payload for the current shortlist.
  function currentSaves(): SaveUpsert[] {
    return s.shortlist.map((id) => ({
      id,
      notes: s.notes[id] || '',
      checklist: s.checklist[id] || [],
      apply_status: s.applyMap[id] || 'none',
      deadline: deadlineOf(id),
      // '' clears on the server; null keeps it. Only clear what this device cleared, so a
      // stale open tab cannot wipe a reminder set on another device.
      remind_on: s.remindMap[id] ?? (lastRemindRef.current[id] ? '' : undefined),
    }))
  }

  // Sign-in: merge account data with local, load the merge into context, push it up.
  useEffect(() => {
    if (account.status !== 'signed-in') {
      hydratedRef.current = false
      hiddenSyncedRef.current = null
      profileSyncedAtRef.current = null
      findSyncedRef.current = null
      return
    }
    if (hydratedRef.current) return
    let alive = true
    ;(async () => {
      try {
        const [savesRes, profileRes, hiddenRes, findRes] = await Promise.allSettled([
          getSaves(),
          getAccountProfile(),
          getHiddenIds(),
          getFindState(),
        ])
        if (!alive) return
        // Saves are the core channel: without them nothing is mirrored this session.
        if (savesRes.status !== 'fulfilled') return
        const saves = savesRes.value.saves

        const acctById = new Map(saves.map((r) => [r.id, r]))
        const mergedIds = Array.from(new Set([...s.shortlist, ...saves.map((r) => r.id)]))

        const applyMap: Record<string, ApplyStatus> = {}
        const notes: Record<string, string> = {}
        const checklist: Record<string, string[]> = {}
        const remindMap: Record<string, string> = {}
        for (const id of mergedIds) {
          const acct = acctById.get(id)
          const localStatus = s.applyMap[id]
          applyMap[id] = (localStatus && localStatus !== 'none' ? localStatus : (acct?.applyStatus as ApplyStatus)) || 'none'
          notes[id] = s.notes[id] || acct?.notes || ''
          const localList = s.checklist[id]
          checklist[id] = localList && localList.length ? localList : acct?.checklist || []
          const remind = s.remindMap[id] || acct?.remindOn || ''
          if (isRemindDate(remind)) remindMap[id] = remind
        }

        // Hidden: union, so an award hidden on any device stays hidden everywhere.
        const hiddenOk = hiddenRes.status === 'fulfilled'
        const acctHidden = hiddenOk ? hiddenRes.value.ids : []
        const mergedHidden = Array.from(new Set([...s.hidden, ...acctHidden]))

        // Profile: the newer edit wins. A device whose profile was never stamped
        // (edited before v5.3.0) predates any server row, so the server copy wins over it.
        let profileOverride: { value: typeof s.profile; updatedAt: number } | undefined
        let pushProfileAt: number | null = null
        let profileSyncedAt: number | null = null
        if (profileRes.status === 'fulfilled') {
          const serverProfile = coerceProfile(profileRes.value.profile)
          const serverAt = profileRes.value.updatedAt
          const localAt = s.profileUpdatedAt
          const localHasEdit = localAt > 0 || !isDefaultProfile(s.profile)
          if (!serverProfile) {
            // Nothing on the server yet: upload the local profile if the student set one.
            if (localHasEdit) {
              pushProfileAt = localAt > 0 ? localAt : Date.now()
              // Stamp an unstamped local profile with the upload time so both sides agree.
              if (localAt === 0) profileOverride = { value: s.profile, updatedAt: pushProfileAt }
            }
            profileSyncedAt = pushProfileAt ?? 0
          } else if (localAt > serverAt) {
            pushProfileAt = localAt
            profileSyncedAt = localAt
          } else if (localAt === serverAt) {
            profileSyncedAt = serverAt
          } else {
            // Server is newer (or local was never stamped): adopt it, keeping its timestamp.
            profileOverride = { value: serverProfile, updatedAt: serverAt }
            profileSyncedAt = serverAt
          }
        }

        // Find-new state: earliest first tap, latest tap, union of looked-at awards.
        const mergedFind = findRes.status === 'fulfilled' ? mergeFindState(s.findState, findRes.value) : null

        s.applyAccountMerge({
          shortlist: mergedIds,
          applyMap,
          notes,
          checklist,
          hidden: mergedHidden,
          remindMap,
          profile: profileOverride,
        })

        if (mergedFind) s.applyFindStateMerge(mergedFind)

        await putSaves(
          mergedIds.map((id) => ({
            id,
            notes: notes[id] || '',
            checklist: checklist[id] || [],
            apply_status: applyMap[id] || 'none',
            deadline: deadlineOf(id),
            remind_on: remindMap[id] || '',
          })),
        )
        lastSyncedRef.current = new Set(mergedIds)
        lastRemindRef.current = { ...remindMap }
        // Mirroring is armed as soon as the core saves channel is in sync; the optional
        // pushes below can fail without switching it off.
        hydratedRef.current = true

        if (hiddenOk) {
          // Sync only what the server will accept; anything else stays local, not retried forever.
          const missingOnServer = mergedHidden.filter((id) => !acctHidden.includes(id) && HIDDEN_ID_RE.test(id))
          let pushed = true
          for (let i = 0; i < missingOnServer.length; i += HIDDEN_BATCH) {
            try {
              await addHiddenIds(missingOnServer.slice(i, i + HIDDEN_BATCH))
            } catch {
              pushed = false
              break
            }
          }
          // If the push failed, leave the synced set at what the server has so the next change retries.
          hiddenSyncedRef.current = new Set(pushed ? mergedHidden : acctHidden)
        }
        if (mergedFind && findRes.status === 'fulfilled') {
          const server = findRes.value
          const behind =
            mergedFind.seenIds.some((id) => !server.seenIds.includes(id)) ||
            mergedFind.checkedAt > server.checkedAt ||
            (mergedFind.firstCheckedAt > 0 && mergedFind.firstCheckedAt !== server.firstCheckedAt)
          try {
            if (behind) await putFindState(mergedFind)
            findSyncedRef.current = mergedFind
          } catch {
            findSyncedRef.current = server
          }
        }
        if (pushProfileAt !== null && pushProfileAt > 0) {
          try {
            await putAccountProfile(profileOverride?.value ?? s.profile, pushProfileAt)
            profileSyncedAtRef.current = profileSyncedAt
          } catch {
            // Leave the profile channel armed at the server's time so the next edit retries.
            profileSyncedAtRef.current = profileRes.status === 'fulfilled' ? profileRes.value.updatedAt : null
          }
        } else {
          profileSyncedAtRef.current = profileSyncedAt
        }
      } catch {
        // best-effort; the app keeps working locally
      }
    })()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account.status])

  // Mirror subsequent saves changes (debounced), including deletions.
  useEffect(() => {
    if (account.status !== 'signed-in' || !hydratedRef.current) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const current = new Set(s.shortlist)
      const removed = [...lastSyncedRef.current].filter((id) => !current.has(id))
      putSaves(currentSaves()).catch(() => {})
      lastRemindRef.current = { ...s.remindMap }
      for (const id of removed) deleteSave(id).catch(() => {})
      lastSyncedRef.current = current
    }, MIRROR_DEBOUNCE_MS)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account.status, s.shortlist, s.notes, s.checklist, s.applyMap, s.remindMap])

  // Mirror hidden awards: add what is new, restore what was un-hidden. The synced set only
  // advances after a call succeeds, so a failed request is retried on the next change.
  useEffect(() => {
    if (account.status !== 'signed-in' || !hydratedRef.current || !hiddenSyncedRef.current) return
    if (hiddenTimerRef.current) clearTimeout(hiddenTimerRef.current)
    hiddenTimerRef.current = setTimeout(() => {
      const synced = hiddenSyncedRef.current
      if (!synced) return
      const added = s.hidden.filter((id) => !synced.has(id))
      const removed = [...synced].filter((id) => !s.hidden.includes(id))
      if (added.length) {
        addHiddenIds(added)
          .then(() => added.forEach((id) => hiddenSyncedRef.current?.add(id)))
          .catch(() => {})
      }
      for (const id of removed) {
        removeHiddenId(id)
          .then(() => hiddenSyncedRef.current?.delete(id))
          .catch(() => {})
      }
    }, MIRROR_DEBOUNCE_MS)
    return () => {
      if (hiddenTimerRef.current) clearTimeout(hiddenTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account.status, s.hidden])

  // Mirror find-new state: the latest tap and any awards newly looked at.
  useEffect(() => {
    if (account.status !== 'signed-in' || !hydratedRef.current || !findSyncedRef.current) return
    if (findTimerRef.current) clearTimeout(findTimerRef.current)
    findTimerRef.current = setTimeout(() => {
      const synced = findSyncedRef.current
      if (!synced) return
      const next = s.findState
      const newSeen = next.seenIds.filter((id) => !synced.seenIds.includes(id))
      if (!newSeen.length && next.checkedAt <= synced.checkedAt && next.firstCheckedAt === synced.firstCheckedAt) return
      putFindState({ firstCheckedAt: next.firstCheckedAt || undefined, checkedAt: next.checkedAt || undefined, seenIds: newSeen })
        .then(() => {
          findSyncedRef.current = next
        })
        .catch(() => {})
    }, MIRROR_DEBOUNCE_MS)
    return () => {
      if (findTimerRef.current) clearTimeout(findTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account.status, s.findState])

  // Mirror profile edits. Only a stamped local edit newer than the server copy is sent.
  useEffect(() => {
    if (account.status !== 'signed-in' || !hydratedRef.current) return
    if (profileSyncedAtRef.current === null) return
    if (s.profileUpdatedAt <= profileSyncedAtRef.current) return
    if (profileTimerRef.current) clearTimeout(profileTimerRef.current)
    profileTimerRef.current = setTimeout(() => {
      const at = s.profileUpdatedAt
      putAccountProfile(s.profile, at)
        .then((r) => {
          profileSyncedAtRef.current = Math.max(at, r.updatedAt)
        })
        .catch(() => {})
    }, MIRROR_DEBOUNCE_MS)
    return () => {
      if (profileTimerRef.current) clearTimeout(profileTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account.status, s.profile, s.profileUpdatedAt])

  return null
}
