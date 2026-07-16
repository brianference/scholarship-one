/**
 * 120+ explicit test cases for Scholarship One.
 * Covers routing, onboarding, search, filters, catalog, storage, CSS responsive, security, copy.
 *
 * Run: node scripts/qa-cases-120.mjs
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { performance } from 'node:perf_hooks'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const cases = []
const results = []

function test(id, name, fn) {
  cases.push({ id, name, fn })
}

function read(p) {
  return readFileSync(join(root, p), 'utf8')
}

function exists(p) {
  return existsSync(join(root, p))
}

// —— Catalog parse ——
const catalogSrc = read('src/data/catalog.ts')
const items = []
const idStarts = [...catalogSrc.matchAll(/id:\s*['"]([^'"]+)['"]/g)]
for (let i = 0; i < idStarts.length; i++) {
  const id = idStarts[i][1]
  const start = idStarts[i].index
  const end = i + 1 < idStarts.length ? idStarts[i + 1].index : catalogSrc.length
  const block = catalogSrc.slice(start, end)
  const name = (block.match(/name:\s*['"]([^'"]+)['"]/) || [])[1] || id
  const amount = (block.match(/amount:\s*['"]([^'"]+)['"]/) || [])[1] || ''
  const deadline = (block.match(/deadline:\s*['"]([^'"]+)['"]/) || [])[1] || ''
  const url = (block.match(/url:\s*['"]([^'"]+)['"]/) || [])[1] || ''
  const tags = ((block.match(/tags:\s*\[([^\]]*)\]/) || [])[1] || '')
    .split(',')
    .map((t) => t.replace(/['"\s]/g, ''))
    .filter(Boolean)
  items.push({ id, name, amount, deadline, tags, url })
}

function matchScore(qRaw, item) {
  const q = qRaw.toLowerCase()
  const tags = item.tags.map((t) => t.toLowerCase())
  let s = 0
  if (/\bnurs/.test(q) && tags.includes('nursing')) s += 40
  if (/\b(stem|engineer|engineering|math|mathematics|computer|coding|swe)\b/.test(q) && tags.some((t) => ['stem', 'engineering', 'math', 'computer-science'].includes(t))) s += 36
  if (/\bcalifornia\b/.test(q) && tags.includes('california')) s += 50
  if (/\btexas\b/.test(q) && tags.includes('texas')) s += 50
  if (/\bflorida\b/.test(q) && tags.includes('florida')) s += 50
  if (/\bnew york\b|\bexcelsior\b|\btap\b/.test(q) && tags.includes('new-york')) s += 50
  if (/\billinois\b/.test(q) && tags.includes('illinois')) s += 50
  if (/\b(black|african)\b/.test(q) && tags.some((t) => ['black', 'african-american'].includes(t))) s += 45
  if (/\b(hispanic|latina|latino|mexican)\b/.test(q) && tags.some((t) => ['hispanic', 'latino', 'latina', 'mexican'].includes(t))) s += 45
  if (/\b(disabilit|disabled|handicap|blind)\b/.test(q) && tags.some((t) => ['disability', 'disabled', 'blind', 'accessibility'].includes(t))) s += 48
  if (/\b(sport|athletic|track|ncaa)\b/.test(q) && tags.some((t) => ['sports', 'athletics', 'athlete', 'ncaa'].includes(t))) s += 38
  if (/\b(need|pell|fafsa)\b/.test(q) && tags.some((t) => ['need-based', 'federal'].includes(t))) s += 12
  if (/\b(undergrad|undergraduate)\b/.test(q) && (tags.includes('undergrad') || tags.includes('all-majors'))) s += 10
  if (/\b(high school)\b/.test(q) && tags.includes('high-school')) s += 15
  if (/\b(daca|undocumented)\b/.test(q) && tags.some((t) => ['daca', 'undocumented'].includes(t))) s += 48
  if (/\b(lgbtq|lgbt)\b/.test(q) && tags.includes('lgbtq')) s += 48
  if (/\b(military|spouse|veteran)\b/.test(q) && tags.some((t) => ['military', 'veteran', 'spouse'].includes(t))) s += 42
  if (/\b(first.gen|first generation)\b/.test(q) && (tags.includes('first-gen') || tags.includes('need-based'))) s += 22
  if (/\b(transfer|community college)\b/.test(q) && tags.some((t) => ['community-college', 'transfer'].includes(t))) s += 42
  for (const tok of q.split(/[^a-z0-9]+/).filter((t) => t.length > 3)) {
    if (`${item.name} ${tags.join(' ')}`.toLowerCase().includes(tok)) s += 3
  }
  return s
}

function top(q, n = 5) {
  return items
    .map((it) => ({ id: it.id, score: matchScore(q, it) }))
    .filter((h) => h.score > 10)
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
}

function classifyDeadline(d) {
  if (/fafsa|cycle|varies|rolling|portal|campus|priority|recommended|annually/i.test(d)) return 'cycle'
  const t = Date.parse(d)
  if (Number.isNaN(t)) return 'unknown'
  if (t < Date.now()) return 'passed'
  return 'fixed'
}

// ===================== CASES =====================

// A. Files & architecture (1–15)
test(1, 'LandingPage exists', () => exists('src/pages/LandingPage.tsx'))
test(2, 'ResultsPage exists', () => exists('src/pages/ResultsPage.tsx'))
test(3, 'DigestPage exists', () => exists('src/pages/DigestPage.tsx'))
test(4, 'PipelinePage exists', () => exists('src/pages/PipelinePage.tsx'))
test(5, 'PathPage exists', () => exists('src/pages/PathPage.tsx'))
test(6, 'ActivityPage exists', () => exists('src/pages/ActivityPage.tsx'))
test(7, 'HomePage monolith removed', () => !exists('src/pages/HomePage.tsx'))
test(8, 'ScholarshipContext exists', () => exists('src/state/ScholarshipContext.tsx'))
test(9, 'AppLayout exists', () => exists('src/components/layout/AppLayout.tsx'))
test(10, 'ScrollToTop exists', () => exists('src/components/ScrollToTop.tsx'))
test(11, 'profileSearch exists', () => exists('src/lib/profileSearch.ts'))
test(12, 'catalogQuery exists', () => exists('src/lib/catalogQuery.ts'))
test(13, 'HeaderSearch exists', () => exists('src/components/HeaderSearch.tsx'))
test(14, 'OnboardingModal exists', () => exists('src/components/OnboardingModal.tsx'))
test(15, 'TESTING.md exists', () => exists('docs/TESTING.md'))

// B. Routes registered (16–25)
const app = read('src/App.tsx')
for (const [id, path] of [
  [16, '/'],
  [17, '/results'],
  [18, '/digest'],
  [19, '/pipeline'],
  [20, '/path'],
  [21, '/activity'],
]) {
  test(id, `Route registered ${path === '/' ? 'landing' : path}`, () => app.includes(`path="${path}"`) || (path === '/' && app.includes('LandingPage')))
}
test(22, 'ScrollToTop mounted in App', () => app.includes('ScrollToTop'))
test(23, 'ScholarshipProvider wraps routes', () => app.includes('ScholarshipProvider'))
test(24, 'Legacy /app redirects to /results', () => app.includes('/app') && app.includes('/results'))
test(25, 'No HomePage import in App', () => !app.includes('HomePage'))

// C. Nav is real routes not hash-scroll (26–32)
const site = read('src/config/site.ts')
test(26, 'Nav Results is /results', () => site.includes("to: '/results'"))
test(27, 'Nav Deadlines is /digest', () => site.includes("to: '/digest'"))
test(28, 'Nav Pipeline is /pipeline', () => site.includes("to: '/pipeline'"))
test(29, 'Nav Path is /path', () => site.includes("to: '/path'"))
test(30, 'Nav Activity is /activity', () => site.includes("to: '/activity'"))
test(31, 'Nav does not use #results scroll', () => !site.includes("'/#results'") && !site.includes('"/#results"'))
test(32, 'Shell uses NavLink for workspace nav', () => read('src/components/Shell.tsx').includes('NavLink'))

// D. Onboarding contract (33–45)
const ctx = read('src/state/ScholarshipContext.tsx')
const onboard = read('src/components/OnboardingModal.tsx')
const profileSearch = read('src/lib/profileSearch.ts')
test(33, 'Onboard has Show my matches', () => onboard.includes('Show my matches'))
test(34, 'Onboard calls onComplete(draft)', () => onboard.includes('onComplete(draft)'))
test(35, 'completeOnboarding closes modal', () => ctx.includes('setShowOnboarding(false)'))
test(36, 'applyProfileSearch navigates /results', () => {
  const start = ctx.indexOf('const applyProfileSearch')
  const block = start >= 0 ? ctx.slice(start, start + 1200) : ''
  return block.includes("navigate('/results')")
})
test(37, 'applyProfileSearch uses buildProfileSearchPlan', () => ctx.includes('buildProfileSearchPlan'))
test(38, 'applyProfileSearch scrolls to top rAF', () => ctx.includes('scrollTo(0, 0)') || ctx.includes('scrollTo({ top: 0'))
test(39, 'profileSearch keeps category all', () => profileSearch.includes("categoryId: 'all'"))
test(40, 'profileSearch has fallbacks', () => profileSearch.includes('fallbacks'))
test(41, 'No setCategoryId state in applyProfileSearch', () => {
  const block = ctx.slice(ctx.indexOf('applyProfileSearch'), ctx.indexOf('handlePinMatches'))
  return !block.includes("setCategoryId('state')")
})
test(42, 'Results banner Your results', () => read('src/pages/ResultsPage.tsx').includes('Your results'))
test(43, 'Results shows ranked cards', () => read('src/pages/ResultsPage.tsx').includes('s.ranked'))
test(44, 'Onboard modal aria-modal', () => onboard.includes('aria-modal'))
test(45, 'Layout wires completeOnboarding', () => read('src/components/layout/AppLayout.tsx').includes('completeOnboarding'))

// E. Catalog integrity (46–60)
test(46, 'Catalog size >= 60', () => items.length >= 60)
test(47, 'All IDs unique', () => new Set(items.map((i) => i.id)).size === items.length)
test(48, 'All URLs https', () => items.every((i) => i.url.startsWith('https://')))
test(49, 'Has cal-grant', () => items.some((i) => i.id === 'cal-grant'))
test(50, 'Has texas-grant', () => items.some((i) => i.id === 'texas-grant'))
test(51, 'Has google-lime', () => items.some((i) => i.id === 'google-lime'))
test(52, 'Has nurse-corps', () => items.some((i) => i.id === 'nurse-corps'))
test(53, 'Has pell', () => items.some((i) => i.id === 'pell'))
test(54, 'Has dream-us', () => items.some((i) => i.id === 'dream-us'))
test(55, 'Has ny-tap', () => items.some((i) => i.id === 'ny-tap'))
test(56, 'Has bright-futures-fl', () => items.some((i) => i.id === 'bright-futures-fl'))
test(57, 'Has illinois-map', () => items.some((i) => i.id === 'illinois-map'))
test(58, 'CA has >=2 awards', () => items.filter((i) => i.tags.includes('california')).length >= 2)
test(59, 'State-tagged >= 15', () => items.filter((i) => i.tags.includes('state')).length >= 15)
test(60, 'Every item has tags', () => items.every((i) => i.tags.length > 0))

// F. Matching scenarios (61–85)
const matchCases = [
  [61, 'nursing student', ['nurse-corps', 'aacn-nursing', 'nbna-scholarships', 'aftercollege-aacn']],
  [62, 'California Cal Grant', ['cal-grant', 'ca-middle-class']],
  [63, 'Texas need', ['texas-grant', 'texas-tfg']],
  [64, 'Florida Bright Futures', ['bright-futures-fl']],
  [65, 'New York TAP', ['ny-tap', 'excelsior-ny']],
  [66, 'Illinois MAP', ['illinois-map']],
  [67, 'handicapped student track math', ['google-lime', 'microsoft-disability', 'incight-scholarship', 'goldwater']],
  [68, 'Black student marketing', ['uncf', 'nbmbaa', 'ama-foundation']],
  [69, 'Latina sports', ['hsf-athletes', 'wsf-grants', 'lulac-scholarship', 'hispanic']],
  [70, 'DACA undocumented', ['dream-us']],
  [71, 'LGBTQ student', ['point-foundation']],
  [72, 'military spouse', ['nmfa-military']],
  [73, 'need-based FAFSA Pell', ['pell', 'fastweb-note', 'jack-kent']],
  [74, 'community college transfer', ['jack-kent-transfer']],
  [75, 'first-generation high school', ['dell-scholars', 'horatio-alger', 'gates']],
  [76, 'women engineering SWE', ['swe-scholarships', 'generation-google']],
  [77, 'computer science Google', ['generation-google', 'google-lime']],
  [78, 'blind student', ['nfb-scholarship']],
  [79, 'Undergraduate Nursing California', ['nurse-corps', 'cal-grant', 'aacn-nursing', 'ca-middle-class']],
  [80, 'High school senior Texas engineering', ['texas-grant', 'smart-scholarship', 'nsbe-scholarships', 'cocacola']],
]
for (const [id, q, any] of matchCases) {
  test(id, `Match: ${q}`, () => {
    const hits = top(q, 8).map((h) => h.id)
    return any.some((a) => hits.includes(a))
  })
}
test(81, 'Empty query yields no false high scores', () => top('', 5).length === 0)
test(82, 'Garbage query no throw', () => {
  top('<script>alert(1)</script>', 3)
  top('x'.repeat(2000), 3)
  return true
})
test(83, 'Whitespace-only no hits', () => top('   ', 5).length === 0)
test(84, 'Fixed deadlines exist', () => items.some((i) => classifyDeadline(i.deadline) === 'fixed'))
test(85, 'Cycle deadlines exist', () => items.some((i) => classifyDeadline(i.deadline) === 'cycle'))

// G. CSS responsive / visual structure (86–100)
const css = read('src/styles.css')
test(86, 'Mobile chat dock media query', () => css.includes('@media (max-width: 900px)') && css.includes('chat-dock'))
test(87, 'Primary topbar row class', () => css.includes('.topbar__row--primary'))
test(88, 'Horizontal topbar nav class', () => css.includes('.topbar__nav'))
test(89, 'Desktop header search', () => css.includes('.header-search'))
test(90, 'Onboard overlay fixed', () => css.includes('.onboard-overlay') && css.includes('position: fixed'))
test(91, 'Chat FAB for collapsed', () => css.includes('.chat-fab'))
test(92, 'Chat collapsed hidden', () => css.includes('.chat-dock--collapsed'))
test(93, 'shell--chat-open padding', () => css.includes('.shell--chat-open'))
test(94, 'shell--chat-collapsed padding', () => css.includes('.shell--chat-collapsed'))
test(95, 'Print styles hide chrome', () => css.includes('@media print'))
test(96, 'List first section styles', () => css.includes('.scholarship-list-block') && css.includes('.list-section__title'))
test(97, 'Touch-friendly min heights', () => css.includes('min-height: 42px') || css.includes('min-height: 44px'))
test(98, 'Header search input min-height', () => css.includes('.header-search__input') && css.includes('min-height: 42px'))
test(99, 'sr-only utility', () => css.includes('.sr-only'))
test(100, 'Topbar nav is row flex', () => css.includes('.topbar__nav') && css.includes('flex-direction: row'))

// H. Security / headers (101–108)
const headers = read('public/_headers')
const redirects = read('public/_redirects')
test(101, 'SPA redirect present', () => redirects.includes('/index.html') && redirects.includes('200'))
test(102, 'X-Frame-Options DENY', () => headers.includes('X-Frame-Options: DENY'))
test(103, 'X-Content-Type-Options nosniff', () => headers.includes('nosniff'))
test(104, 'CSP present', () => headers.includes('Content-Security-Policy'))
test(105, 'Chat uses env OPENAI key', () => read('functions/api/chat.ts').includes('env.OPENAI_API_KEY'))
test(106, 'Digest uses RESEND_API_KEY', () => read('functions/api/digest-send.ts').includes('RESEND_API_KEY'))
test(107, 'Digest escapes HTML', () => read('functions/api/digest-send.ts').includes('escapeHtml'))
test(108, 'No sk- hardcoded in src App', () => !/sk-[a-zA-Z0-9]{12,}/.test(app + ctx))

// I. Storage keys unique (109–112)
test(109, 'Profile storage key namespaced', () => read('src/lib/profile.ts').includes('scholarship-one-profile'))
test(110, 'Onboarding key namespaced', () => read('src/lib/onboarding.ts').includes('scholarship-one-onboarding'))
test(111, 'Analytics key namespaced', () => read('src/lib/analytics.ts').includes('scholarship-one-analytics'))
test(112, 'Notes key namespaced', () => read('src/lib/notes.ts').includes('scholarship-one-notes'))

// J. Page thinness / no monolith (113–118)
test(113, 'LandingPage small file', () => read('src/pages/LandingPage.tsx').split('\n').length < 40)
test(114, 'DigestPage no Results list', () => !read('src/pages/DigestPage.tsx').includes('ScholarshipCard'))
test(115, 'PipelinePage uses PipelineBoard', () => read('src/pages/PipelinePage.tsx').includes('PipelineBoard'))
test(116, 'ActivityPage uses AnalyticsPanel', () => read('src/pages/ActivityPage.tsx').includes('AnalyticsPanel'))
test(117, 'PathPage has navigate to results', () => read('src/pages/PathPage.tsx').includes("/results"))
test(118, 'ResultsPage does not embed HowItWorks', () => !read('src/pages/ResultsPage.tsx').includes('HowItWorks'))

// K. Profile panel actions (119–122)
const profilePanel = read('src/features/matcher/ProfilePanel.tsx')
test(119, 'Profile has Save & rank button', () => profilePanel.includes('Save') && profilePanel.includes('rank'))
test(120, 'Profile has Save profile only', () => profilePanel.includes('Save profile only'))
test(121, 'Profile tracks dirty/unsaved', () => profilePanel.includes('unsaved') || profilePanel.includes('dirty'))
test(122, 'Profile apply calls onApply', () => profilePanel.includes('onApply'))

// L. Chat / shell mobile (123–128)
const shell = read('src/components/Shell.tsx')
const chat = read('src/components/ChatDock.tsx')
test(123, 'Shell has topbar__nav row', () => shell.includes('topbar__nav'))
test(124, 'Shell header search callback', () => shell.includes('onHeaderSearch'))
test(125, 'Chat collapse button', () => chat.includes('Collapse') || chat.includes('onPanelOpenChange'))
test(126, 'Chat FAB when collapsed', () => chat.includes('chat-fab'))
test(127, 'Chat scroll top on empty', () => chat.includes('scrollTop = 0'))
test(128, 'Chat show more options', () => read('src/components/ChatMessageView.tsx').includes('Show more options'))
test(146, 'Results list before About you', () => {
  const r = read('src/pages/ResultsPage.tsx')
  const list = r.indexOf('id="scholarship-list"')
  const profile = r.indexOf('<ProfilePanel')
  return list > 0 && profile > list && r.includes('Suggested for you')
})
test(147, 'Results tools collapsed by default state', () => {
  const r = read('src/pages/ResultsPage.tsx')
  return r.includes('showTools') && r.includes('Filters & profile')
})

// M. Backup / export (129–132)
test(129, 'DataTools backup', () => read('src/components/DataTools.tsx').includes('Backup'))
test(130, 'exportTools CSV', () => read('src/lib/exportTools.ts').includes('downloadCsv'))
test(131, 'exportTools ICS', () => read('src/lib/exportTools.ts').includes('downloadIcs'))
test(132, 'dataBackup parse version 1', () => read('src/lib/dataBackup.ts').includes('version: 1') || read('src/lib/dataBackup.ts').includes('version !== 1'))

// N. Extra onboarding profile matrix (133–140)
const profiles = [
  { level: 'undergrad', state: 'california', major: 'nursing', identity: 'any', need: 'need' },
  { level: 'high-school', state: 'texas', major: 'engineering', identity: 'black', need: 'any' },
  { level: 'undergrad', state: 'florida', major: 'business', identity: 'hispanic', need: 'need' },
  { level: 'grad', state: 'new-york', major: 'computer-science', identity: 'women', need: 'any' },
  { level: 'undergrad', state: 'illinois', major: 'math', identity: 'disability', need: 'need' },
  { level: 'community-college', state: 'any', major: 'nursing', identity: 'any', need: 'need' },
  { level: 'undergrad', state: 'california', major: 'sports', identity: 'hispanic', need: 'any' },
  { level: 'high-school', state: 'any', major: 'any', identity: 'first-gen', need: 'need' },
]
const LEVEL = { 'high-school': 'High school senior', undergrad: 'Undergraduate', grad: 'Graduate', 'community-college': 'Community college' }
const MAJOR = { nursing: 'Nursing', engineering: 'Engineering / STEM', 'computer-science': 'Computer science', math: 'Math', business: 'Business', sports: 'Sports / athletics', any: '' }
const STATE = { california: 'California', texas: 'Texas', florida: 'Florida', 'new-york': 'New York', illinois: 'Illinois', any: '' }
const ID = { black: 'Black / African American', hispanic: 'Hispanic / Latino / Mexican', disability: 'Student with a disability', women: 'Women / female students', 'first-gen': 'First-generation college', any: '' }

profiles.forEach((p, idx) => {
  test(133 + idx, `Onboard plan pins: ${p.level}/${p.state}/${p.major}`, () => {
    const text = [LEVEL[p.level], STATE[p.state], MAJOR[p.major], ID[p.identity], p.need === 'need' ? 'Need-based' : '']
      .filter(Boolean)
      .join(' ')
    let pins = top(text, 8)
    if (!pins.length) {
      for (const fb of [MAJOR[p.major], STATE[p.state], ID[p.identity], 'undergraduate scholarships'].filter(Boolean)) {
        pins = top(fb, 8)
        if (pins.length) break
      }
    }
    // empty major/state/identity may still get undergrad hits
    return pins.length >= 1 || (p.major === 'any' && p.state === 'any')
  })
})

// O. package scripts (141–145)
const pkg = JSON.parse(read('package.json'))
test(141, 'qa:hard script exists', () => Boolean(pkg.scripts['qa:hard']))
test(142, 'qa:onboarding script exists', () => Boolean(pkg.scripts['qa:onboarding']))
test(143, 'qa script exists', () => Boolean(pkg.scripts.qa))
test(144, 'build script exists', () => Boolean(pkg.scripts.build))
test(145, 'CI uses qa:hard', () => read('.github/workflows/qa.yml').includes('qa:hard'))

// ===================== RUN =====================
console.log(`Running ${cases.length} test cases...\n`)
let pass = 0
let fail = 0
const t0 = performance.now()
for (const c of cases) {
  let ok = false
  let err = ''
  try {
    ok = Boolean(c.fn())
  } catch (e) {
    ok = false
    err = String(e.message || e)
  }
  if (ok) {
    pass++
    results.push({ id: c.id, name: c.name, ok: true })
  } else {
    fail++
    results.push({ id: c.id, name: c.name, ok: false, err })
    console.error(`FAIL #${c.id} ${c.name}${err ? ' — ' + err : ''}`)
  }
}
const ms = performance.now() - t0
console.log(`\n${pass} passed, ${fail} failed, ${cases.length} total (${ms.toFixed(0)}ms)`)

const report = [
  '# 120+ test case report',
  '',
  `Generated: ${new Date().toISOString()}`,
  `Total: ${cases.length}`,
  `Passed: ${pass}`,
  `Failed: ${fail}`,
  `Duration: ${ms.toFixed(0)}ms`,
  '',
  '## Failures',
  '',
  fail
    ? results
        .filter((r) => !r.ok)
        .map((r) => `- **#${r.id}** ${r.name}${r.err ? ` — ${r.err}` : ''}`)
        .join('\n')
    : '_None_',
  '',
  '## All cases',
  '',
  ...results.map((r) => `- ${r.ok ? 'PASS' : 'FAIL'} #${r.id} ${r.name}`),
  '',
].join('\n')
writeFileSync(join(root, 'docs/QA-CASES-120.md'), report)
console.log('Wrote docs/QA-CASES-120.md')
process.exit(fail ? 1 : 0)
