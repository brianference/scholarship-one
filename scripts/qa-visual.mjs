/**
 * Mobile + desktop visual inspection via Playwright.
 * Starts vite preview, screenshots key routes at 2 viewports, asserts critical UI.
 *
 * Run: node scripts/qa-visual.mjs
 */
import { createServer } from 'node:http'
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs'
import { dirname, join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const outDir = join(root, 'docs/visual')
const failures = []
const log = []

function ok(m) {
  log.push(`OK ${m}`)
  console.log(`OK  ${m}`)
}
function fail(m) {
  failures.push(m)
  log.push(`FAIL ${m}`)
  console.error(`FAIL ${m}`)
}

function contentType(p) {
  const e = extname(p)
  return (
    {
      '.html': 'text/html; charset=utf-8',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.svg': 'image/svg+xml',
      '.json': 'application/json',
      '.ico': 'image/x-icon',
    }[e] || 'application/octet-stream'
  )
}

/** Serve dist with SPA fallback (mirrors Cloudflare _redirects). */
function startStaticServer(port) {
  const server = createServer((req, res) => {
    try {
      let urlPath = decodeURIComponent((req.url || '/').split('?')[0])
      if (urlPath === '/') urlPath = '/index.html'
      let filePath = join(dist, urlPath.replace(/^\//, ''))
      if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
        filePath = join(dist, 'index.html')
      }
      // prevent path escape
      if (!filePath.startsWith(dist)) {
        res.writeHead(403)
        res.end('forbidden')
        return
      }
      const body = readFileSync(filePath)
      res.writeHead(200, { 'Content-Type': contentType(filePath) })
      res.end(body)
    } catch (e) {
      res.writeHead(500)
      res.end(String(e))
    }
  })
  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => resolve(server))
  })
}

async function run() {
  if (!existsSync(join(dist, 'index.html'))) {
    fail('dist/index.html missing — run npm run build first')
    process.exit(1)
  }
  mkdirSync(outDir, { recursive: true })

  const port = 4177
  const server = await startStaticServer(port)
  const base = `http://127.0.0.1:${port}`
  ok(`static server ${base}`)

  const browser = await chromium.launch({ headless: true })
  const viewports = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
  ]
  const routes = [
    { path: '/', name: 'landing', expectText: ['How Scholarship One works', 'Find scholarships', 'Search'] },
    { path: '/results', name: 'results', expectText: ['Scholarships', 'Your results', 'About you'] },
    { path: '/digest', name: 'digest', expectText: ['Deadline digest', 'digest'] },
    { path: '/pipeline', name: 'pipeline', expectText: ['Application pipeline', 'Saved'] },
    { path: '/path', name: 'path', expectText: ['Your path', 'Jump to'] },
    { path: '/activity', name: 'activity', expectText: ['Your activity', 'Searches'] },
  ]

  try {
    for (const vp of viewports) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 1,
      })
      const page = await context.newPage()

      // Clear storage so onboarding can be tested cleanly on landing
      await page.goto(base + '/', { waitUntil: 'networkidle' })
      await page.evaluate(() => localStorage.clear())
      await page.reload({ waitUntil: 'networkidle' })

      // Landing + onboarding modal
      const hasOnboard = await page.locator('.onboard-overlay, [aria-modal="true"]').count()
      if (hasOnboard > 0) ok(`${vp.name}: onboarding modal visible on first load`)
      else fail(`${vp.name}: onboarding modal NOT visible on first load`)

      // Complete onboarding
      if (hasOnboard > 0) {
        // Step 0 continue
        await page.getByRole('button', { name: 'Continue' }).click()
        await page.waitForTimeout(200)
        // Step 1 — pick California if select exists
        const stateSelect = page.locator('select[aria-label="State (for regional awards)"], .onboard-modal select').first()
        if (await stateSelect.count()) {
          // may be on step 1
        }
        await page.getByRole('button', { name: 'Continue' }).click()
        await page.waitForTimeout(200)
        // Step 2 — set major nursing if possible
        const selects = page.locator('.onboard-modal select')
        const count = await selects.count()
        if (count >= 1) {
          await selects.nth(0).selectOption({ label: 'Nursing' }).catch(async () => {
            await selects.nth(0).selectOption({ index: 1 })
          })
        }
        await page.getByRole('button', { name: 'Show my matches' }).click()
        await page.waitForTimeout(800)

        const url = page.url()
        if (url.includes('/results')) ok(`${vp.name}: onboarding navigated to /results`)
        else fail(`${vp.name}: onboarding URL is ${url}, expected /results`)

        const scrollY = await page.evaluate(() => window.scrollY)
        if (scrollY <= 20) ok(`${vp.name}: scroll near top after onboarding (${scrollY})`)
        else fail(`${vp.name}: scrollY=${scrollY} after onboarding (expected ~0)`)

        const banner = page.locator('.results-workspace-banner')
        const bannerText = page.getByText('Your results')
        if ((await banner.count()) > 0 || (await bannerText.count()) > 0) ok(`${vp.name}: results banner visible`)
        else fail(`${vp.name}: results banner missing`)

        const cards = page.locator('.result-row, .row-card')
        const cardCount = await cards.count()
        if (cardCount >= 1) ok(`${vp.name}: ${cardCount} result cards visible`)
        else fail(`${vp.name}: no result cards after onboarding`)

        await page.screenshot({ path: join(outDir, `${vp.name}-after-onboarding.png`), fullPage: true })
        ok(`${vp.name}: screenshot after-onboarding.png`)
      }

      // Route screenshots + text checks
      for (const route of routes) {
        await page.goto(base + route.path, { waitUntil: 'networkidle' })
        await page.waitForTimeout(300)
        // dismiss onboarding if it appears again
        const skip = page.getByRole('button', { name: /Skip for now/i })
        if (await skip.count()) await skip.click().catch(() => {})

        const bodyText = await page.locator('body').innerText()
        let found = 0
        for (const t of route.expectText) {
          if (bodyText.toLowerCase().includes(t.toLowerCase())) found++
        }
        if (found >= Math.min(2, route.expectText.length)) ok(`${vp.name} ${route.path}: content ok (${found}/${route.expectText.length})`)
        else fail(`${vp.name} ${route.path}: missing expected text (found ${found})`)

        // Layout smoke: no horizontal overflow
        const overflow = await page.evaluate(() => {
          const doc = document.documentElement
          return doc.scrollWidth > doc.clientWidth + 2
        })
        if (!overflow) ok(`${vp.name} ${route.path}: no horizontal overflow`)
        else fail(`${vp.name} ${route.path}: horizontal overflow`)

        await page.screenshot({ path: join(outDir, `${vp.name}-${route.name}.png`), fullPage: true })
      }

      // Header search from landing (must use a *visible* input)
      await page.evaluate(() =>
        localStorage.setItem('scholarship-one-onboarding-v1', JSON.stringify({ completed: true, skipped: true })),
      )
      await page.goto(base + '/', { waitUntil: 'networkidle' })
      const input = page.locator('.header-search__input:visible').first()
      if (await input.count()) {
        await input.fill('nursing California')
        await page.locator('.header-search:visible .header-search__btn').first().click()
        await page.waitForTimeout(700)
        if (page.url().includes('/results')) ok(`${vp.name}: header search → /results`)
        else fail(`${vp.name}: header search stayed on ${page.url()}`)
        await page.screenshot({ path: join(outDir, `${vp.name}-header-search.png`), fullPage: true })
      } else {
        fail(`${vp.name}: visible header search input not found`)
      }

      // Search remains visible on results for both viewports
      await page.goto(base + '/results', { waitUntil: 'networkidle' })
      const visibleSearch = page.locator('.header-search__input:visible')
      if ((await visibleSearch.count()) > 0) ok(`${vp.name}: search input visible on /results`)
      else fail(`${vp.name}: search input not visible on /results`)

      await context.close()
    }
  } finally {
    await browser.close()
    server.close()
  }

  writeFileSync(
    join(root, 'docs/QA-VISUAL.md'),
    [
      '# Visual inspection report (Playwright)',
      '',
      `Generated: ${new Date().toISOString()}`,
      `Failures: ${failures.length}`,
      `Screenshots: docs/visual/`,
      '',
      '## Log',
      '',
      ...log.map((l) => `- ${l}`),
      '',
      '## Failures',
      '',
      failures.length ? failures.map((f) => `- ${f}`).join('\n') : '_None_',
      '',
    ].join('\n'),
  )
  console.log(`\nVisual report docs/QA-VISUAL.md — failures=${failures.length}`)
  process.exit(failures.length ? 1 : 0)
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
