/**
 * Scenario coverage for local matching (no network).
 * Run: node scripts/match-scenarios.mjs
 *
 * Mirrors production keyword rules at a smoke-test level against the catalog file.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = readFileSync(join(root, 'src/data/catalog.ts'), 'utf8')

// Extract id + tags roughly from catalog source
const items = []
const blockRe = /\{\s*id:\s*'([^']+)'[\s\S]*?tags:\s*\[([^\]]+)\]/g
let m
while ((m = blockRe.exec(src))) {
  const id = m[1]
  const tags = m[2]
    .split(',')
    .map((t) => t.replace(/['"\s]/g, ''))
    .filter(Boolean)
  items.push({ id, tags })
}

function score(query, item) {
  const q = query.toLowerCase()
  const tags = item.tags.map((t) => t.toLowerCase())
  let s = 0
  const wantsDisability = /\b(handicap|handicapped|disabilit|disabled)\b/.test(q)
  const wantsMath = /\b(math|mathematics)\b/.test(q)
  const wantsStem = wantsMath || /\b(stem|engineer|computer)\b/.test(q)
  const wantsSports = /\b(sport|athletic|track)\b/.test(q)
  const wantsNursing = /\bnurs/.test(q)
  const wantsHispanic = /\b(hispanic|latina|mexican|latino)\b/.test(q)
  const wantsBlack = /\b(black|african)\b/.test(q)
  const wantsNeed = /\b(need|pell|fafsa)\b/.test(q)
  const wantsFirstGen = /\bfirst[-\s]?gen/.test(q)
  const wantsTransfer = /\b(transfer|community college)\b/.test(q)
  const wantsDaca = /\b(daca|undocumented|dreamer)\b/.test(q)

  if (wantsDisability && tags.some((t) => ['disability', 'disabled', 'accessibility', 'blind'].includes(t))) s += 48
  if (wantsMath && tags.includes('math')) s += 40
  else if (wantsStem && tags.some((t) => ['stem', 'engineering', 'computer-science', 'math', 'science'].includes(t))) s += 36
  if (wantsSports && tags.some((t) => ['sports', 'athletics', 'athlete', 'ncaa'].includes(t))) s += 38
  if (wantsNursing && tags.includes('nursing')) s += 40
  if (wantsHispanic && tags.some((t) => ['hispanic', 'latino', 'latina', 'mexican'].includes(t))) s += 45
  if (wantsBlack && tags.some((t) => ['black', 'african-american'].includes(t))) s += 45
  if (wantsNeed && tags.some((t) => ['need-based', 'federal', 'pell-eligible'].includes(t))) s += 12
  if (wantsFirstGen && tags.includes('first-gen')) s += 20
  if (wantsTransfer && tags.includes('community-college')) s += 40
  if (wantsDaca && tags.some((t) => ['daca', 'undocumented'].includes(t))) s += 48
  return s
}

const scenarios = [
  {
    name: 'disability + track + math',
    q: 'handicapped student track math',
    mustIncludeAny: ['google-lime', 'microsoft-disability', 'aahd-krause', 'incight-scholarship', 'goldwater'],
  },
  {
    name: 'nursing',
    q: 'nursing student undergrad',
    mustIncludeAny: ['nurse-corps', 'aacn-nursing', 'nbna-scholarships', 'aftercollege-aacn'],
  },
  {
    name: 'Latina sports',
    q: 'Mexican Latina woman sports scholarships',
    mustIncludeAny: ['hsf-athletes', 'wsf-grants', 'lulac-scholarship', 'ncaa-postgrad'],
  },
  {
    name: 'Black marketing',
    q: 'Black woman undergrad marketing',
    mustIncludeAny: ['nbmbaa', 'ama-foundation', 'uncf'],
  },
  {
    name: 'need / FAFSA',
    q: 'need-based FAFSA Pell',
    mustIncludeAny: ['pell', 'fastweb-note', 'jack-kent'],
  },
  {
    name: 'community college transfer',
    q: 'community college transfer financial need',
    mustIncludeAny: ['jack-kent-transfer'],
  },
  {
    name: 'DACA',
    q: 'DACA undocumented student scholarship',
    mustIncludeAny: ['dream-us'],
  },
  {
    name: 'first-gen high school',
    q: 'first-generation high school senior need',
    mustIncludeAny: ['dell-scholars', 'horatio-alger', 'gates', 'jack-kent'],
  },
]

let failed = 0
console.log(`Catalog items parsed: ${items.length}`)
for (const sc of scenarios) {
  const ranked = items
    .map((item) => ({ id: item.id, score: score(sc.q, item) }))
    .filter((h) => h.score > 10)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
  const ids = ranked.map((h) => h.id)
  const ok = sc.mustIncludeAny.some((id) => ids.includes(id))
  if (!ok) {
    failed += 1
    console.error(`FAIL ${sc.name}: expected one of ${sc.mustIncludeAny.join(', ')}; got ${ids.join(', ') || '(none)'}`)
  } else {
    console.log(`OK   ${sc.name}: ${ids.slice(0, 5).join(', ')}`)
  }
}

if (failed) {
  console.error(`\n${failed} scenario(s) failed`)
  process.exit(1)
}
console.log('\nAll scenarios passed')
