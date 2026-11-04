// v5.3.0 browser QA (Chromium): hide a match, set a remind-to-apply date, and prove both
// plus the profile reach D1 and come back on a fresh "device" (new browser context).
// Needs `wrangler pages dev dist` + local D1.  BASE=http://127.0.0.1:8799 node scripts/qa-account-sync-ui.mjs
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE || 'http://127.0.0.1:8788'
const SHOTS = process.env.SHOTS || 'docs/qa/v5.3'
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

/** Poll a real condition (server state) until it holds or the deadline passes. */
async function until(fn, timeoutMs = 8000) {
  const end = Date.now() + timeoutMs
  let last
  while (Date.now() < end) {
    last = await fn()
    if (last) return last
    await new Promise((r) => setTimeout(r, 150))
  }
  return last
}

/**
 * Call the API from inside the page, so the browser itself stores and sends the Secure
 * session cookie (Playwright's Node-side request jar drops Secure cookies over http).
 */
async function api(page, method, path, body) {
  return page.evaluate(
    async ([m, p, b]) => {
      const r = await fetch(p, { method: m, headers: { 'Content-Type': 'application/json' }, body: b ? JSON.stringify(b) : undefined })
      let j = null
      try {
        j = await r.json()
      } catch {
        /* empty body */
      }
      return { status: r.status, json: j }
    },
    [method, path, body ?? null],
  )
}

/** Open a blank same-origin page and sign in (kind = 'register' | 'login'). */
async function signIn(page, kind, creds) {
  await page.goto(`${BASE}/api/health`)
  return api(page, 'POST', `/api/auth/${kind}`, creds)
}

/** Local YYYY-MM-DD, `offset` days from today (same rule the app uses). */
function dayString(offset) {
  const now = new Date()
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const PROFILE = { major: 'engineering', state: 'any', level: 'undergrad', identity: 'any', need: 'any' }
const ONBOARDED = JSON.stringify({ completed: true, skipped: false, completedAt: 1 })

const browser = await chromium.launch()
console.log(`engine: ${browser.browserType().name()} ${browser.version()}`)
const errors = []
const watch = (page) => {
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  page.on('pageerror', (e) => errors.push(String(e)))
}

const email = `qa${Date.now()}@example.com`
const password = 'a-really-good-password-9'

// ---------------- device A: an existing user with a local-only profile ----------------
const ctxA = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'dark' })
await ctxA.addInitScript(
  ([profile, onboarded]) => {
    if (!localStorage.getItem('scholarship-one-onboarding-v1')) {
      localStorage.setItem('scholarship-one-onboarding-v1', onboarded)
      localStorage.setItem('scholarship-one-profile', profile)
    }
  },
  [JSON.stringify(PROFILE), ONBOARDED],
)
const pageA = await ctxA.newPage()
watch(pageA)
const reg = await signIn(pageA, 'register', { email, password })
check('device A registered', reg.status === 201, String(reg.status))
await pageA.goto(`${BASE}/matches`, { waitUntil: 'networkidle' })

console.log('\n-- light is the default even with an OS in dark mode --')
check('data-theme is light under OS dark', (await pageA.evaluate(() => document.documentElement.dataset.theme)) === 'light')

console.log('\n-- legacy local profile is uploaded on first sign-in --')
const serverProfile = await until(async () => {
  const j = (await api(pageA, 'GET', '/api/profile')).json
  return j?.profile ? j : null
})
check('server now holds the local profile', serverProfile?.profile?.major === 'engineering', JSON.stringify(serverProfile))
check('the upload was stamped', (serverProfile?.updatedAt ?? 0) > 0)

console.log('\n-- hide a match --')
const rows = pageA.locator('.match-row')
await rows.first().waitFor()
const before = await rows.count()
const firstName = (await rows.first().locator('.match-row__name').innerText()).replace(/^Suggested\s*/i, '').trim()
await pageA.getByRole('button', { name: new RegExp(`^Not interested in ${firstName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) }).click()
await pageA.getByText(`Hidden ${firstName}.`).waitFor()
check('toast confirms the hide and offers Undo', await pageA.getByRole('button', { name: 'Undo' }).isVisible())
const nameStillListed = await pageA.locator('.match-row__name', { hasText: firstName }).count()
check('hidden award left the list', nameStillListed === 0, `${nameStillListed} rows still show it`)
check('the list refilled to the same length', (await rows.count()) === before, `${before} -> ${await rows.count()}`)
check('Hidden scholarships panel appears', await pageA.getByText(/Hidden scholarships \(1\)/).isVisible())

await pageA.getByRole('button', { name: 'Undo' }).click()
await pageA.locator('.match-row__name', { hasText: firstName }).first().waitFor()
check('Undo brings it back', (await pageA.locator('.match-row__name', { hasText: firstName }).count()) >= 1)
check('panel gone after undo', (await pageA.getByText(/Hidden scholarships/).count()) === 0)

await pageA.getByRole('button', { name: new RegExp(`^Not interested in ${firstName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) }).click()
await pageA.getByText(/Hidden scholarships \(1\)/).waitFor()
const hiddenOnServer = await until(async () => {
  const j = (await api(pageA, 'GET', '/api/hidden')).json
  return j?.ids?.length === 1 ? j.ids : null
})
check('hidden id reached D1', Array.isArray(hiddenOnServer) && hiddenOnServer.length === 1, JSON.stringify(hiddenOnServer))
const hiddenId = hiddenOnServer?.[0]

console.log('\n-- remind to apply --')
const second = rows.nth(1)
const secondName = (await second.locator('.match-row__name').innerText()).replace(/^Suggested\s*/i, '').trim()
await second.getByRole('button', { name: /^Remind me to apply to/ }).click()
await pageA.screenshot({ path: `${SHOTS}/A-picker-open-1280-light.png`, fullPage: true })
await second.getByRole('button', { name: /^In 3 days/ }).click()
const want = dayString(3)
await second.getByRole('button', { name: /^Reminder for/ }).waitFor()
const chip = await second.locator('.row-action.is-on').innerText()
check('row shows the chosen day', /Remind [A-Z][a-z]{2} \d{1,2}$/.test(chip.trim()), JSON.stringify(chip))
const saved = await until(async () => {
  const j = (await api(pageA, 'GET', '/api/saves')).json
  return j?.saves?.find((s) => s.remindOn === want) || null
})
check('reminder date reached D1 on a saved row', !!saved, `wanted ${want}`)
const remindedId = saved?.id
const shortlistA = await pageA.evaluate(() => JSON.parse(localStorage.getItem('scholarship-one-shortlist') || '[]'))
check('setting a reminder saved the award locally', shortlistA.includes(remindedId), JSON.stringify(shortlistA))

// ---------------- device B: fresh browser storage, same account ----------------
console.log('\n-- fresh device (empty localStorage) --')
const ctxB = await browser.newContext({ viewport: { width: 375, height: 800 } })
await ctxB.addInitScript((onboarded) => {
  if (!localStorage.getItem('scholarship-one-onboarding-v1')) localStorage.setItem('scholarship-one-onboarding-v1', onboarded)
}, ONBOARDED)
const pageB = await ctxB.newPage()
watch(pageB)
const login = await signIn(pageB, 'login', { email, password })
check('device B signs in', login.status === 200, String(login.status))
await pageB.goto(`${BASE}/matches`, { waitUntil: 'networkidle' })
await pageB.getByText(/Hidden scholarships \(1\)/).waitFor()
check('hidden list restored from D1', await pageB.getByText(/Hidden scholarships \(1\)/).isVisible())
check('hidden award is not in the matches', (await pageB.locator('.match-row__name', { hasText: firstName }).count()) === 0)
const profileB = await pageB.evaluate(() => JSON.parse(localStorage.getItem('scholarship-one-profile') || 'null'))
check('profile restored from D1 on a blank device', profileB?.major === 'engineering', JSON.stringify(profileB))
const shortlistB = await pageB.evaluate(() => JSON.parse(localStorage.getItem('scholarship-one-shortlist') || '[]'))
check('reminded award is in the restored saved list', shortlistB.includes(remindedId), JSON.stringify(shortlistB))
const remindB = await pageB.evaluate(() => JSON.parse(localStorage.getItem('scholarship-one-remind-on') || '{}'))
check('reminder date restored on device B', remindB[remindedId] === want, JSON.stringify(remindB))
check('no horizontal overflow at 375', await pageB.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1))
const tapTargets = await pageB.evaluate(() =>
  [...document.querySelectorAll('.row-action')].map((el) => Math.round(el.getBoundingClientRect().height)),
)
check('row actions are at least 44px tall', tapTargets.length > 0 && tapTargets.every((h) => h >= 44), JSON.stringify(tapTargets))

console.log('\n-- restore from the Hidden panel on device B --')
await pageB.getByText(/Hidden scholarships \(1\)/).click()
await pageB.getByRole('button', { name: 'Restore' }).click()
await pageB.locator('.match-row__name', { hasText: firstName }).first().waitFor()
check('Restore returns it to the list', (await pageB.locator('.match-row__name', { hasText: firstName }).count()) >= 1)
check('panel gone after restore', (await pageB.getByText(/Hidden scholarships/).count()) === 0)
const emptied = await until(async () => {
  const j = (await api(pageB, 'GET', '/api/hidden')).json
  return j?.ids?.length === 0
})
check('restore reached D1', emptied === true)

console.log('\n-- a profile edit on device A reaches a third blank device --')
await pageA.goto(`${BASE}/results`, { waitUntil: 'networkidle' })
await pageA.getByRole('button', { name: 'Filters & profile' }).click()
await pageA.getByLabel('Major or field').selectOption('nursing')
await pageA.getByRole('button', { name: 'Save profile only' }).click()
const nursing = await until(async () => {
  const j = (await api(pageA, 'GET', '/api/profile')).json
  return j?.profile?.major === 'nursing' ? j : null
})
check('edited profile reached D1', nursing?.profile?.major === 'nursing', JSON.stringify(nursing))
check('edit is newer than the first upload', (nursing?.updatedAt ?? 0) > (serverProfile?.updatedAt ?? 0))
const ctxC = await browser.newContext({ viewport: { width: 768, height: 900 } })
await ctxC.addInitScript((onboarded) => {
  if (!localStorage.getItem('scholarship-one-onboarding-v1')) localStorage.setItem('scholarship-one-onboarding-v1', onboarded)
}, ONBOARDED)
const pageC = await ctxC.newPage()
watch(pageC)
await signIn(pageC, 'login', { email, password })
await pageC.goto(`${BASE}/matches`, { waitUntil: 'networkidle' })
const profileC = await until(async () => {
  const p = await pageC.evaluate(() => JSON.parse(localStorage.getItem('scholarship-one-profile') || 'null'))
  return p?.major === 'nursing' ? p : null
})
check('third device shows the edited profile', profileC?.major === 'nursing', JSON.stringify(profileC))

console.log('\n-- screenshots (375 / 768 / 1280, light + dark) --')
for (const [label, w, h] of [
  ['375', 375, 800],
  ['768', 768, 900],
  ['1280', 1280, 900],
]) {
  for (const theme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } })
    await ctx.addInitScript(
      ([onboarded, t, profile]) => {
        localStorage.setItem('scholarship-one-onboarding-v1', onboarded)
        localStorage.setItem('scholarship-one-profile', profile)
        localStorage.setItem('scholarship-theme', t)
      },
      [ONBOARDED, theme, JSON.stringify(PROFILE)],
    )
    const p = await ctx.newPage()
    watch(p)
    await signIn(p, 'login', { email, password })
    await p.goto(`${BASE}/matches`, { waitUntil: 'networkidle' })
    await p.locator('.match-row').first().waitFor()
    const r = p.locator('.match-row').nth(1)
    await r.getByRole('button', { name: /^(Reminder for|Remind me to apply to)/ }).click()
    await p.screenshot({ path: `${SHOTS}/matches-${label}-${theme}.png`, fullPage: true })
    await ctx.close()
  }
}

console.log(`\nconsole errors: ${errors.length}`)
for (const e of errors.slice(0, 5)) console.log('   ', e.slice(0, 200))
check('zero console errors', errors.length === 0)
console.log(`\n${fail === 0 ? 'ALL CLEAN' : fail + ' FAILURES'} (${pass} passed)`)
await browser.close()
process.exit(fail === 0 ? 0 : 1)
