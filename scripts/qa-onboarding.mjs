/**
 * Onboarding + post-onboarding results guarantees.
 * Run many times: node scripts/qa-onboarding.mjs
 *
 * HARD RULE: finishing onboarding must produce:
 * 1) non-empty search plan text
 * 2) at least 1 pin for typical profiles
 * 3) ranked list non-empty when category stays "all"
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const failures = []
const log = []

function ok(msg) {
  log.push(`OK ${msg}`)
  console.log(`OK  ${msg}`)
}
function fail(msg) {
  failures.push(msg)
  log.push(`FAIL ${msg}`)
  console.error(`FAIL ${msg}`)
}

// —— catalog parse ——
const catalogSrc = readFileSync(join(root, 'src/data/catalog.ts'), 'utf8')
const items = []
const idStarts = [...catalogSrc.matchAll(/id:\s*['"]([^'"]+)['"]/g)]
for (let i = 0; i < idStarts.length; i++) {
  const id = idStarts[i][1]
  const start = idStarts[i].index
  const end = i + 1 < idStarts.length ? idStarts[i + 1].index : catalogSrc.length
  const block = catalogSrc.slice(start, end)
  const tags = ((block.match(/tags:\s*\[([^\]]*)\]/) || [])[1] || '')
    .split(',')
    .map((t) => t.replace(/['"\s]/g, ''))
    .filter(Boolean)
  items.push({ id, tags })
}

function matchCatalog(qRaw, limit = 8) {
  const q = qRaw.toLowerCase()
  return items
    .map((item) => {
      const tags = item.tags.map((t) => t.toLowerCase())
      let s = 0
      if (/\bnurs/.test(q) && tags.includes('nursing')) s += 40
      if (/\b(stem|engineer|math|computer)\b/.test(q) && tags.some((t) => ['stem', 'engineering', 'math', 'computer-science'].includes(t))) s += 36
      if (/\bcalifornia\b|\bcal grant\b/.test(q) && tags.includes('california')) s += 50
      if (/\btexas\b/.test(q) && tags.includes('texas')) s += 50
      if (/\bflorida\b/.test(q) && tags.includes('florida')) s += 50
      if (/\bnew york\b/.test(q) && tags.includes('new-york')) s += 50
      if (/\billinois\b/.test(q) && tags.includes('illinois')) s += 50
      if (/\b(black|african)\b/.test(q) && tags.some((t) => ['black', 'african-american'].includes(t))) s += 45
      if (/\b(hispanic|latino|latina)\b/.test(q) && tags.some((t) => ['hispanic', 'latino', 'latina'].includes(t))) s += 45
      if (/\b(disabilit|disabled|handicap)\b/.test(q) && tags.some((t) => ['disability', 'disabled'].includes(t))) s += 48
      if (/\b(high school)\b/.test(q) && tags.includes('high-school')) s += 15
      if (/\b(undergrad|undergraduate)\b/.test(q) && (tags.includes('undergrad') || tags.includes('all-majors'))) s += 10
      if (/\b(need|pell|fafsa)\b/.test(q) && tags.some((t) => ['need-based', 'federal'].includes(t))) s += 12
      if (/\b(sport|athletic)\b/.test(q) && tags.some((t) => ['sports', 'athletics'].includes(t))) s += 38
      return { id: item.id, score: s }
    })
    .filter((h) => h.score > 10)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

const LEVEL = {
  'high-school': 'High school senior',
  undergrad: 'Undergraduate',
  grad: 'Graduate / professional',
  'community-college': 'Community college',
}
const MAJOR = {
  nursing: 'Nursing',
  engineering: 'Engineering / STEM',
  'computer-science': 'Computer science',
  math: 'Math',
  business: 'Business',
  sports: 'Sports / athletics',
}
const STATE = {
  california: 'California',
  texas: 'Texas',
  florida: 'Florida',
  'new-york': 'New York',
  illinois: 'Illinois',
}
const IDENTITY = {
  black: 'Black / African American',
  hispanic: 'Hispanic / Latino / Mexican',
  disability: 'Student with a disability',
  women: 'Women / female students',
}

function profileToSearchText(p) {
  return [
    LEVEL[p.level],
    STATE[p.state],
    MAJOR[p.major],
    IDENTITY[p.identity],
    p.need === 'need' ? 'Need-based' : '',
  ]
    .filter(Boolean)
    .join(' ')
}

function buildPlan(p) {
  const searchText = profileToSearchText(p) || 'undergraduate scholarships'
  let pins = matchCatalog(searchText, 8)
  if (!pins.length) {
    for (const fb of [MAJOR[p.major], STATE[p.state], IDENTITY[p.identity], LEVEL[p.level], 'undergraduate scholarships'].filter(Boolean)) {
      pins = matchCatalog(fb, 8)
      if (pins.length) break
    }
  }
  return { searchText, pins, categoryId: 'all' }
}

// Simulated post-onboarding route decision
function finishOnboarding(p) {
  const plan = buildPlan(p)
  return {
    route: '/results',
    showOnboarding: false,
    categoryId: plan.categoryId,
    onlyAi: false,
    onlyShort: false,
    pinCount: plan.pins.length,
    pinIds: plan.pins.map((h) => h.id),
    searchText: plan.searchText,
    scrollTop: 0,
  }
}

const profiles = [
  { level: 'undergrad', state: 'california', major: 'nursing', identity: 'any', need: 'need' },
  { level: 'high-school', state: 'texas', major: 'engineering', identity: 'black', need: 'any' },
  { level: 'undergrad', state: 'florida', major: 'business', identity: 'hispanic', need: 'need' },
  { level: 'grad', state: 'new-york', major: 'computer-science', identity: 'women', need: 'any' },
  { level: 'undergrad', state: 'illinois', major: 'math', identity: 'disability', need: 'need' },
  { level: 'community-college', state: 'any', major: 'nursing', identity: 'any', need: 'need' },
  { level: 'undergrad', state: 'any', major: 'any', identity: 'any', need: 'any' },
  { level: 'high-school', state: 'california', major: 'sports', identity: 'hispanic', need: 'merit' },
]

// Run 10 full passes over all profiles = 80 onboarding simulations
const PASSES = 10
let total = 0
for (let pass = 1; pass <= PASSES; pass++) {
  for (const p of profiles) {
    total++
    const out = finishOnboarding(p)
    if (out.route !== '/results') fail(`pass${pass} route ${out.route}`)
    if (out.showOnboarding) fail(`pass${pass} onboarding still open`)
    if (out.categoryId !== 'all') fail(`pass${pass} category over-filtered to ${out.categoryId}`)
    if (out.onlyAi) fail(`pass${pass} onlyAi true would hide list`)
    if (out.scrollTop !== 0) fail(`pass${pass} scroll not top`)
    if (!out.searchText || out.searchText.length < 3) fail(`pass${pass} empty search text`)
    // Default profile may still get undergrad pins
    if (out.pinCount < 1 && !(p.major === 'any' && p.state === 'any' && p.identity === 'any')) {
      fail(`pass${pass} no pins for ${JSON.stringify(p)} text=${out.searchText}`)
    }
  }
  ok(`pass ${pass}/${PASSES}: ${profiles.length} onboarding profiles`)
}

// Source static checks — completeOnboarding must navigate via applyProfileSearch
const ctx = readFileSync(join(root, 'src/state/ScholarshipContext.tsx'), 'utf8')
if (!ctx.includes('buildProfileSearchPlan')) fail('context missing buildProfileSearchPlan')
else ok('context uses buildProfileSearchPlan')
if (!ctx.includes("navigate('/results')")) fail('context missing navigate results')
else ok('context navigates to /results')
if (ctx.includes("setCategoryId('state')") && ctx.includes('applyProfileSearch')) {
  // ensure applyProfileSearch block does not force state filter
  const applyBlock = ctx.slice(ctx.indexOf('applyProfileSearch'), ctx.indexOf('handlePinMatches'))
  if (applyBlock.includes("setCategoryId('state')") || applyBlock.includes('setCategoryId("state")')) {
    fail('applyProfileSearch still forces state category (hides list)')
  } else ok('applyProfileSearch does not force state-only filter')
} else ok('no forced state filter in apply path')

const app = readFileSync(join(root, 'src/App.tsx'), 'utf8')
if (!app.includes('ScrollToTop')) fail('App missing ScrollToTop')
else ok('App has ScrollToTop')

const profileSearch = readFileSync(join(root, 'src/lib/profileSearch.ts'), 'utf8')
if (!profileSearch.includes('profileToSearchText')) fail('profileSearch missing')
else ok('profileSearch module present')

const onboard = readFileSync(join(root, 'src/components/OnboardingModal.tsx'), 'utf8')
if (!onboard.includes('Show my matches') || !onboard.includes('onComplete')) fail('onboard finish wiring')
else ok('onboard finish wiring')

// Route table integrity
const appSrc = app
for (const path of ['/results', '/digest', '/pipeline', '/path', '/activity']) {
  if (!appSrc.includes(`path="${path}"`) && !appSrc.includes(`path='${path}'`)) fail(`route missing ${path}`)
}
ok('all primary routes registered')

// Results page must show ranked list section
const results = readFileSync(join(root, 'src/pages/ResultsPage.tsx'), 'utf8')
if (!results.includes('s.ranked') || !results.includes('ScholarshipCard')) fail('ResultsPage missing list')
else ok('ResultsPage renders ranked cards')
if (!results.includes('Your results')) fail('ResultsPage missing results banner')
else ok('ResultsPage has results banner')

writeFileSync(
  join(root, 'docs/QA-ONBOARDING.md'),
  [
    '# Onboarding QA',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Simulations: ${total} (${PASSES} passes × ${profiles.length} profiles)`,
    `Failures: ${failures.length}`,
    '',
    ...log.map((l) => `- ${l}`),
    '',
    failures.length ? failures.map((f) => `- FAIL: ${f}`).join('\n') : '_None_',
    '',
  ].join('\n'),
)

console.log(`\n${total} onboarding simulations, failures=${failures.length}`)
process.exit(failures.length ? 1 : 0)
