// Browser QA for "Find new scholarships" (Chromium). Needs `wrangler pages dev dist` with local D1
// migrations applied.  BASE=http://127.0.0.1:8803 node scripts/qa-find-new-ui.mjs
//
// The two awards inserted into the LOCAL database below are test fixtures (names say so). They
// stand in for what the verified finder stores, because the model step needs a production key.
import { chromium } from 'playwright'
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const BASE = process.env.BASE || 'http://127.0.0.1:8788'
const SHOTS = process.env.SHOTS || 'docs/qa/v5.4'
mkdirSync(SHOTS, { recursive: true })

let pass = 0
let fail = 0
const check = (name, cond, extra = '') => {
  if (cond) {
    pass++
    console.log(`  ok   ${name}`)
  } else {
    fail++
    console.log(`  FAIL ${name}${extra ? ' -> ' + extra : ''}`)
  }
}
async function until(fn, timeoutMs = 10000) {
  const end = Date.now() + timeoutMs
  let last
  while (Date.now() < end) {
    last = await fn()
    if (last) return last
    await new Promise((r) => setTimeout(r, 150))
  }
  return last
}
async function api(page, method, path, body) {
  return page.evaluate(
    async ([m, p, b]) => {
      const r = await fetch(p, { method: m, headers: { 'Content-Type': 'application/json' }, body: b ? JSON.stringify(b) : undefined })
      let j = null
      try {
        j = await r.json()
      } catch {
        /* empty */
      }
      return { status: r.status, json: j }
    },
    [method, path, body ?? null],
  )
}
async function signIn(page, kind, creds) {
  await page.goto(`${BASE}/api/health`)
  return api(page, 'POST', `/api/auth/${kind}`, creds)
}
/** Run SQL against the LOCAL D1 the dev server uses. A file avoids shell quoting problems on Windows. */
function localSql(sql) {
  const file = join(tmpdir(), `so-fixture-${Date.now()}-${Math.floor(Math.random() * 1e6)}.sql`)
  writeFileSync(file, sql)
  execFileSync('npx', ['wrangler', 'd1', 'execute', 'scholarship-one-db', '--local', '--file', file], { stdio: 'ignore', shell: true })
}
/** Insert a fixture row, standing in for a verified web find. */
function insertFixture(id, name, tags, addedMsOffset) {
  const future = new Date(Date.now() + 150 * 86_400_000).toISOString().slice(0, 10)
  localSql(`insert or replace into discovered_scholarships (id,url,name,amount,deadline,summary,tags,added_at,verified_at,provider)
    values ('${id}','https://fixture.example.org/${id}','${name}','$3,000 per year','${future}',
    'TEST FIXTURE: supports undergraduate nursing students who demonstrate financial need.','${JSON.stringify(tags)}',
    '${new Date().toISOString().slice(0, 10)}',${Date.now() + addedMsOffset},'fixture');`)
}
function deleteFixtures() {
  localSql("delete from discovered_scholarships where provider='fixture';")
}

const PROFILE = { major: 'nursing', state: 'any', level: 'undergrad', identity: 'any', need: 'any' }
const ONBOARDED = JSON.stringify({ completed: true, skipped: false, completedAt: 1 })
const init = ([onboarded, profile, theme]) => {
  if (!localStorage.getItem('scholarship-one-onboarding-v1')) {
    localStorage.setItem('scholarship-one-onboarding-v1', onboarded)
    localStorage.setItem('scholarship-one-profile', profile)
    if (theme) localStorage.setItem('scholarship-theme', theme)
  }
}

deleteFixtures()
const browser = await chromium.launch()
console.log(`engine: ${browser.browserType().name()} ${browser.version()}`)
const errors = []
const watch = (page) => {
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  page.on('pageerror', (e) => errors.push(String(e)))
}

const email = `find${Date.now()}@example.com`
const password = 'a-really-good-password-9'
const ctx = await browser.newContext({ viewport: { width: 375, height: 800 }, colorScheme: 'dark' })
await ctx.addInitScript(init, [ONBOARDED, JSON.stringify(PROFILE), null])
const page = await ctx.newPage()
watch(page)
check('registered', (await signIn(page, 'register', { email, password })).status === 201)
await page.goto(`${BASE}/matches`, { waitUntil: 'networkidle' })

console.log('\n-- before the first tap --')
const button = page.getByRole('button', { name: /Find new scholarships/ })
await button.waitFor()
check('the big button is on the page', await button.isVisible())
const box = await button.boundingBox()
check('it is a big target (>= 72px tall, nearly full width)', box.height >= 72 && box.width >= 300, JSON.stringify(box))
check('no New area yet', (await page.locator('.new-area').count()) === 0)
check('status invites the first tap', /Tap to start/.test(await page.locator('.find-new__status').innerText()))
check('theme is light under an OS in dark mode', (await page.evaluate(() => document.documentElement.dataset.theme)) === 'light')

console.log('\n-- first tap sets the baseline --')
await button.click()
await page.getByText(/Checked\. From now on/).waitFor({ timeout: 60000 })
check('first-tap message explains the baseline', /anything new that fits you shows up below/.test(await page.locator('.find-new__status').innerText()))
const state1 = await until(async () => {
  const j = (await api(page, 'GET', '/api/find-state')).json
  return j?.firstCheckedAt > 0 ? j : null
})
check('first tap time reached D1', state1?.firstCheckedAt > 0 && state1?.checkedAt >= state1?.firstCheckedAt, JSON.stringify(state1))
check('still no New area (nothing is added after the baseline yet)', (await page.locator('.new-area').count()) === 0)

console.log('\n-- two awards arrive after the baseline --')
insertFixture('web-fixture01', 'TEST FIXTURE Alpha Nursing Scholarship', ['undergrad', 'nursing', 'need-based'], 1000)
insertFixture('web-fixture02', 'TEST FIXTURE Beta Nursing Grant', ['undergrad', 'nursing', 'women'], 2000)
await page.reload({ waitUntil: 'networkidle' })
const area = page.locator('.new-area')
await area.waitFor()
check('a separate New area appears', await area.isVisible())
const newRows = area.locator('.match-row--new')
check('it lists both awards', (await newRows.count()) === 2, String(await newRows.count()))
check('each row has a New badge', (await area.locator('.match-row__new').count()) === 2)
const ringTexts = await area.locator('.match-ring').allInnerTexts()
check('each row shows a match percentage', ringTexts.length === 2 && ringTexts.every((t) => /^\d{2,3}/.test(t.trim())), JSON.stringify(ringTexts))
const inTop = await page.locator('.list-section .match-row:not(.match-row--new) .match-row__name', { hasText: 'TEST FIXTURE' }).count()
check('they are NOT also in Top matches', inTop === 0, String(inTop))
check('the area heading counts them', /For you \(2\)/.test(await page.locator('.new-area__title').innerText()))
await page.screenshot({ path: `${SHOTS}/new-area-375.png`, fullPage: false })

console.log('\n-- opening one clears its badge --')
const alpha = area.locator('.match-row', { hasText: 'Alpha Nursing' })
const alphaLead = alpha.getByRole('button', { name: /Alpha Nursing Scholarship/ }).first()
await alphaLead.click()
await alpha.locator('.match-row__detail').waitFor()
check('the opened row stays in place and expands (it does not vanish while being read)', await alpha.locator('.match-row__detail').isVisible())
check('its New badge is gone once opened', (await alpha.locator('.match-row__new').count()) === 0)
check('the unopened one keeps its badge', (await area.locator('.match-row--new .match-row__new').count()) === 1)
check('the area heading now counts one', /For you \(1\)/.test(await page.locator('.new-area__title').innerText()))
const seenOnServer = await until(async () => {
  const j = (await api(page, 'GET', '/api/find-state')).json
  return j?.seenIds?.includes('web-fixture01') ? j : null
})
check('the seen mark reached D1', !!seenOnServer, JSON.stringify(seenOnServer))
await alphaLead.click()
await alpha.waitFor({ state: 'detached', timeout: 8000 })
check('closing it releases it from the New area', (await area.locator('.match-row', { hasText: 'Alpha Nursing' }).count()) === 0)

console.log('\n-- hide from the New area --')
await area.getByRole('button', { name: /^Not interested in TEST FIXTURE Beta/ }).click()
await page.getByText(/Hidden TEST FIXTURE Beta/).waitFor()
await area.waitFor({ state: 'detached', timeout: 8000 })
check('with nothing new left the whole area disappears', (await page.locator('.new-area').count()) === 0)

console.log('\n-- a second device sees the same state --')
insertFixture('web-fixture03', 'TEST FIXTURE Gamma Nursing Scholarship', ['undergrad', 'nursing', 'need-based'], 3000)
const ctx2 = await browser.newContext({ viewport: { width: 768, height: 900 } })
await ctx2.addInitScript(init, [ONBOARDED, JSON.stringify(PROFILE), null])
const page2 = await ctx2.newPage()
watch(page2)
await signIn(page2, 'login', { email, password })
await page2.goto(`${BASE}/matches`, { waitUntil: 'networkidle' })
const stateB = await until(async () => {
  const j = await page2.evaluate(() => JSON.parse(localStorage.getItem('scholarship-one-find-state') || 'null'))
  return j?.firstCheckedAt > 0 ? j : null
})
check('device B got the first-tap time from the account', stateB?.firstCheckedAt === state1.firstCheckedAt, JSON.stringify(stateB))
const area2 = page2.locator('.new-area')
await area2.waitFor({ timeout: 10000 })
const names2 = await area2.locator('.match-row__name').allInnerTexts()
check('device B shows only the unopened, un-hidden award', names2.length === 1 && /Gamma/.test(names2[0]), JSON.stringify(names2))
check('device B does not show the one opened on device A', !names2.some((n) => /Alpha/.test(n)))
check('device B does not show the one hidden on device A', !names2.some((n) => /Beta/.test(n)))
await page2.screenshot({ path: `${SHOTS}/new-area-768.png`, fullPage: false })

console.log('\n-- a second tap reports what arrived --')
insertFixture('web-fixture04', 'TEST FIXTURE Delta Nursing Scholarship', ['undergrad', 'nursing', 'need-based'], 4000)
await page2.getByRole('button', { name: /Find new scholarships/ }).click()
await page2.getByText(/new since your last check/).waitFor({ timeout: 60000 })
check('the summary counts awards added since the last tap', /\d+ new since your last check/.test(await page2.locator('.find-new__status').innerText()), await page2.locator('.find-new__status').innerText())
check('the new one now shows in the area', (await area2.locator('.match-row__name', { hasText: 'Delta' }).count()) === 1)

console.log('\n-- signed out: catalog-only check --')
const ctx3 = await browser.newContext({ viewport: { width: 1280, height: 900 } })
await ctx3.addInitScript(init, [ONBOARDED, JSON.stringify(PROFILE), null])
const page3 = await ctx3.newPage()
watch(page3)
await page3.goto(`${BASE}/matches`, { waitUntil: 'networkidle' })
await page3.getByRole('button', { name: /Find new scholarships/ }).click()
await page3.getByText(/Checked\./).waitFor({ timeout: 20000 })
check('signed-out tap works without an account', /Checked\./.test(await page3.locator('.find-new__status').innerText()))
check('the button says what signed-out does', /Checks the catalog/.test(await page3.locator('.find-new__sub').innerText()))
const accountsOn = (await api(page3, 'GET', '/api/auth/session')).json?.enabled !== false
console.log(`  (accounts enabled on this server: ${accountsOn})`)
check(
  'sign-in is offered for web search exactly when accounts are enabled',
  (await page3.locator('.find-new__status').getByRole('button', { name: 'Sign in' }).count()) === (accountsOn ? 1 : 0),
)
check('no horizontal overflow at 1280', await page3.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1))

console.log('\n-- screenshots, both themes at 375 / 768 / 1280 --')
for (const [label, w, h] of [['375', 375, 800], ['768', 768, 900], ['1280', 1280, 900]]) {
  for (const theme of ['light', 'dark']) {
    const c = await browser.newContext({ viewport: { width: w, height: h } })
    await c.addInitScript(init, [ONBOARDED, JSON.stringify(PROFILE), theme])
    const p = await c.newPage()
    watch(p)
    await signIn(p, 'login', { email, password })
    await p.goto(`${BASE}/matches`, { waitUntil: 'networkidle' })
    await p.locator('.new-area').waitFor()
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
    check(`no horizontal overflow at ${w} ${theme}`, !overflow)
    await p.screenshot({ path: `${SHOTS}/find-new-${label}-${theme}.png`, fullPage: true })
    await c.close()
  }
}

deleteFixtures()
console.log(`\nconsole errors: ${errors.length}`)
for (const e of errors.slice(0, 5)) console.log('   ', e.slice(0, 200))
check('zero console errors', errors.length === 0)
console.log(`\n${fail === 0 ? 'ALL CLEAN' : fail + ' FAILURES'} (${pass} passed)`)
await browser.close()
process.exit(fail === 0 ? 0 : 1)
