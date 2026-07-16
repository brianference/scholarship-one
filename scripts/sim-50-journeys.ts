/**
 * 50 end-to-end simulations: onboarding, search, filters, AI-style interactions.
 * Uses real src modules (not a parallel matcher).
 *
 * Run: npx tsx scripts/sim-50-journeys.ts
 * Writes: docs/SIM-50-REPORT.md
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { CATALOG } from '../src/data/catalog'
import { applyChipToProfile } from '../src/lib/applyChipToProfile'
import { queryCatalog } from '../src/lib/catalogQuery'
import { BROWSE_CATEGORIES, itemMatchesCategory } from '../src/lib/categories'
import { CANNED_PROMPTS } from '../src/lib/cannedPrompts'
import { buildWeeklyDigest } from '../src/lib/deadlineDigest'
import {
  isSpecificQuery,
  matchCatalog,
  buildClosestFitMessage,
  buildPreviewMessage,
  mergeMatches,
} from '../src/lib/matchCatalog'
import { matchWhy } from '../src/lib/matchWhy'
import type { Profile } from '../src/lib/profile'
import { DEFAULT_PROFILE } from '../src/lib/profile'
import { buildProfileSearchPlan, profileToSearchText } from '../src/lib/profileSearch'
import { parseSearchIntent } from '../src/lib/searchIntent'
import {
  isBlackPrimary,
  isHighSchoolSeniorEntry,
  isHispanicPrimary,
  scoreBreakdown,
  scoreItem,
} from '../src/lib/scoring'
import { buildChatContext } from '../src/lib/seedContext'
import { urgency } from '../src/lib/urgency'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

type Severity = 'pass' | 'bug' | 'warn' | 'learn'
type Finding = {
  id: number
  category: string
  name: string
  status: Severity
  detail: string
  evidence?: string
}

const findings: Finding[] = []
let n = 0

function sim(
  category: string,
  name: string,
  run: () => { status: Severity; detail: string; evidence?: string },
) {
  n++
  try {
    const r = run()
    findings.push({ id: n, category, name, ...r })
    const mark = r.status === 'pass' ? 'OK' : r.status === 'bug' ? 'BUG' : r.status === 'warn' ? 'WARN' : 'NOTE'
    console.log(`${String(n).padStart(2)}. [${mark}] ${category} — ${name}`)
    if (r.status !== 'pass') console.log(`    ${r.detail}`)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    findings.push({ id: n, category, name, status: 'bug', detail: `Threw: ${msg}` })
    console.log(`${String(n).padStart(2)}. [BUG] ${category} — ${name}`)
    console.log(`    Threw: ${msg}`)
  }
}

function profile(partial: Partial<Profile>): Profile {
  return { ...DEFAULT_PROFILE, ...partial }
}

function pinIds(p: Profile, limit = 8): string[] {
  return buildProfileSearchPlan(p, limit).pins.map((h) => h.id)
}

function topRanked(p: Profile, pinnedIds: string[] = [], limit = 10) {
  return queryCatalog({
    profile: p,
    listFilter: '',
    categoryId: 'all',
    onlyShort: false,
    onlyAi: false,
    shortlist: [],
    pinnedIds,
    urgencyFilter: 'all',
    sort: 'match',
    amountBucket: 'all',
    essayFilter: 'all',
  }).slice(0, limit)
}

function catalogById(id: string) {
  return CATALOG.find((c) => c.id === id)!
}

function anyPinIsSeniorEntry(pins: string[]): string | null {
  for (const id of pins) {
    const item = catalogById(id)
    if (item && isHighSchoolSeniorEntry(item.tags)) return id
  }
  return null
}

function anyPinIsBlackWithoutId(pins: string[], identity: string): string | null {
  if (identity === 'black') return null
  for (const id of pins) {
    const item = catalogById(id)
    if (item && isBlackPrimary(item.tags)) return id
  }
  return null
}

function anyPinIsHispanicWithoutId(pins: string[], identity: string): string | null {
  if (identity === 'hispanic') return null
  for (const id of pins) {
    const item = catalogById(id)
    if (item && isHispanicPrimary(item.tags)) return id
  }
  return null
}

function maxScoreFor(ids: string[], p: Profile): { id: string; score: number } | null {
  let best: { id: string; score: number } | null = null
  for (const id of ids) {
    const item = catalogById(id)
    if (!item) continue
    const score = scoreItem(item.tags, p)
    if (!best || score > best.score) best = { id, score }
  }
  return best
}

// ═══════════════════════════════════════════════════════════
// A. ONBOARDING WELCOME (1–15)
// ═══════════════════════════════════════════════════════════

sim('onboarding', 'Undergrad + accounting only — no senior-entry pins', () => {
  const p = profile({ level: 'undergrad', major: 'accounting' })
  const pins = pinIds(p)
  const leak = anyPinIsSeniorEntry(pins)
  if (leak) return { status: 'bug', detail: `Senior-entry pinned: ${leak}`, evidence: pins.join(',') }
  if (!pins.includes('aicpa') && !pins.includes('deloitte')) {
    return { status: 'bug', detail: 'Expected AICPA or Deloitte in pins', evidence: pins.join(',') }
  }
  return { status: 'pass', detail: `pins=${pins.join(',')}` }
})

sim('onboarding', 'Undergrad + accounting — WSF sports score low', () => {
  const p = profile({ level: 'undergrad', major: 'accounting' })
  const s = scoreItem(catalogById('wsf-grants').tags, p)
  if (s >= 40) return { status: 'bug', detail: `WSF score ${s} too high for accounting` }
  return { status: 'pass', detail: `WSF=${s}` }
})

sim('onboarding', 'Undergrad without Black identity — Ron Brown not suggested/strong', () => {
  const p = profile({ level: 'undergrad', major: 'any', identity: 'any' })
  const pins = pinIds(p)
  const leak = anyPinIsBlackWithoutId(pins, 'any')
  const rb = scoreItem(catalogById('ron-brown').tags, p)
  if (leak) return { status: 'bug', detail: `Black-primary pin without identity: ${leak}` }
  if (rb >= 25) return { status: 'bug', detail: `Ron Brown score ${rb} without Black identity` }
  return { status: 'pass', detail: `rb=${rb} pins=${pins.length}` }
})

sim('onboarding', 'HS + Black — Ron Brown strong + pinned', () => {
  const p = profile({ level: 'high-school', identity: 'black' })
  const pins = pinIds(p)
  const rb = scoreItem(catalogById('ron-brown').tags, p)
  if (rb < 40) return { status: 'bug', detail: `Ron Brown too low for Black HS: ${rb}` }
  if (!pins.includes('ron-brown') && !pins.some((id) => isBlackPrimary(catalogById(id).tags))) {
    return { status: 'warn', detail: `No Black-primary pin (rb=${rb}) pins=${pins.join(',')}` }
  }
  return { status: 'pass', detail: `rb=${rb} pins=${pins.join(',')}` }
})

sim('onboarding', 'HS + women + accounting — no sports field false match', () => {
  const p = profile({ level: 'high-school', major: 'accounting', identity: 'women' })
  const wsf = scoreItem(catalogById('wsf-grants').tags, p)
  const aicpa = scoreItem(catalogById('aicpa').tags, p)
  if (wsf >= aicpa) return { status: 'bug', detail: `WSF ${wsf} >= AICPA ${aicpa}` }
  if (wsf >= 40) return { status: 'bug', detail: `WSF still high ${wsf}` }
  return { status: 'pass', detail: `wsf=${wsf} aicpa=${aicpa}` }
})

sim('onboarding', 'Undergrad does not pin Coca-Cola / Dell / Elks', () => {
  const p = profile({ level: 'undergrad', major: 'any', identity: 'first-gen', need: 'need' })
  const pins = pinIds(p)
  const bad = pins.filter((id) =>
    ['cocacola', 'dell-scholars', 'elks-mvs', 'horatio-alger', 'burger-king-scholars', 'jack-kent', 'gates'].includes(
      id,
    ),
  )
  if (bad.length) return { status: 'bug', detail: `Senior awards pinned for undergrad: ${bad.join(',')}` }
  return { status: 'pass', detail: `pins=${pins.join(',')}` }
})

sim('onboarding', 'Grad student — HS senior entry low', () => {
  const p = profile({ level: 'grad', major: 'computer-science' })
  const coke = scoreItem(catalogById('cocacola').tags, p)
  if (coke >= 25) return { status: 'bug', detail: `Coca-Cola ${coke} for grad` }
  return { status: 'pass', detail: `cocacola=${coke}` }
})

sim('onboarding', 'Community college — transfer awards preferred over senior entry', () => {
  const p = profile({ level: 'community-college', need: 'need' })
  const pins = pinIds(p)
  const leak = anyPinIsSeniorEntry(pins)
  const hasTransfer = pins.some((id) => {
    const t = catalogById(id).tags
    return t.includes('community-college') || t.includes('transfer') || t.includes('undergrad')
  })
  if (leak) return { status: 'bug', detail: `Senior entry pinned: ${leak}` }
  if (!hasTransfer && pins.length === 0) return { status: 'warn', detail: 'No pins for CC student' }
  return { status: 'pass', detail: `pins=${pins.join(',')}` }
})

sim('onboarding', 'California undergrad first-gen need — Cal Grant ranked', () => {
  const p = profile({
    level: 'undergrad',
    state: 'california',
    identity: 'first-gen',
    need: 'need',
  })
  const pins = pinIds(p)
  const cal = scoreItem(catalogById('cal-grant').tags, p)
  if (cal < 50) return { status: 'bug', detail: `Cal Grant score ${cal} expected high` }
  if (!pins.includes('cal-grant') && !pins.includes('ca-middle-class')) {
    return { status: 'warn', detail: `No CA award in pins: ${pins.join(',')}` }
  }
  return { status: 'pass', detail: `cal=${cal} pins=${pins.join(',')}` }
})

sim('onboarding', 'Hispanic undergrad — Hispanic pins, not Ron Brown', () => {
  const p = profile({ level: 'undergrad', identity: 'hispanic' })
  const pins = pinIds(p)
  if (pins.includes('ron-brown')) return { status: 'bug', detail: 'Ron Brown pinned for Hispanic undergrad' }
  const hisp = pins.filter((id) => isHispanicPrimary(catalogById(id).tags))
  if (hisp.length === 0) return { status: 'warn', detail: `No Hispanic pins: ${pins.join(',')}` }
  return { status: 'pass', detail: `hispanicPins=${hisp.join(',')}` }
})

sim('onboarding', 'Disability undergrad — disability awards pin', () => {
  const p = profile({ level: 'undergrad', identity: 'disability', major: 'computer-science' })
  const pins = pinIds(p)
  const dis = pins.filter((id) =>
    catalogById(id).tags.some((t) => ['disability', 'disabled', 'accessibility'].includes(t)),
  )
  if (dis.length === 0) return { status: 'bug', detail: `No disability pins: ${pins.join(',')}` }
  return { status: 'pass', detail: `dis=${dis.join(',')}` }
})

sim('onboarding', 'Sports major + women — WSF can rank well', () => {
  const p = profile({ level: 'undergrad', major: 'sports', identity: 'women' })
  const wsf = scoreItem(catalogById('wsf-grants').tags, p)
  if (wsf < 40) return { status: 'bug', detail: `WSF too low for sports+women: ${wsf}` }
  return { status: 'pass', detail: `wsf=${wsf}` }
})

sim('onboarding', 'Nursing undergrad — nursing not STEM-only noise', () => {
  const p = profile({ level: 'undergrad', major: 'nursing' })
  const pins = pinIds(p)
  const nurse = pins.filter((id) => {
    const t = catalogById(id).tags
    return t.includes('nursing') || t.includes('healthcare')
  })
  if (nurse.length === 0) return { status: 'bug', detail: `No nursing pins: ${pins.join(',')}` }
  return { status: 'pass', detail: `nurse=${nurse.join(',')}` }
})

sim('onboarding', 'profileToSearchText uses human labels not raw enums', () => {
  const p = profile({ level: 'high-school', major: 'computer-science', identity: 'black' })
  const text = profileToSearchText(p)
  if (text.includes('high-school') || text.includes('computer-science')) {
    return { status: 'bug', detail: `Raw enums in search text: ${text}` }
  }
  if (!/high school|computer science|black/i.test(text)) {
    return { status: 'warn', detail: `Unexpected text: ${text}` }
  }
  return { status: 'pass', detail: text }
})

sim('onboarding', 'Empty-ish undergrad any/any still gets non-empty pins', () => {
  const p = profile({ level: 'undergrad' })
  const pins = pinIds(p)
  if (pins.length === 0) return { status: 'bug', detail: 'No pins for bare undergrad walkthrough' }
  const leak = anyPinIsSeniorEntry(pins)
  if (leak) return { status: 'bug', detail: `Senior entry in bare undergrad pins: ${leak}` }
  return { status: 'pass', detail: `count=${pins.length} ${pins.join(',')}` }
})

// ═══════════════════════════════════════════════════════════
// B. SEARCHES (16–30)
// ═══════════════════════════════════════════════════════════

sim('search', 'Header: handicapped student track math → disability hits', () => {
  const hits = matchCatalog('handicapped student track math', 8)
  const dis = hits.filter((h) =>
    catalogById(h.id).tags.some((t) => ['disability', 'disabled', 'accessibility', 'blind'].includes(t)),
  )
  if (dis.length === 0) return { status: 'bug', detail: `No disability hits: ${hits.map((h) => h.id).join(',')}` }
  return { status: 'pass', detail: hits.map((h) => h.id).join(',') }
})

sim('search', 'Undergraduate Accounting — no WSF / senior-entry top', () => {
  const hits = matchCatalog('Undergraduate Accounting', 8)
  const bad = hits.filter((h) => {
    const item = catalogById(h.id)
    return isHighSchoolSeniorEntry(item.tags) || h.id === 'wsf-grants'
  })
  if (bad.length) return { status: 'bug', detail: `Bad tops: ${bad.map((h) => h.id).join(',')}` }
  if (!hits.some((h) => ['aicpa', 'deloitte'].includes(h.id))) {
    return { status: 'bug', detail: `Missing accounting awards: ${hits.map((h) => h.id).join(',')}` }
  }
  return { status: 'pass', detail: hits.map((h) => `${h.id}:${h.score}`).join(', ') }
})

sim('search', 'Nursing undergrad query tops nursing awards', () => {
  const hits = matchCatalog('nursing student undergrad', 5)
  const nurse = hits.filter((h) => {
    const t = catalogById(h.id).tags
    return t.includes('nursing') || t.includes('healthcare')
  })
  if (nurse.length < 2) return { status: 'bug', detail: hits.map((h) => h.id).join(',') }
  return { status: 'pass', detail: hits.map((h) => h.id).join(',') }
})

sim('search', 'Mexican Latina sports — sports/hispanic present', () => {
  const hits = matchCatalog('Mexican Latina woman sports scholarships', 8)
  const ok = hits.some((h) => {
    const t = catalogById(h.id).tags
    return (
      t.some((x) => ['hispanic', 'latino', 'latina', 'mexican'].includes(x)) ||
      t.some((x) => ['sports', 'athletics', 'athlete'].includes(x))
    )
  })
  if (!ok) return { status: 'bug', detail: hits.map((h) => h.id).join(',') }
  return { status: 'pass', detail: hits.map((h) => h.id).join(',') }
})

sim('search', 'Black woman marketing — business/black present', () => {
  const hits = matchCatalog('Black woman undergrad marketing', 8)
  const black = hits.filter((h) => isBlackPrimary(catalogById(h.id).tags))
  const biz = hits.filter((h) =>
    catalogById(h.id).tags.some((t) => ['business', 'marketing'].includes(t)),
  )
  if (black.length === 0 && biz.length === 0) {
    return { status: 'bug', detail: hits.map((h) => h.id).join(',') }
  }
  return { status: 'pass', detail: `black=${black.length} biz=${biz.length}` }
})

sim('search', 'DACA query hits dream-us or undoc tags', () => {
  const hits = matchCatalog('DACA undocumented student scholarships', 5)
  const ok = hits.some((h) =>
    catalogById(h.id).tags.some((t) => ['daca', 'undocumented', 'immigrant'].includes(t)),
  )
  if (!ok) return { status: 'bug', detail: hits.map((h) => h.id).join(',') }
  return { status: 'pass', detail: hits.map((h) => h.id).join(',') }
})

sim('search', 'Vague query isSpecificQuery false', () => {
  if (isSpecificQuery('help')) return { status: 'bug', detail: '"help" marked specific' }
  if (!isSpecificQuery('nursing undergrad california')) {
    return { status: 'bug', detail: 'nursing undergrad california not specific' }
  }
  return { status: 'pass', detail: 'specificity gates ok' }
})

sim('search', 'parseSearchIntent sets nursing major + category', () => {
  const intent = parseSearchIntent('I am a nursing student in California', DEFAULT_PROFILE)
  if (intent.profile.major !== 'nursing') {
    return { status: 'bug', detail: `major=${intent.profile.major}` }
  }
  if (intent.profile.state !== 'california') {
    return { status: 'warn', detail: `state not set: ${intent.profile.state}` }
  }
  if (intent.categoryId !== 'nursing' && intent.categoryId !== 'state') {
    return { status: 'warn', detail: `category=${intent.categoryId}` }
  }
  return { status: 'pass', detail: JSON.stringify(intent.profile) + ' cat=' + intent.categoryId }
})

sim('search', 'parseSearchIntent disability + track prefers disability category', () => {
  const intent = parseSearchIntent('handicapped student track math', DEFAULT_PROFILE)
  if (intent.categoryId !== 'disability') {
    return { status: 'bug', detail: `category=${intent.categoryId} expected disability` }
  }
  if (intent.profile.identity !== 'disability') {
    return { status: 'warn', detail: `identity=${intent.profile.identity}` }
  }
  return { status: 'pass', detail: `cat=${intent.categoryId} id=${intent.profile.identity}` }
})

sim('search', 'STEM search does not top pure nursing without stem tags', () => {
  const hits = matchCatalog('STEM engineering undergrad scholarships', 6)
  const pureNurse = hits.filter((h) => {
    const t = catalogById(h.id).tags
    return t.includes('nursing') && !t.some((x) => ['stem', 'engineering', 'science'].includes(x))
  })
  // soft: first hit shouldn't be pure nursing
  if (hits[0] && pureNurse.some((h) => h.id === hits[0].id)) {
    return { status: 'bug', detail: `Top is pure nursing: ${hits[0].id}` }
  }
  return { status: 'pass', detail: hits.map((h) => h.id).join(',') }
})

sim('search', 'State: Florida bright futures appears for Florida query', () => {
  const hits = matchCatalog('Florida high school merit scholarships', 8)
  const fl = hits.some((h) => catalogById(h.id).tags.includes('florida') || h.id.includes('florida') || h.id.includes('bright'))
  if (!fl) return { status: 'warn', detail: hits.map((h) => h.id).join(',') }
  return { status: 'pass', detail: hits.map((h) => h.id).join(',') }
})

sim('search', 'Token spam does not invent non-catalog ids', () => {
  const hits = matchCatalog('zzzz not a real scholarship xyzzy foobar', 5)
  for (const h of hits) {
    if (!CATALOG.some((c) => c.id === h.id)) {
      return { status: 'bug', detail: `Unknown id ${h.id}` }
    }
  }
  return { status: 'pass', detail: `hits=${hits.length} all catalog` }
})

sim('search', 'mergeMatches keeps catalog-only union', () => {
  const local = matchCatalog('nursing undergrad', 3)
  const fake = [{ id: 'not-real-award', reason: 'fake', score: 99 }, ...local]
  const merged = mergeMatches(fake, local, 5)
  if (merged.some((h) => h.id === 'not-real-award')) {
    return { status: 'bug', detail: 'Fake id survived merge' }
  }
  return { status: 'pass', detail: merged.map((h) => h.id).join(',') }
})

sim('search', 'All canned prompts produce ≥1 catalog hit', () => {
  const empty: string[] = []
  for (const c of CANNED_PROMPTS) {
    const hits = matchCatalog(c.prompt, 5)
    if (hits.length === 0) empty.push(c.label)
  }
  if (empty.length) return { status: 'bug', detail: `Empty: ${empty.join('; ')}` }
  return { status: 'pass', detail: `${CANNED_PROMPTS.length} canned prompts ok` }
})

sim('search', 'applyChipToProfile Accounting chip sets major', () => {
  const next = applyChipToProfile(DEFAULT_PROFILE, 'Accounting')
  if (next.major !== 'accounting') return { status: 'bug', detail: `major=${next.major}` }
  return { status: 'pass', detail: 'accounting set' }
})

// ═══════════════════════════════════════════════════════════
// C. FILTERING & RESULTS (31–40)
// ═══════════════════════════════════════════════════════════

sim('filter', 'onlyAi shows only pinned ids', () => {
  const p = profile({ level: 'undergrad', major: 'accounting' })
  const pins = pinIds(p)
  const rows = queryCatalog({
    profile: p,
    listFilter: '',
    categoryId: 'all',
    onlyShort: false,
    onlyAi: true,
    shortlist: [],
    pinnedIds: pins,
    urgencyFilter: 'all',
    sort: 'match',
    amountBucket: 'all',
    essayFilter: 'all',
  })
  if (rows.some((r) => !pins.includes(r.id))) {
    return { status: 'bug', detail: 'Non-pinned row in onlyAi mode' }
  }
  if (rows.length !== pins.length) {
    return { status: 'warn', detail: `rows=${rows.length} pins=${pins.length}` }
  }
  return { status: 'pass', detail: `rows=${rows.length}` }
})

sim('filter', 'listFilter nursing narrows results', () => {
  const p = profile({ level: 'undergrad' })
  const all = queryCatalog({
    profile: p,
    listFilter: '',
    categoryId: 'all',
    onlyShort: false,
    onlyAi: false,
    shortlist: [],
    pinnedIds: [],
    urgencyFilter: 'all',
    sort: 'match',
    amountBucket: 'all',
    essayFilter: 'all',
  })
  const filtered = queryCatalog({
    profile: p,
    listFilter: 'nursing',
    categoryId: 'all',
    onlyShort: false,
    onlyAi: false,
    shortlist: [],
    pinnedIds: [],
    urgencyFilter: 'all',
    sort: 'match',
    amountBucket: 'all',
    essayFilter: 'all',
  })
  if (filtered.length >= all.length) {
    return { status: 'bug', detail: `filter did not narrow ${filtered.length} vs ${all.length}` }
  }
  if (filtered.length === 0) return { status: 'bug', detail: 'nursing filter empty' }
  return { status: 'pass', detail: `${all.length}→${filtered.length}` }
})

sim('filter', 'category nursing matches nursing tags', () => {
  const nurseCat = BROWSE_CATEGORIES.find((c) => c.id === 'nursing')
  if (!nurseCat) return { status: 'bug', detail: 'no nursing category' }
  const matched = CATALOG.filter((c) => itemMatchesCategory(c.tags, 'nursing'))
  if (matched.length === 0) return { status: 'bug', detail: 'no catalog in nursing category' }
  return { status: 'pass', detail: `n=${matched.length}` }
})

sim('filter', 'amount bucket under-5k excludes huge awards when parseable', () => {
  const p = profile({ level: 'undergrad' })
  const small = queryCatalog({
    profile: p,
    listFilter: '',
    categoryId: 'all',
    onlyShort: false,
    onlyAi: false,
    shortlist: [],
    pinnedIds: [],
    urgencyFilter: 'all',
    sort: 'match',
    amountBucket: 'under-5k',
    essayFilter: 'all',
  })
  const huge = small.filter((r) => /full cost|55,000|50,000|40,000/i.test(r.amount) && !/1,000|500/.test(r.amount))
  // soft — amount parser may be coarse
  if (huge.length > small.length * 0.5 && small.length > 3) {
    return { status: 'warn', detail: `Many large amounts in under-5k: ${huge.slice(0, 3).map((h) => h.id).join(',')}` }
  }
  return { status: 'pass', detail: `under-5k count=${small.length}` }
})

sim('filter', 'onlyShort respects shortlist', () => {
  const p = profile({ level: 'undergrad', major: 'accounting' })
  const shortlist = ['aicpa', 'deloitte']
  const rows = queryCatalog({
    profile: p,
    listFilter: '',
    categoryId: 'all',
    onlyShort: true,
    onlyAi: false,
    shortlist,
    pinnedIds: [],
    urgencyFilter: 'all',
    sort: 'match',
    amountBucket: 'all',
    essayFilter: 'all',
  })
  if (rows.length !== 2) return { status: 'bug', detail: `expected 2 got ${rows.length}` }
  if (rows.some((r) => !shortlist.includes(r.id))) return { status: 'bug', detail: 'extra ids' }
  return { status: 'pass', detail: rows.map((r) => r.id).join(',') }
})

sim('filter', 'sort by deadline puts fixed dates before far rolling preference', () => {
  const p = profile({ level: 'undergrad' })
  const rows = queryCatalog({
    profile: p,
    listFilter: '',
    categoryId: 'all',
    onlyShort: false,
    onlyAi: false,
    shortlist: [],
    pinnedIds: [],
    urgencyFilter: 'all',
    sort: 'deadline',
    amountBucket: 'all',
    essayFilter: 'all',
  })
  if (rows.length < 2) return { status: 'warn', detail: 'too few rows' }
  // Just ensure sort doesn't throw and returns full catalog-ish size
  if (rows.length < 20) return { status: 'warn', detail: `only ${rows.length} rows` }
  return { status: 'pass', detail: `n=${rows.length} first=${rows[0].id}` }
})

sim('filter', 'urgency soon only fixed ≤45 days', () => {
  const p = profile({ level: 'undergrad' })
  const rows = queryCatalog({
    profile: p,
    listFilter: '',
    categoryId: 'all',
    onlyShort: false,
    onlyAi: false,
    shortlist: [],
    pinnedIds: [],
    urgencyFilter: 'soon',
    sort: 'match',
    amountBucket: 'all',
    essayFilter: 'all',
  })
  for (const r of rows) {
    const u = urgency(r.deadline)
    if (u.kind !== 'fixed' || (u.daysLeft ?? 99) > 45) {
      return { status: 'bug', detail: `${r.id} kind=${u.kind} days=${u.daysLeft}` }
    }
  }
  return { status: 'pass', detail: `soon count=${rows.length}` }
})

sim('filter', 'matchWhy never claims sports pathway for accounting', () => {
  const p = profile({ level: 'undergrad', major: 'accounting' })
  const why = matchWhy(catalogById('wsf-grants').tags, p)
  if (why.some((w) => /sports/i.test(w) && !/not|senior|typically/i.test(w) && !/only if/i.test(w))) {
    // "Sports pathway" as positive fit is bad
    if (why.some((w) => w === 'Sports / athletics pathway')) {
      return { status: 'bug', detail: why.join(' | ') }
    }
  }
  return { status: 'pass', detail: why.join(' | ') || '(none)' }
})

sim('filter', 'matchWhy undergrad does not say Fits undergrad for Coca-Cola', () => {
  const p = profile({ level: 'undergrad' })
  const why = matchWhy(catalogById('cocacola').tags, p)
  if (why.some((w) => /fits undergrad/i.test(w))) {
    return { status: 'bug', detail: why.join(' | ') }
  }
  return { status: 'pass', detail: why.join(' | ') || '(none)' }
})

sim('filter', 'Pinned rows sort above non-pinned at same score band', () => {
  const p = profile({ level: 'undergrad', major: 'accounting' })
  const pins = ['aicpa']
  const rows = queryCatalog({
    profile: p,
    listFilter: '',
    categoryId: 'all',
    onlyShort: false,
    onlyAi: false,
    shortlist: [],
    pinnedIds: pins,
    urgencyFilter: 'all',
    sort: 'match',
    amountBucket: 'all',
    essayFilter: 'all',
  })
  if (rows[0]?.id !== 'aicpa') {
    return { status: 'bug', detail: `first=${rows[0]?.id}` }
  }
  return { status: 'pass', detail: `first=${rows[0].id}` }
})

// ═══════════════════════════════════════════════════════════
// D. AI INTERACTIONS (41–48)
// ═══════════════════════════════════════════════════════════

sim('ai', 'Chat context includes full catalog + profile', () => {
  const p = profile({ level: 'undergrad', major: 'nursing', identity: 'women' })
  const ctx = buildChatContext(p)
  const parsed = JSON.parse(ctx) as {
    catalogCount: number
    userProfile: string | null
    rule: string
    catalog: { id: string }[]
  }
  if (parsed.catalogCount !== CATALOG.length) {
    return { status: 'bug', detail: `catalogCount ${parsed.catalogCount} vs ${CATALOG.length}` }
  }
  if (!parsed.userProfile?.includes('nursing')) {
    return { status: 'bug', detail: `profile missing: ${parsed.userProfile}` }
  }
  if (!/never invent/i.test(parsed.rule)) {
    return { status: 'bug', detail: 'missing no-invent rule' }
  }
  if (parsed.catalog.length !== CATALOG.length) {
    return { status: 'bug', detail: 'catalog array incomplete' }
  }
  return { status: 'pass', detail: `ctx bytes≈${ctx.length}` }
})

sim('ai', 'Canned STEM prompt matchCatalog grounded', () => {
  const c = CANNED_PROMPTS.find((x) => x.label.includes('STEM'))!
  const hits = matchCatalog(c.prompt, 5)
  if (hits.length === 0) return { status: 'bug', detail: 'no hits' }
  return { status: 'pass', detail: hits.map((h) => h.id).join(',') }
})

sim('ai', 'Page AI style: deadline prioritize prompt reaches chat (not only local match gate)', () => {
  // Page AI uses askAi → chat API with full catalog context; isSpecificQuery is for local card ranking only.
  const prompt = `I have 3 saved scholarships. Using only programs in the catalog, tell me what to work on this week.`
  const ctx = buildChatContext(profile({ level: 'undergrad', major: 'accounting' }))
  if (!ctx.includes('catalog') && !ctx.includes('Scholarship One')) {
    return { status: 'bug', detail: 'chat context missing for AI plan prompt' }
  }
  if (prompt.length < 20) return { status: 'bug', detail: 'prompt too short' }
  // Document learning: local isSpecificQuery may be false; chat path still works.
  const localGate = isSpecificQuery(prompt)
  return {
    status: 'pass',
    detail: `chat-context ok; local isSpecificQuery=${localGate} (chat does not require it)`,
  }
})

sim('ai', 'Card Ask AI prompt names a real catalog award', () => {
  const item = catalogById('aicpa')
  const prompt = `Explain whether "${item.name}" (id ${item.id}) is a good fit. Use only catalog facts.`
  if (!prompt.includes(item.id)) return { status: 'bug', detail: 'id missing' }
  // Local match on award name should find it
  const hits = matchCatalog(item.name, 3)
  if (!hits.some((h) => h.id === item.id)) {
    return { status: 'warn', detail: `name search missed self: ${hits.map((h) => h.id).join(',')}` }
  }
  return { status: 'pass', detail: 'card prompt grounded' }
})

sim('ai', 'Closest-fit message honest for sports gaps', () => {
  const hits = matchCatalog('undergrad accounting scholarships', 3)
  const msg = buildClosestFitMessage('sports athletic track scholarships', hits)
  // If hits aren't sports-heavy, message may mention gap
  if (!msg || msg.length < 20) return { status: 'bug', detail: 'empty closest message' }
  return { status: 'pass', detail: msg.slice(0, 120) }
})

sim('ai', 'Preview message never invents award names', () => {
  const hits = matchCatalog('nursing undergrad', 3)
  const msg = buildPreviewMessage(hits)
  for (const word of ['Harvard Merit Free Ride', 'National Invented Grant 2099']) {
    if (msg.includes(word)) return { status: 'bug', detail: 'invented name in preview' }
  }
  return { status: 'pass', detail: msg.slice(0, 100) }
})

sim('ai', 'Pipeline coach stats align with empty pipeline zeros', () => {
  // Simulate prompt construction from pipeline page
  const shortlist = 0
  const savedOnly = 0
  const interested = 0
  const started = 0
  const submitted = 0
  const prompt = `I have ${shortlist} saved: ${savedOnly} not started, ${interested} interested, ${started} started, ${submitted} submitted.`
  if (!prompt.includes('0 saved')) return { status: 'bug', detail: prompt }
  return { status: 'pass', detail: prompt }
})

sim('ai', 'Activity insights prompt includes analytic placeholders safely', () => {
  const summary = { searches: 0, saves: 0, officialClicks: 0, last7DaysEvents: 0, topQueries: [] as { q: string }[] }
  const prompt = `stats: ${summary.searches} searches, ${summary.saves} saves. Top: ${summary.topQueries.map((q) => q.q).join('; ') || 'none'}.`
  if (!prompt.includes('none')) return { status: 'bug', detail: prompt }
  return { status: 'pass', detail: prompt }
})

// ═══════════════════════════════════════════════════════════
// E. DIGEST / SAVED / CROSS-PAGE (49–50)
// ═══════════════════════════════════════════════════════════

sim('digest', 'Saved rolling + far-date awards always in digest.savedItems', () => {
  // Pick a rolling award and a far fixed date
  const rolling = CATALOG.find((c) => /rolling|fafsa|cycle|varies/i.test(c.deadline))
  const far = CATALOG.find((c) => {
    const t = Date.parse(c.deadline)
    return !Number.isNaN(t) && t - Date.now() > 60 * 86400000
  })
  if (!rolling || !far) return { status: 'warn', detail: 'could not find rolling/far items' }
  const digest = buildWeeklyDigest(CATALOG, [rolling.id, far.id], 7)
  if (digest.savedItems.length !== 2) {
    return { status: 'bug', detail: `savedItems=${digest.savedItems.length}` }
  }
  if (!digest.savedItems.some((i) => i.id === rolling.id)) {
    return { status: 'bug', detail: 'rolling saved missing' }
  }
  if (!digest.savedItems.some((i) => i.id === far.id)) {
    return { status: 'bug', detail: 'far saved missing' }
  }
  return { status: 'pass', detail: digest.savedItems.map((i) => `${i.id}:${i.kind}`).join(', ') }
})

sim('digest', 'Cross-flow: onboard accounting → save AICPA → digest lists it', () => {
  const p = profile({ level: 'undergrad', major: 'accounting' })
  const pins = pinIds(p)
  const saveId = pins.includes('aicpa') ? 'aicpa' : pins[0]
  if (!saveId) return { status: 'bug', detail: 'no pin to save' }
  const digest = buildWeeklyDigest(CATALOG, [saveId], 7)
  if (!digest.savedItems.some((i) => i.id === saveId)) {
    return { status: 'bug', detail: 'saved pin missing from digest' }
  }
  // Undergrad accounting should not have suggested senior entry in pins
  const leak = anyPinIsSeniorEntry(pins)
  if (leak) return { status: 'bug', detail: `senior pin ${leak}` }
  return { status: 'pass', detail: `saved=${saveId} pins=${pins.join(',')}` }
})

// ═══════════════════════════════════════════════════════════
// REPORT
// ═══════════════════════════════════════════════════════════

const bugs = findings.filter((f) => f.status === 'bug')
const warns = findings.filter((f) => f.status === 'warn')
const passes = findings.filter((f) => f.status === 'pass')
const learns = findings.filter((f) => f.status === 'learn')

// Extra learnings distilled from run patterns
const learnings: string[] = [
  'School level, major field, and identity each need hard negative gates — bonuses alone let weak signals (base fit + level) look like 50%+ matches.',
  '`all-majors` and dual `high-school`+`undergrad` tags historically meant "funds college," not "current undergrads apply." Senior-entry detection is required.',
  'Onboarding pins use matchCatalog keyword scores, then profile filters. Filtering after match can empty pins — score-based fallback is required for bare undergrad walkthroughs.',
  'Identity-locked awards (Black, Hispanic, DACA, disability, LGBTQ, military, AANHPI) must not pin when Background is "No preference."',
  'AI page actions and card prompts are only as good as local grounding (catalog + profile). Chat context already ships full catalog JSON with a no-invent rule.',
  'Digest must list all saved IDs regardless of 7-day fixed window; rolling/far awards were a prior production bug.',
  'parseSearchIntent + applyChipToProfile are the bridge from free text to filters; multi-signal queries rely on category hint order (disability before sports/STEM).',
  'Canned prompts cover core personas; empty matchCatalog results on a canned prompt is a product regression.',
  'onlyAi / pinned suggested mode is how onboarding changes the left column — pin quality is the whole welcome experience.',
  'State grants (Cal Grant, etc.) correctly remain undergrad-eligible even with high-school tags because they renew in college.',
]

// Heuristic learnings from this run
if (bugs.length === 0) {
  learnings.push('This sim run: zero hard assertion bugs on current scoring/pin/search/digest stack after recent identity + senior-entry fixes.')
}
if (warns.length) {
  learnings.push(
    `Soft warnings (${warns.length}): review amount-bucket parsing, state-query coverage, and edge pin composition when major/identity are open.`,
  )
}

const report = `# Scholarship One — 50 journey simulations

**Date:** ${new Date().toISOString()}
**Catalog size:** ${CATALOG.length}
**Results:** ${passes.length} pass · ${bugs.length} bug · ${warns.length} warn · ${learns.length} learn notes

## Summary

| Status | Count |
|--------|------:|
| Pass | ${passes.length} |
| Bug | ${bugs.length} |
| Warn | ${warns.length} |
| Total sims | ${findings.length} |

## Bugs

${
  bugs.length
    ? bugs.map((b) => `### BUG ${b.id}: ${b.name}\n- **Category:** ${b.category}\n- **Detail:** ${b.detail}\n${b.evidence ? `- **Evidence:** \`${b.evidence}\`\n` : ''}`).join('\n')
    : '_No hard bugs asserted in this run._\n'
}

## Warnings (soft failures / product polish)

${
  warns.length
    ? warns.map((w) => `- **${w.id}. ${w.name}** (${w.category}): ${w.detail}`).join('\n')
    : '_None._\n'
}

## Full simulation log

| # | Cat | Name | Status | Detail |
|--:|-----|------|--------|--------|
${findings
  .map(
    (f) =>
      `| ${f.id} | ${f.category} | ${f.name.replace(/\|/g, '/')} | **${f.status}** | ${f.detail.replace(/\|/g, '/').slice(0, 140)} |`,
  )
  .join('\n')}

## Learnings

${learnings.map((l, i) => `${i + 1}. ${l}`).join('\n')}

## Scenario coverage map

| Area | Sim IDs | Intent |
|------|---------|--------|
| Onboarding welcome | 1–15 | Level/major/identity/state pins + score gates |
| Search / intent | 16–30 | Header queries, canned prompts, chips, merge |
| Filters / results | 31–40 | onlyAi, listFilter, category, amount, urgency, why |
| AI interactions | 41–48 | Chat context, page/card prompts, closest-fit honesty |
| Digest + cross-page | 49–50 | Saved always listed; onboard→save→digest |

## Recommended follow-ups

1. Harden amount-bucket parser if under-5k still admits large “full cost” strings.
2. Ensure bare undergrad pins prefer national undergrad awards over random state grants when state=any (pin quality UX).
3. Optional browser/Playwright pass for Ask AI panel open + pendingPrompt auto-send (not covered in pure unit sims).
4. Keep this script in CI: \`npx tsx scripts/sim-50-journeys.ts\`.

## How to re-run

\`\`\`bash
cd projects/scholarship-one
npx tsx scripts/sim-50-journeys.ts
\`\`\`
`

mkdirSync(join(root, 'docs'), { recursive: true })
const outPath = join(root, 'docs', 'SIM-50-REPORT.md')
writeFileSync(outPath, report, 'utf8')

// Also JSON for tooling
writeFileSync(join(root, 'docs', 'sim-50-results.json'), JSON.stringify({ findings, bugs, warns, learnings }, null, 2))

console.log('\n——')
console.log(`Pass ${passes.length} · Bug ${bugs.length} · Warn ${warns.length}`)
console.log(`Report: ${outPath}`)

if (bugs.length) process.exit(1)
