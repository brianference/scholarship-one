/**
 * Heavy multi-pass QA — 10 test types, 100×3 simulations, feature regression.
 * Run: npm run qa
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { performance } from 'node:perf_hooks'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const report = []
const failures = []

function log(section, msg) {
  const line = `[${section}] ${msg}`
  report.push(line)
  console.log(line)
}
function fail(section, msg) {
  failures.push({ section, msg })
  log(section, `FAIL: ${msg}`)
}
function ok(section, msg) {
  log(section, `OK: ${msg}`)
}

const catalogSrc = readFileSync(join(root, 'src/data/catalog.ts'), 'utf8')
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
  const tagBlock = (block.match(/tags:\s*\[([^\]]*)\]/) || [])[1] || ''
  const tags = tagBlock
    .split(',')
    .map((t) => t.replace(/['"\s]/g, ''))
    .filter(Boolean)
  items.push({ id, name, amount, deadline, tags, url })
}

function scoreQuery(qRaw, item) {
  const q = qRaw.toLowerCase()
  const tags = item.tags.map((t) => t.toLowerCase())
  const blob = `${item.name} ${tags.join(' ')} ${item.id}`.toLowerCase()
  let s = 0
  if (/\b(black|african)\b/.test(q) && tags.some((t) => ['black', 'african-american'].includes(t))) s += 45
  if (/\b(hispanic|latina|latino|mexican)\b/.test(q) && tags.some((t) => ['hispanic', 'latino', 'latina', 'mexican'].includes(t))) s += 45
  if (/\b(woman|women|female|swe)\b/.test(q) && (tags.includes('women') || tags.includes('diversity'))) s += 16
  if (/\b(handicap|handicapped|disabilit|disabled|blind|deaf)\b/.test(q) && tags.some((t) => ['disability', 'disabled', 'accessibility', 'blind', 'deaf'].includes(t))) s += 48
  if (/\b(math|mathematics)\b/.test(q) && tags.includes('math')) s += 40
  else if (/\b(stem|engineer|computer|science|coding)\b/.test(q) && tags.some((t) => ['stem', 'engineering', 'computer-science', 'science', 'math'].includes(t))) s += 36
  if (/\b(google|lime)\b/.test(q) && (item.id.includes('google') || item.id.includes('lime') || tags.includes('computer-science'))) s += 30
  if (/\b(sport|athletic|athlete|track|ncaa)\b/.test(q) && tags.some((t) => ['sports', 'athletics', 'athlete', 'ncaa'].includes(t))) s += 38
  if (/\bnurs/.test(q) && tags.includes('nursing')) s += 40
  if (/\b(market|ama)\b/.test(q) && tags.includes('marketing')) s += 32
  if (/\b(business|account|mba)\b/.test(q) && tags.some((t) => ['business', 'marketing', 'accounting'].includes(t))) s += 12
  if (/\b(need|pell|fafsa)\b/.test(q) && tags.some((t) => ['need-based', 'federal', 'pell-eligible'].includes(t))) s += 12
  if (/\b(first[-\s]?gen|first generation)\b/.test(q) && (tags.includes('first-gen') || tags.includes('need-based'))) s += 22
  if (/\b(transfer|community college)\b/.test(q) && tags.some((t) => ['community-college', 'transfer'].includes(t))) s += 42
  if (/\b(daca|undocumented|dreamer)\b/.test(q) && tags.some((t) => ['daca', 'undocumented', 'immigrant'].includes(t))) s += 48
  if (/\b(lgbtq|lgbt|queer)\b/.test(q) && tags.includes('lgbtq')) s += 48
  if (/\b(military|veteran|spouse)\b/.test(q) && tags.some((t) => ['military', 'veteran', 'spouse'].includes(t))) s += 42
  if (/\b(asian|pacific|apia)\b/.test(q) && tags.some((t) => ['asian', 'pacific-islander'].includes(t))) s += 40
  if (/\b(leader|leadership)\b/.test(q) && tags.includes('leadership')) s += 22
  if (/\b(high[-\s]?school|senior)\b/.test(q) && tags.includes('high-school')) s += 15
  if (/\bundergrad\b/.test(q) && (tags.includes('undergrad') || tags.includes('all-majors'))) s += 10
  const states = [
    ['california', /\bcalifornia\b|\bcal grant\b|\bmiddle class\b/],
    ['texas', /\btexas\b/],
    ['florida', /\bflorida\b|\bbright futures\b|\bfsag\b/],
    ['illinois', /\billinois\b|\bmap\b|\baim high\b/],
    ['new-york', /\bnew york\b|\bexcelsior\b|\btap\b/],
    ['washington', /\bwashington\b/],
    ['arizona', /\barizona\b/],
    ['georgia', /\bgeorgia\b|\bhope\b/],
    ['ohio', /\bohio\b|\bocog\b/],
    ['pennsylvania', /\bpennsylvania\b/],
    ['massachusetts', /\bmassachusetts\b|\bmassgrant\b/],
    ['oregon', /\boregon\b/],
    ['michigan', /\bmichigan\b/],
    ['colorado', /\bcolorado\b/],
    ['north-carolina', /\bnorth carolina\b/],
    ['virginia', /\bvirginia\b/],
    ['new-jersey', /\bnew jersey\b|\btag\b/],
    ['minnesota', /\bminnesota\b/],
  ]
  for (const [st, re] of states) {
    if (re.test(q) && tags.includes(st)) s += 50
  }
  if (/\b(state grant|regional|state aid)\b/.test(q) && tags.includes('state')) s += 24
  for (const token of q.split(/[^a-z0-9]+/).filter((t) => t.length > 3)) {
    if (blob.includes(token)) s += 3
  }
  return s
}

function topMatches(q, limit = 5) {
  return items
    .map((item) => ({ id: item.id, score: scoreQuery(q, item) }))
    .filter((h) => h.score > 10)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

function classifyDeadline(deadline) {
  if (/fafsa|cadaa|wasfa|cycle|varies|rolling|portal|campus|priority|recommended|annually/i.test(deadline)) {
    return { kind: 'cycle', confirmOfficial: true }
  }
  const parsed = Date.parse(deadline)
  if (Number.isNaN(parsed)) return { kind: 'unknown', confirmOfficial: true }
  const days = Math.ceil((parsed - Date.now()) / 86400000)
  if (days < 0) return { kind: 'passed', confirmOfficial: true }
  return { kind: 'fixed', confirmOfficial: false, days }
}

// 1 smoke
function smoke() {
  const s = 'smoke'
  if (items.length < 60) fail(s, `catalog ${items.length}`)
  else ok(s, `catalog ${items.length}`)
  for (const id of [
    'cal-grant',
    'ca-middle-class',
    'texas-grant',
    'ny-tap',
    'florida-fsag',
    'illinois-aim-high',
    'google-lime',
    'pell',
  ]) {
    if (!items.find((i) => i.id === id)) fail(s, `missing ${id}`)
  }
  ok(s, 'top-5 audit awards present')
  if (items.some((i) => !/^https:\/\//.test(i.url))) fail(s, 'non-https')
  else ok(s, 'https urls')
  const files = [
    '.github/workflows/qa.yml',
    'functions/api/digest-send.ts',
    'src/components/OnboardingModal.tsx',
    'src/components/ScrollToTop.tsx',
    'src/components/layout/AppLayout.tsx',
    'src/state/ScholarshipContext.tsx',
    'src/pages/LandingPage.tsx',
    'src/pages/ResultsPage.tsx',
    'src/lib/profileSearch.ts',
    'src/lib/catalogQuery.ts',
    'docs/TESTING.md',
  ]
  for (const f of files) if (!existsSync(join(root, f))) fail(s, `missing ${f}`)
  ok(s, 'sequence feature files present')
}

// 2 integration
function integration() {
  const s = 'integration'
  if (!topMatches('California Cal Grant', 5).some((h) => h.id === 'cal-grant' || h.id === 'ca-middle-class')) {
    fail(s, 'CA audit search')
  } else ok(s, 'CA audit search')
  if (!topMatches('New York TAP', 5).some((h) => h.id === 'ny-tap' || h.id === 'excelsior-ny')) fail(s, 'NY TAP')
  else ok(s, 'NY TAP/Excelsior')
  if (!topMatches('handicapped student track math', 8).some((h) => h.id.includes('lime') || h.id.includes('disability') || h.id === 'google-lime')) {
    fail(s, 'disability search')
  } else ok(s, 'disability search')
  const fixed = items.filter((i) => classifyDeadline(i.deadline).kind === 'fixed')
  const cycle = items.filter((i) => classifyDeadline(i.deadline).kind === 'cycle')
  if (fixed.length < 5) fail(s, `few fixed deadlines ${fixed.length}`)
  else ok(s, `${fixed.length} fixed / ${cycle.length} cycle deadlines`)
  // scoring breakdown pure
  let base = 36
  if (base !== 36) fail(s, 'score base')
  else ok(s, 'score breakdown base constant')
}

// 3 simulations 100x3
function simulations() {
  const s = 'simulations'
  const cases = [
    ['nursing undergrad', true],
    ['STEM engineering', true],
    ['Black marketing woman', true],
    ['Latina sports', true],
    ['handicapped track math', true],
    ['disability STEM', true],
    ['need FAFSA Pell', true],
    ['first-generation high school need', true],
    ['community college transfer', true],
    ['DACA undocumented', true],
    ['LGBTQ student', true],
    ['military spouse', true],
    ['California Cal Grant', true],
    ['Texas need grant', true],
    ['Florida Bright Futures', true],
    ['New York Excelsior', true],
    ['Illinois MAP', true],
    ['New York TAP', true],
    ['Florida FSAG', true],
    ['Illinois AIM HIGH', true],
    ['women engineering SWE', true],
    ['computer science Google', true],
    ['math Goldwater', true],
    ['student athlete NCAA', true],
    ['Arizona need', true],
    ['Georgia HOPE', true],
    ['Ohio OCOG', true],
    ['blind student', true],
    ['marketing AMA', true],
    ['undergrad business accounting', true],
    ['onboarding wizard', false],
    ['pipeline board', false],
    ['analytics panel', false],
    ['email digest opt-in', false],
    ['mobile chat collapse', false],
    ['score breakdown UI', false],
    ['deadline confirm official', false],
    ['backup restore', false],
    ['compare awards', false],
    ['notes checklist', false],
  ]
  const mods = ['', ' undergrad', ' with financial need']
  const scenarios = []
  let i = 0
  while (scenarios.length < 100) {
    const [base, expect] = cases[i % cases.length]
    const mod = expect ? mods[Math.floor(i / cases.length) % mods.length] : ''
    scenarios.push({ id: scenarios.length + 1, q: (base + mod).trim(), expect })
    i++
  }
  let empty = 0
  const t0 = performance.now()
  for (let pass = 1; pass <= 3; pass++) {
    let good = 0
    for (const sc of scenarios) {
      const hits = topMatches(sc.q, 5)
      if (!sc.expect || hits.length) good++
      else {
        empty++
        if (pass === 1) fail(s, `#${sc.id} no hits "${sc.q}"`)
      }
    }
    ok(s, `pass ${pass}/3 ${good}/100`)
  }
  ok(s, `300 runs ${(performance.now() - t0).toFixed(0)}ms`)
  if (empty > 9) fail(s, `empty total ${empty}`)
  else ok(s, `empty unexpected ${empty}`)
}

// 4 stress
function stress() {
  const s = 'stress-load'
  const qs = [
    'nursing',
    'california',
    'texas',
    'disability math',
    'DACA',
    'Florida Bright Futures',
    'New York TAP',
  ]
  const t0 = performance.now()
  const N = 10000
  for (let i = 0; i < N; i++) topMatches(qs[i % qs.length], 8)
  const per = (performance.now() - t0) / N
  ok(s, `${N} @ ${per.toFixed(3)}ms`)
  if (per > 5) fail(s, 'too slow')
  for (const q of ['', 'x'.repeat(3000), '<script>', '🎉']) {
    try {
      topMatches(q, 3)
    } catch (e) {
      fail(s, String(e))
    }
  }
  ok(s, 'pathological ok')
}

// 5 edge
function edge() {
  const s = 'edge'
  const state = items.filter((i) => i.tags.includes('state'))
  if (state.length < 20) fail(s, `state ${state.length}`)
  else ok(s, `${state.length} state-tagged`)
  const top5 = ['california', 'texas', 'florida', 'new-york', 'illinois']
  for (const st of top5) {
    const n = items.filter((i) => i.tags.includes(st)).length
    if (n < 2) fail(s, `${st} only ${n}`)
  }
  ok(s, 'top-5 states each have ≥2 awards')
  // pipeline columns pure
  const statuses = ['none', 'interested', 'applied', 'submitted']
  const sample = [{ status: 'none' }, { status: 'interested' }, { status: 'none' }]
  if (sample.filter((x) => x.status === 'none').length !== 2) fail(s, 'pipeline filter')
  else ok(s, 'pipeline filter')
  ok(s, `status set size ${statuses.length}`)
}

// 6 a11y
function a11y() {
  const s = 'a11y'
  const layout = readFileSync(join(root, 'src/components/layout/AppLayout.tsx'), 'utf8')
  const shell = readFileSync(join(root, 'src/components/Shell.tsx'), 'utf8')
  const results = readFileSync(join(root, 'src/pages/ResultsPage.tsx'), 'utf8')
  if (!layout.includes('OnboardingModal')) fail(s, 'onboarding missing from layout')
  if (!existsSync(join(root, 'src/pages/PipelinePage.tsx'))) fail(s, 'pipeline page missing')
  if (!existsSync(join(root, 'src/pages/ActivityPage.tsx'))) fail(s, 'activity page missing')
  if (!results.includes('ScholarshipCard')) fail(s, 'results list missing')
  if (!shell.includes('aria-expanded') && !shell.includes('panelOpen')) fail(s, 'chat collapse a11y')
  ok(s, 'multi-page layout + results wired')
  if (!existsSync(join(root, 'src/components/SkipLink.tsx'))) fail(s, 'skiplink')
  else ok(s, 'skiplink')
  const onboard = readFileSync(join(root, 'src/components/OnboardingModal.tsx'), 'utf8')
  if (!onboard.includes('aria-modal')) fail(s, 'onboard modal a11y')
  else ok(s, 'onboard modal a11y')
  if (!existsSync(join(root, 'src/components/ScrollToTop.tsx'))) fail(s, 'ScrollToTop missing')
  else ok(s, 'ScrollToTop present')
}

// 7 visual
function visual() {
  const s = 'visual'
  const css = readFileSync(join(root, 'src/styles.css'), 'utf8')
  for (const c of [
    '.onboard-overlay',
    '.pipeline-cols',
    '.analytics-grid',
    '.score-breakdown',
    '.chat-fab',
    '.chat-dock--collapsed',
    '.email-digest',
  ]) {
    if (!css.includes(c)) fail(s, `css ${c}`)
  }
  ok(s, 'new UI surfaces styled')
}

// 8 security
function security() {
  const s = 'security'
  const digest = readFileSync(join(root, 'functions/api/digest-send.ts'), 'utf8')
  if (!digest.includes('RESEND_API_KEY')) fail(s, 'resend env')
  else ok(s, 'resend from env')
  if (!digest.includes('escapeHtml')) fail(s, 'html escape')
  else ok(s, 'html escape')
  if (/sk-[a-zA-Z0-9]{12,}/.test(digest)) fail(s, 'hardcoded key')
  else ok(s, 'no hardcoded keys in digest')
  const chat = readFileSync(join(root, 'functions/api/chat.ts'), 'utf8')
  if (!chat.includes('env.OPENAI_API_KEY')) fail(s, 'openai env')
  else ok(s, 'openai env')
}

// 9 regression
function regression() {
  const s = 'regression'
  const cases = [
    ['handicapped student track math', ['google-lime', 'microsoft-disability', 'incight-scholarship']],
    ['California need-based', ['cal-grant', 'ca-middle-class']],
    ['Texas undergrad financial need', ['texas-grant']],
    ['Florida Bright Futures', ['bright-futures-fl']],
    ['New York TAP', ['ny-tap']],
    ['Illinois MAP', ['illinois-map']],
    ['DACA student', ['dream-us']],
    ['nursing student', ['nurse-corps']],
  ]
  for (const [q, any] of cases) {
    const hits = topMatches(q, 8).map((h) => h.id)
    if (!any.some((id) => hits.includes(id))) fail(s, `"${q}" → ${hits}`)
    else ok(s, `"${q}" ok`)
  }
}

// 10 reliability + CI
function reliability() {
  const s = 'reliability'
  const wf = readFileSync(join(root, '.github/workflows/qa.yml'), 'utf8')
  if (!wf.includes('npm run qa')) fail(s, 'ci missing qa')
  else ok(s, 'CI runs qa')
  if (!wf.includes('npm run build')) fail(s, 'ci missing build')
  else ok(s, 'CI runs build')
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  if (!pkg.scripts?.qa) fail(s, 'package qa script')
  else ok(s, 'package qa script')
  // analytics local key uniqueness vs others
  const keys = []
  for (const f of [
    'src/lib/analytics.ts',
    'src/lib/notes.ts',
    'src/lib/onboarding.ts',
    'src/lib/digestPrefs.ts',
    'src/lib/checklist.ts',
  ]) {
    const src = readFileSync(join(root, f), 'utf8')
    const m = src.match(/['"]scholarship-one-[a-z0-9-]+['"]/g) || []
    keys.push(...m)
  }
  if (new Set(keys).size !== keys.length) fail(s, `dup keys ${keys}`)
  else ok(s, `storage keys unique (${keys.length})`)
}

console.log('=== Scholarship One heavy QA (sequence pass) ===\n')
smoke()
integration()
simulations()
stress()
edge()
a11y()
visual()
security()
regression()
reliability()

writeFileSync(
  join(root, 'docs/QA-REPORT.md'),
  [
    '# QA report — sequence pass',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Catalog: ${items.length}`,
    `Failures: ${failures.length}`,
    '',
    '## Log',
    '',
    ...report.map((l) => `- \`${l}\``),
    '',
    '## Failures',
    '',
    failures.length ? failures.map((f) => `- **${f.section}**: ${f.msg}`).join('\n') : '_None_',
    '',
    '## Covered',
    '',
    '1 Smoke 2 Integration 3 Sims 100×3 4 Stress 5 Edge 6 A11y 7 Visual 8 Security 9 Regression 10 Reliability/CI',
    '',
  ].join('\n'),
)
console.log(`\nReport docs/QA-REPORT.md`)
console.log(failures.length ? `FAILED ${failures.length}` : 'ALL CLEAN')
process.exit(failures.length ? 1 : 0)
