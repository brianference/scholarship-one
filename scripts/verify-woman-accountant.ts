/**
 * Woman + accounting must not surface AMA marketing or score-0 Hispanic awards.
 */
import { CATALOG } from '../src/data/catalog'
import { queryCatalog } from '../src/lib/catalogQuery'
import { selectTopMatches, MIN_MATCH_DISPLAY_SCORE } from '../src/lib/matchRanking'
import { scoreItem } from '../src/lib/scoring'
import { pinsFromFreeTextSearch, buildProfileSearchPlan } from '../src/lib/profileSearch'

const p = {
  level: 'undergrad',
  major: 'accounting',
  identity: 'women',
  need: 'any',
  state: 'any',
}

const ranked = queryCatalog({
  profile: p,
  listFilter: '',
  categoryId: 'all',
  onlyShort: false,
  onlyAi: false,
  shortlist: [],
  pinnedIds: buildProfileSearchPlan(p, 8).pins.map((h) => h.id),
  urgencyFilter: 'all',
  sort: 'match',
  amountBucket: 'all',
  essayFilter: 'all',
})

const top = selectTopMatches(ranked, p, 12)
console.log('Top matches:')
for (const t of top) {
  console.log(`  ${t.score}\t${t.id}\t${t.name.slice(0, 55)}`)
}

const ama = scoreItem(CATALOG.find((c) => c.id === 'ama-foundation')!.tags, p)
const hsf = scoreItem(CATALOG.find((c) => c.id === 'hispanic')!.tags, p)
const aicpa = scoreItem(CATALOG.find((c) => c.id === 'aicpa')!.tags, p)
const efwa = scoreItem(CATALOG.find((c) => c.id === 'efwa-women-accounting')!.tags, p)

console.log({ ama, hsf, aicpa, efwa, MIN_MATCH_DISPLAY_SCORE })

let failed = 0
if (ama >= 40) {
  console.error('FAIL: AMA marketing still high for accounting', ama)
  failed++
}
if (top.some((t) => t.id === 'ama-foundation')) {
  console.error('FAIL: AMA in top matches')
  failed++
}
if (top.some((t) => t.score < MIN_MATCH_DISPLAY_SCORE)) {
  console.error('FAIL: low score in top list')
  failed++
}
if (top.some((t) => t.id === 'hispanic')) {
  console.error('FAIL: HSF shown without hispanic identity')
  failed++
}
if (hsf >= MIN_MATCH_DISPLAY_SCORE && p.identity !== 'hispanic') {
  // score can be low; just must not display
  console.log('HSF score', hsf, '(hidden by lockout/floor)')
}
if (aicpa < 60) {
  console.error('FAIL: AICPA should be strong', aicpa)
  failed++
}
if (!top.some((t) => ['aicpa', 'deloitte', 'efwa-women-accounting', 'ascpa-women', 'pwc-scholarships'].includes(t.id))) {
  console.error('FAIL: expected accounting awards in top', top.map((t) => t.id))
  failed++
}

const freePins = pinsFromFreeTextSearch('woman undergraduate accounting', p, 8)
console.log('free-text pins', freePins.map((h) => h.id))
if (freePins.some((h) => h.id === 'ama-foundation' || h.id === 'hispanic')) {
  console.error('FAIL: bad free-text pins')
  failed++
}

if (failed) {
  process.exit(1)
}
console.log('Woman accountant match checks passed')
