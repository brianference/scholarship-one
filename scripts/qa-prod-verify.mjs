/**
 * Verify LIVE production — Matches-first product + Tracker rename.
 * node scripts/qa-prod-verify.mjs
 */
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'docs/visual-prod')
mkdirSync(outDir, { recursive: true })

const base = 'https://scholarship-one.pages.dev'
const failures = []
const lines = []

function ok(m) {
  lines.push(`OK ${m}`)
  console.log(`OK  ${m}`)
}
function fail(m) {
  failures.push(m)
  lines.push(`FAIL ${m}`)
  console.error(`FAIL ${m}`)
}

const browser = await chromium.launch({ headless: true })

for (const vp of [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
  })
  const page = await context.newPage()
  const consoleErrors = []
  page.on('pageerror', (e) => consoleErrors.push(e.message))

  await page.goto(`${base}/`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(500)

  const asset = await page.evaluate(() => {
    const s = document.querySelector('script[src*="assets/index"]')
    return s ? s.getAttribute('src') : null
  })
  ok(`${vp.name}: asset ${asset}`)

  const modalCount = await page.locator('.onboard-overlay').count()
  if (modalCount > 0) {
    ok(`${vp.name}: onboarding visible`)
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.waitForTimeout(200)
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.waitForTimeout(200)
    const selects = page.locator('.onboard-modal select')
    if ((await selects.count()) >= 1) {
      await selects
        .nth(0)
        .selectOption({ label: 'Accounting' })
        .catch(async () => {
          await selects.nth(0).selectOption({ index: 1 })
        })
    }
    await page.getByRole('button', { name: /Show Matches|Show my matches/i }).click()
    await page.waitForTimeout(1500)
  } else {
    fail(`${vp.name}: onboarding not shown after clear`)
  }

  const url = page.url()
  if (url.includes('/matches')) ok(`${vp.name}: landed on /matches`)
  else fail(`${vp.name}: URL is ${url} (expected /matches)`)

  // Primary nav should not wrap Path as peer (More menu)
  const navText = await page.locator('.topbar__nav').innerText()
  if (/\bMore\b/i.test(navText)) ok(`${vp.name}: More menu present`)
  else fail(`${vp.name}: More menu missing`)

  // Matches content
  const body = await page.locator('body').innerText()
  if (/Top matches|Matches for you|AI match coach/i.test(body)) ok(`${vp.name}: Matches copy present`)
  else fail(`${vp.name}: Matches page content missing`)

  // Save top 3 button
  if ((await page.getByRole('button', { name: /Save top 3/i }).count()) > 0) {
    ok(`${vp.name}: Save top 3 control`)
  } else fail(`${vp.name}: Save top 3 missing`)

  // Tracker route
  await page.goto(`${base}/tracker`, { waitUntil: 'networkidle' })
  if (/Application tracker/i.test(await page.locator('body').innerText())) ok(`${vp.name}: Tracker page`)
  else fail(`${vp.name}: Tracker missing`)

  // Pipeline redirect
  await page.goto(`${base}/pipeline`, { waitUntil: 'networkidle' })
  if (page.url().includes('/tracker')) ok(`${vp.name}: /pipeline → /tracker`)
  else fail(`${vp.name}: pipeline redirect failed ${page.url()}`)

  // Health API
  const health = await page.evaluate(async () => {
    try {
      const r = await fetch('/api/health')
      return { status: r.status, body: await r.text() }
    } catch (e) {
      return { status: 0, body: String(e) }
    }
  })
  if (health.status === 200) ok(`${vp.name}: /api/health 200`)
  else fail(`${vp.name}: /api/health ${health.status} ${health.body.slice(0, 80)}`)

  await page.screenshot({ path: join(outDir, `${vp.name}-verify.png`), fullPage: true })

  if (consoleErrors.length) fail(`${vp.name}: console ${consoleErrors[0]}`)
  else ok(`${vp.name}: no page errors`)

  await context.close()
}

await browser.close()

const report = [`# Prod verify ${new Date().toISOString()}`, ...lines, failures.length ? `FAILURES: ${failures.length}` : 'ALL OK'].join(
  '\n',
)
writeFileSync(join(outDir, 'PROD-VERIFY.md'), report)
console.log(failures.length ? `FAILED ${failures.length}` : 'ALL OK')
process.exit(failures.length ? 1 : 0)
