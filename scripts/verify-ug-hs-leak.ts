/**
 * Undergrad profiles must not get high-school senior entry awards as strong matches/pins.
 */
import { buildProfileSearchPlan } from '../src/lib/profileSearch'
import { scoreBreakdown, isHighSchoolSeniorEntry } from '../src/lib/scoring'
import { CATALOG } from '../src/data/catalog'

const seniorIds = [
  'dell-scholars',
  'horatio-alger',
  'elks-mvs',
  'burger-king-scholars',
  'jackie-robinson',
  'ron-brown',
  'gates',
  'cocacola',
  'jack-kent',
]

const profiles = [
  { level: 'undergrad', major: 'any', identity: 'any', need: 'any', state: 'any' },
  { level: 'undergrad', major: 'accounting', identity: 'any', need: 'any', state: 'any' },
  { level: 'undergrad', major: 'any', identity: 'women', need: 'need', state: 'any' },
  { level: 'undergrad', major: 'any', identity: 'first-gen', need: 'need', state: 'california' },
]

let failed = 0
for (const p of profiles) {
  const plan = buildProfileSearchPlan(p, 8)
  console.log('\n===', JSON.stringify(p))
  console.log('pins:', plan.pins.map((h) => h.id).join(', ') || '(none)')

  for (const h of plan.pins) {
    const item = CATALOG.find((c) => c.id === h.id)!
    if (isHighSchoolSeniorEntry(item.tags)) {
      console.error('FAIL pinned senior-entry', h.id)
      failed++
    }
  }

  for (const id of seniorIds) {
    const item = CATALOG.find((c) => c.id === id)!
    const s = scoreBreakdown(item.tags, p).total
    console.log(' ', id, 'score', s, isHighSchoolSeniorEntry(item.tags) ? 'senior-entry' : 'ok')
    if (s >= 25) {
      console.error('  FAIL score too high for undergrad')
      failed++
    }
  }

  // State grants with HS tag may still score for CA undergrad — allowed
  const cal = scoreBreakdown(CATALOG.find((c) => c.id === 'cal-grant')!.tags, p)
  console.log('  cal-grant', cal.total, '(state ongoing — allowed)')
}

// HS student should still get senior awards
const hs = { level: 'high-school', major: 'any', identity: 'any', need: 'any', state: 'any' }
const planHs = buildProfileSearchPlan(hs, 8)
console.log('\nHS pins:', planHs.pins.map((h) => h.id).join(', '))
const coke = scoreBreakdown(CATALOG.find((c) => c.id === 'cocacola')!.tags, hs).total
console.log('HS cocacola score', coke)
if (coke < 20) {
  console.error('FAIL HS student should still match Coca-Cola')
  failed++
}

if (failed) {
  console.error(`\n${failed} failed`)
  process.exit(1)
}
console.log('\nUndergrad HS-leak checks passed')
