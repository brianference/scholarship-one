/**
 * Unit tests for the "New for you" selection. Run: npx tsx scripts/qa-new-for-you.ts
 * Real catalog awards are used as inputs; only their addedAt and deadline are varied.
 */
import { CATALOG } from '../src/data/catalog'
import type { AwardBase } from '../src/data/catalog'
import { countAddedSince, mergeFindState, selectNewForYou, type FindState } from '../src/lib/newForYou'
import { DEFAULT_PROFILE, type Profile } from '../src/lib/profile'
import { addedAtMs } from '../src/lib/awards'

let failures = 0
function check(name: string, cond: boolean, extra = '') {
  console.log(`${cond ? 'OK  ' : 'FAIL'} ${name}${cond ? '' : extra ? ' -> ' + extra : ''}`)
  if (!cond) failures++
}

const profile: Profile = { ...DEFAULT_PROFILE, major: 'nursing', level: 'undergrad' }
const NOW = Date.now()
const DAY = 86_400_000
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10)
const future = iso(NOW + 120 * DAY)
const past = iso(NOW - 120 * DAY)

/** Pick a real award that fits the profile well, so gates other than the one under test pass. */
const fitting = (CATALOG as readonly AwardBase[]).filter((a) => a.tags.includes('nursing') && a.tags.includes('undergrad'))
check('fixture: the catalog has nursing undergrad awards', fitting.length >= 3, String(fitting.length))
const [a, b, c] = fitting
const clone = (x: AwardBase, patch: Partial<AwardBase>): AwardBase => ({ ...x, ...patch })

const FIRST = NOW - 10 * DAY
const state = (over: Partial<FindState> = {}): FindState => ({ firstCheckedAt: FIRST, checkedAt: FIRST, seenIds: [], ...over })
const none = new Set<string>()

// the baseline
check('never tapped -> nothing is New', selectNewForYou([clone(a, { addedAt: iso(NOW), deadline: future })], profile, state({ firstCheckedAt: 0 }), none).length === 0)
check('added before the first tap -> not New', selectNewForYou([clone(a, { addedAt: iso(FIRST - 5 * DAY), deadline: future })], profile, state(), none).length === 0)
const fresh = clone(a, { id: 'web-aaaaaaa1', addedAt: iso(NOW), foundAtMs: NOW - DAY, deadline: future })
const rows = selectNewForYou([fresh], profile, state(), none)
check('added after the first tap -> New', rows.length === 1 && rows[0].id === 'web-aaaaaaa1')
check('a New row carries a real match score', rows[0]?.score >= 32, String(rows[0]?.score))

// what removes a row
check('seen -> no longer New', selectNewForYou([fresh], profile, state({ seenIds: ['web-aaaaaaa1'] }), none).length === 0)
check('hidden -> not shown', selectNewForYou([fresh], profile, state(), new Set(['web-aaaaaaa1'])).length === 0)
check('deadline already passed -> not shown', selectNewForYou([clone(fresh, { deadline: past })], profile, state(), none).length === 0)
check('a poor fit is not shown', (() => {
  const weak = clone(fresh, { tags: ['business', 'grad', 'texas'] })
  return selectNewForYou([weak], profile, state(), none).length === 0
})())

// ordering and limit
const many: AwardBase[] = [a, b, c].map((x, i) => clone(x, { id: `web-0000000${i}`, addedAt: iso(NOW), foundAtMs: NOW - i * 1000, deadline: future }))
const ordered = selectNewForYou(many, profile, state(), none)
check('ordered best fit first', ordered.every((r, i) => i === 0 || ordered[i - 1].score >= r.score))
check('limit is respected', selectNewForYou(many, profile, state(), none, 2).length === 2)
check('same-day finds are told apart by exact time', (() => {
  const early = clone(a, { id: 'web-e', addedAt: iso(NOW), foundAtMs: FIRST - 1000, deadline: future })
  const late = clone(b, { id: 'web-l', addedAt: iso(NOW), foundAtMs: FIRST + 1000, deadline: future })
  const ids = selectNewForYou([early, late], profile, state(), none).map((r) => r.id)
  return ids.includes('web-l') && !ids.includes('web-e')
})())

// the tap summary
check('addedAtMs: web find uses its exact time', addedAtMs(fresh) === NOW - DAY)
check('addedAtMs: catalog entry uses its date at UTC midnight', addedAtMs(a) === Date.parse(`${a.addedAt}T00:00:00Z`))
check('countAddedSince counts only newer, unseen awards', countAddedSince([fresh, clone(b, { addedAt: iso(FIRST - 9 * DAY) })], FIRST, none) === 1)
check('countAddedSince ignores seen awards', countAddedSince([fresh], FIRST, new Set(['web-aaaaaaa1'])) === 0)

// merging device and account
const m = mergeFindState(
  { firstCheckedAt: 500, checkedAt: 900, seenIds: ['x', 'y'] },
  { firstCheckedAt: 300, checkedAt: 700, seenIds: ['y', 'z'] },
)
check('merge keeps the earliest first tap', m.firstCheckedAt === 300)
check('merge keeps the latest tap', m.checkedAt === 900)
check('merge unions seen ids', m.seenIds.slice().sort().join() === 'x,y,z')
check('merge ignores a zero first tap', mergeFindState({ firstCheckedAt: 0, checkedAt: 0, seenIds: [] }, { firstCheckedAt: 300, checkedAt: 300, seenIds: [] }).firstCheckedAt === 300)

console.log(`\n${failures === 0 ? 'ALL CLEAN' : failures + ' FAILURES'}`)
process.exit(failures === 0 ? 0 : 1)
