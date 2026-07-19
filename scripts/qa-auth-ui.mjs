// Drives the real auth screens in a browser: register, sign out, sign in,
// validation, mobile layout, and console cleanliness.
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE || 'http://127.0.0.1:8788'
const SHOTS = 'docs/qa/v5'
mkdirSync(SHOTS, { recursive: true })

let pass = 0, fail = 0
const check = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}`) }
  else { fail++; console.log(`  FAIL ${name}${extra ? ' -> ' + extra : ''}`) }
}

const browser = await chromium.launch()
const errors = []
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await ctx.newPage()
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push(String(e)))

const email = `qa${Date.now()}@example.com`
const password = 'a-really-good-password-9'

console.log('\n-- register screen --')
await page.goto(`${BASE}/register`, { waitUntil: 'networkidle' })
check('register route renders', await page.getByRole('heading', { name: /create your account/i }).isVisible())
check('has email input', await page.locator('input[type=email]').isVisible())
check('has 2 password inputs', (await page.locator('input[type=password]').count()) === 2)
await page.screenshot({ path: `${SHOTS}/register-desktop.png`, fullPage: true })

console.log('\n-- client validation --')
await page.getByRole('button', { name: /create account/i }).click()
await page.waitForTimeout(300)
check('blocks empty submit with inline errors', (await page.locator('[role=alert]').count()) > 0)

await page.locator('input[type=email]').fill(email)
await page.locator('input[type=password]').first().fill('short')
await page.locator('input[type=password]').nth(1).fill('short')
await page.getByRole('button', { name: /create account/i }).click()
await page.waitForTimeout(300)
check('rejects short password client-side', (await page.getByText(/at least 12 characters/i).count()) > 0)

await page.locator('input[type=password]').first().fill(password)
await page.locator('input[type=password]').nth(1).fill('a-different-password-8')
await page.getByRole('button', { name: /create account/i }).click()
await page.waitForTimeout(300)
check('catches password mismatch', (await page.getByText(/need to match/i).count()) > 0)

console.log('\n-- password affordances --')
await page.locator('input[type=password]').first().fill(password)
check('strength meter appears', (await page.getByText(/strong|good|fair/i).count()) > 0)
const toggle = page.getByRole('button', { name: /show password/i }).first()
await toggle.click()
check('show-password reveals text', (await page.locator('input[type=text]').count()) >= 1)
await page.getByRole('button', { name: /hide password/i }).first().click()

console.log('\n-- register succeeds --')
await page.locator('input[type=password]').nth(1).fill(password)
await page.getByRole('button', { name: /create account/i }).click()
await page.waitForURL(/\/matches/, { timeout: 15000 }).catch(() => {})
check('redirects to /matches after register', page.url().includes('/matches'), page.url())
const sess = await page.evaluate(() => fetch('/api/auth/session', { credentials: 'include' }).then((r) => r.json()))
check('session cookie is live in the browser', sess?.email === email, JSON.stringify(sess))
await page.screenshot({ path: `${SHOTS}/after-register.png` })

console.log('\n-- duplicate register surfaces server error --')
await page.evaluate(() => fetch('/api/auth/signout', { method: 'POST', credentials: 'include' }))
await page.goto(`${BASE}/register`, { waitUntil: 'networkidle' })
await page.locator('input[type=email]').fill(email)
await page.locator('input[type=password]').first().fill(password)
await page.locator('input[type=password]').nth(1).fill(password)
await page.getByRole('button', { name: /create account/i }).click()
await page.waitForTimeout(1200)
check('shows "already exists" from the API', (await page.getByText(/already exists/i).count()) > 0)
await page.screenshot({ path: `${SHOTS}/register-duplicate-error.png` })

console.log('\n-- login --')
await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
check('login route renders', await page.getByRole('heading', { name: /welcome back/i }).isVisible())
await page.screenshot({ path: `${SHOTS}/login-desktop.png`, fullPage: true })
await page.locator('input[type=email]').fill(email)
await page.locator('input[type=password]').fill('the-wrong-password-1')
await page.getByRole('button', { name: /^sign in$/i }).click()
await page.waitForTimeout(1200)
check('wrong password shows an error', (await page.getByText(/did not match/i).count()) > 0)

await page.locator('input[type=password]').fill(password)
await page.getByRole('button', { name: /^sign in$/i }).click()
await page.waitForURL(/\/matches/, { timeout: 15000 }).catch(() => {})
check('correct password signs in', page.url().includes('/matches'), page.url())

console.log('\n-- forgot / reset routes --')
await page.goto(`${BASE}/forgot-password`, { waitUntil: 'networkidle' })
check('forgot-password renders', await page.getByRole('heading', { name: /reset your password/i }).isVisible())
await page.screenshot({ path: `${SHOTS}/forgot-desktop.png`, fullPage: true })
await page.goto(`${BASE}/reset`, { waitUntil: 'networkidle' })
check('reset without token explains itself', (await page.getByText(/incomplete/i).count()) > 0)

console.log('\n-- mobile 375 --')
const mobile = await ctx.newPage()
mobile.on('console', (m) => { if (m.type() === 'error') errors.push('mobile: ' + m.text()) })
await mobile.setViewportSize({ width: 375, height: 812 })
for (const route of ['register', 'login', 'forgot-password']) {
  await mobile.goto(`${BASE}/${route}`, { waitUntil: 'networkidle' })
  await mobile.screenshot({ path: `${SHOTS}/${route}-mobile.png`, fullPage: true })
  const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
  check(`/${route} has no horizontal overflow at 375px`, !overflow)
  // WCAG 2.2 SC 2.5.8 (AA) sets a 24x24 floor and exempts targets sitting inline
  // in a sentence. The skip link is 1x1 until focused, which is its whole point.
  const small = await mobile.evaluate(() =>
    [...document.querySelectorAll('button, a')]
      .filter((el) => {
        const r = el.getBoundingClientRect()
        if (r.width === 0 || r.height === 0) return false
        if (el.closest('p')) return false
        if ((el.textContent || '').trim() === 'Skip to content') return false
        return r.height < 24 || r.width < 24
      })
      .map((el) => `${(el.textContent || '').trim().slice(0, 24)} ${Math.round(el.getBoundingClientRect().height)}px`),
  )
  check(`/${route} standalone tap targets meet 24px (${small.length} under)`, small.length === 0, small.join(', '))
}

console.log('\n-- console --')
// This run deliberately provokes a 409 (duplicate register) and a 401 (wrong
// password). Chrome logs every failed response as a console error, so those two
// are expected noise. Anything else — and any thrown JS error — is a real defect.
const EXPECTED = /Failed to load resource: the server responded with a status of (409|401)/
const real = errors.filter((e) => !EXPECTED.test(e))
check(`no unexpected console errors (${real.length} of ${errors.length} total)`, real.length === 0, real.slice(0, 3).join(' | '))

await browser.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
