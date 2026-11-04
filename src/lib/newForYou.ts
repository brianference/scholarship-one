/**
 * "New for you": awards that entered the app after the student first used Find new scholarships
 * and that they have not opened, saved or hidden yet. Ranked with the same gates as Top matches
 * so every row carries the same match percentage.
 */
import type { AwardBase } from '../data/catalog'
import { addedAtMs } from './awards'
import { rankItem, type RankedRow } from './catalogQuery'
import { selectTopMatches } from './matchRanking'
import type { Profile } from './profile'

export type FindState = {
  /** Epoch ms of the first tap; 0 = the button was never used, so nothing is New yet. */
  firstCheckedAt: number
  /** Epoch ms of the latest tap. */
  checkedAt: number
  /** Awards opened, saved or hidden: they no longer show the New badge. */
  seenIds: string[]
}

export const EMPTY_FIND_STATE: FindState = { firstCheckedAt: 0, checkedAt: 0, seenIds: [] }

const KEY = 'scholarship-one-find-state'

export function loadFindState(): FindState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...EMPTY_FIND_STATE }
    const o = JSON.parse(raw) as Partial<FindState>
    const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0)
    return {
      firstCheckedAt: num(o.firstCheckedAt),
      checkedAt: num(o.checkedAt),
      seenIds: Array.isArray(o.seenIds) ? o.seenIds.filter((x): x is string => typeof x === 'string') : [],
    }
  } catch {
    return { ...EMPTY_FIND_STATE }
  }
}

export function saveFindState(state: FindState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* ignore quota */
  }
}

/** Merge two states (device and account): earliest first tap, latest tap, union of seen. */
export function mergeFindState(a: FindState, b: FindState): FindState {
  const nonZeroMin = (x: number, y: number) => (x && y ? Math.min(x, y) : x || y)
  return {
    firstCheckedAt: nonZeroMin(a.firstCheckedAt, b.firstCheckedAt),
    checkedAt: Math.max(a.checkedAt, b.checkedAt),
    seenIds: Array.from(new Set([...a.seenIds, ...b.seenIds])),
  }
}

/**
 * The New list. An award is New when it was added after the first tap and is unseen and not
 * hidden. Passed deadlines and weak or identity-locked fits are dropped by the same rules as
 * Top matches. Best fit first.
 */
export function selectNewForYou(
  awards: readonly AwardBase[],
  profile: Profile,
  state: FindState,
  hidden: ReadonlySet<string>,
  limit = 12,
): RankedRow[] {
  if (!state.firstCheckedAt) return []
  const seen = new Set(state.seenIds)
  const fresh = awards.filter((a) => addedAtMs(a) > state.firstCheckedAt && !seen.has(a.id) && !hidden.has(a.id))
  const rows = fresh.map((a) => rankItem(a, profile)).filter((r) => r.urg.kind !== 'passed')
  return selectTopMatches(rows, profile, limit)
}

/** How many awards entered the app after `sinceMs` and are still unseen. Used for the tap summary. */
export function countAddedSince(awards: readonly AwardBase[], sinceMs: number, seen: ReadonlySet<string>): number {
  return awards.filter((a) => addedAtMs(a) > sinceMs && !seen.has(a.id)).length
}
