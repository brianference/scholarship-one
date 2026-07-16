/**
 * Undergrad profile must not surface high-school-primary awards as strong suggestions.
 */
import { buildProfileSearchPlan } from '../src/lib/profileSearch'
import { scoreBreakdown } from '../src/lib/scoring'
import { CATALOG } from '../src/data/catalog'
import { matchWhy } from '../src/lib/matchWhy'

/** High school entry awards — not for currently enrolled undergrads. */
function isHsPrimary(tags: readonly string[]): boolean {
  const t = tags.map((x) => x.toLowerCase())
  return (
    t.includes('high-school') &&
    !t.includes('undergrad') &&
    !t.includes('grad') &&
    !t.includes('community-college')
  )
}

function levelTags(tags: readonly string[]): string {
  return tags.filter((t) => ['high-school', 'undergrad', 'grad', 'all-majors', 'community-college'].includes(t)).join(',')
}

const profiles = [
  { level: 'undergrad', major: 'any', identity: 'any', need: 'any', state: 'any' },
  { level: 'undergrad', major: 'any', identity: 'black', need: 'any', state: 'any' },
  { level: 'undergrad', major: 'any', identity: 'women', need: 'need', state: 'any' },
  { level: 'undergrad', major: 'accounting', identity: 'black', need: 'any', state: 'any' },
  { level: 'undergrad', major: 'any', identity: 'first-gen', need: 'need', state: 'california' },
]

let failed = 0
for (const p of profiles) {
  const plan = buildProfileSearchPlan(p, 8)
  console.log('\n===', JSON.stringify(p))
  console.log('search:', plan.searchText)
  for (const h of plan.pins) {
    const item = CATALOG.find((c) => c.id === h.id)!
    const bd = scoreBreakdown(item.tags, p)
    const flag = isHsPrimary(item.tags) ? 'HS-PRIMARY' : item.tags.includes('high-school') ? 'HAS-HS' : 'no-hs'
    console.log('  pin', flag, bd.total, h.id, levelTags(item.tags))
    if (isHsPrimary(item.tags)) {
      console.error('  FAIL: HS-primary award pinned for undergrad')
      failed++
    }
  }
  for (const id of ['cocacola', 'jack-kent', 'ron-brown', 'gates', 'jackie-robinson', 'dell-scholars', 'elks-mvs']) {
    const item = CATALOG.find((c) => c.id === id)!
    const bd = scoreBreakdown(item.tags, p)
    const why = matchWhy(item.tags, p)
    console.log(
      '  score',
      id,
      bd.total,
      isHsPrimary(item.tags) ? 'HS-PRIMARY' : '',
      levelTags(item.tags),
      'why:',
      why.join(' | ') || '(none)',
      bd.penalties.map((x) => x.label).join(',') || '',
    )
    if (isHsPrimary(item.tags) && bd.total >= 40) {
      console.error(`  FAIL: ${id} scores ${bd.total} for undergrad (HS-primary should stay low)`)
      failed++
    }
    if (isHsPrimary(item.tags) && why.some((w) => /undergrad/i.test(w))) {
      console.error(`  FAIL: ${id} claims undergrad fit`)
      failed++
    }
  }
}

if (failed) {
  console.error(`\n${failed} check(s) failed`)
  process.exit(1)
}
console.log('\nLevel checks done (may still need stronger penalties if failures above)')
