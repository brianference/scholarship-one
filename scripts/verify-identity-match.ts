/**
 * Ron Brown / Black-primary awards must not score as strong matches without Black identity.
 */
import { scoreBreakdown, isBlackPrimary } from '../src/lib/scoring'
import { buildProfileSearchPlan } from '../src/lib/profileSearch'
import { CATALOG } from '../src/data/catalog'
import { matchWhy } from '../src/lib/matchWhy'

const rb = CATALOG.find((c) => c.id === 'ron-brown')!
if (!isBlackPrimary(rb.tags)) throw new Error('ron-brown should be black-primary')

const cases: Array<{
  p: { level: string; major: string; identity: string; need: string; state: string }
  maxScore: number
  allowPin: boolean
}> = [
  {
    p: { level: 'high-school', major: 'any', identity: 'any', need: 'any', state: 'any' },
    maxScore: 20,
    allowPin: false,
  },
  {
    p: { level: 'high-school', major: 'any', identity: 'any', need: 'merit', state: 'any' },
    maxScore: 20,
    allowPin: false,
  },
  {
    p: { level: 'high-school', major: 'any', identity: 'women', need: 'any', state: 'any' },
    maxScore: 15,
    allowPin: false,
  },
  {
    p: { level: 'high-school', major: 'any', identity: 'hispanic', need: 'need', state: 'any' },
    maxScore: 15,
    allowPin: false,
  },
  {
    p: { level: 'high-school', major: 'any', identity: 'first-gen', need: 'need', state: 'any' },
    maxScore: 20,
    allowPin: false,
  },
  {
    p: { level: 'undergrad', major: 'any', identity: 'any', need: 'any', state: 'any' },
    maxScore: 10,
    allowPin: false,
  },
  {
    p: { level: 'high-school', major: 'any', identity: 'black', need: 'any', state: 'any' },
    maxScore: 100,
    allowPin: true,
  },
]

let failed = 0
for (const { p, maxScore, allowPin } of cases) {
  const bd = scoreBreakdown(rb.tags, p)
  const plan = buildProfileSearchPlan(p, 8)
  const pinned = plan.pins.some((h) => h.id === 'ron-brown')
  console.log(JSON.stringify(p), 'score', bd.total, 'pinned', pinned)
  console.log('  -', bd.penalties.map((x) => x.label).join('; ') || 'none')
  console.log('  why', matchWhy(rb.tags, p).join(' | '))

  if (bd.total > maxScore) {
    console.error(`  FAIL score ${bd.total} > max ${maxScore}`)
    failed++
  }
  if (pinned && !allowPin) {
    console.error('  FAIL should not pin Ron Brown')
    failed++
  }
  if (!pinned && allowPin && p.identity === 'black') {
    console.error('  FAIL expected Ron Brown pin for Black identity')
    failed++
  }
}

// Black identity should still score well
const good = scoreBreakdown(rb.tags, {
  level: 'high-school',
  major: 'any',
  identity: 'black',
  need: 'any',
  state: 'any',
})
if (good.total < 45) {
  console.error('FAIL black identity Ron Brown too low', good.total)
  failed++
}

if (failed) {
  console.error(`\n${failed} failed`)
  process.exit(1)
}
console.log('\nIdentity match checks passed')
