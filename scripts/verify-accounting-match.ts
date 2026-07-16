/**
 * Accounting walkthrough must not surface Women's Sports Foundation as a strong match.
 */
import { buildProfileSearchPlan } from '../src/lib/profileSearch'
import { scoreBreakdown } from '../src/lib/scoring'
import { CATALOG } from '../src/data/catalog'

const wsf = CATALOG.find((c) => c.id === 'wsf-grants')!
const aicpa = CATALOG.find((c) => c.id === 'aicpa')!

const cases = [
  { level: 'high-school', state: 'any', major: 'accounting', identity: 'women', need: 'any' },
  { level: 'undergrad', state: 'any', major: 'accounting', identity: 'any', need: 'any' },
  { level: 'undergrad', state: 'any', major: 'accounting', identity: 'women', need: 'any' },
  { level: 'high-school', state: 'any', major: 'accounting', identity: 'any', need: 'any' },
]

let failed = 0
for (const p of cases) {
  const plan = buildProfileSearchPlan(p, 8)
  const pinIds = plan.pins.map((h) => h.id)
  const wsfScore = scoreBreakdown(wsf.tags, p)
  const aicpaScore = scoreBreakdown(aicpa.tags, p)
  const wsfPinned = pinIds.includes('wsf-grants')
  const aicpaPinned = pinIds.includes('aicpa') || pinIds.includes('deloitte')

  console.log('\nProfile', JSON.stringify(p))
  console.log('  search:', plan.searchText)
  console.log('  pins:', pinIds.join(', '))
  console.log('  WSF score:', wsfScore.total, wsfScore.penalties.map((x) => x.label).join('; '))
  console.log('  AICPA score:', aicpaScore.total)
  console.log('  WSF pinned?', wsfPinned, ' accounting pin?', aicpaPinned)

  if (wsfScore.total >= 50) {
    console.error('  FAIL: WSF score too high for accounting major')
    failed++
  }
  if (wsfPinned) {
    console.error('  FAIL: WSF should not be in suggested pins for accounting')
    failed++
  }
  if (aicpaScore.total <= wsfScore.total) {
    console.error('  FAIL: AICPA should outrank WSF')
    failed++
  }
  if (!aicpaPinned && p.major === 'accounting') {
    console.error('  FAIL: expected aicpa or deloitte in pins')
    failed++
  }
}

// Sports major should still get WSF as a reasonable match
const sports = { level: 'undergrad', state: 'any', major: 'sports', identity: 'women', need: 'any' }
const sportsWsf = scoreBreakdown(wsf.tags, sports)
console.log('\nSports+women WSF score:', sportsWsf.total)
if (sportsWsf.total < 40) {
  console.error('FAIL: sports major should still score WSF reasonably')
  failed++
}

if (failed) {
  console.error(`\n${failed} check(s) failed`)
  process.exit(1)
}
console.log('\nAll accounting match checks passed')
