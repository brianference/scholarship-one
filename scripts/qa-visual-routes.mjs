/**
 * Visual inspect all primary routes on production (desktop + mobile).
 * Screenshots → docs/visual-audit/
 * Run: node scripts/qa-visual-routes.mjs
 */
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'docs/visual-audit')
mkdirSync(outDir, { recursive: true })

const base = 'https://scholarship-one.pages.dev'
const routes = ['/', '/matches', '/results', '/digest', '/tracker', '/path', '/activity', '/pipeline']
const findings = []
const log = []

function note(level, msg) {
  log.push(`${level} ${msg}`)
  console.log(`${level} ${msg}`)
  if (level === 'FAIL' || level === 'GAP') findings.push({ level, msg })
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
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })
  page.on('pageerror', (err) => consoleErrors.push(err.message))

  // Fresh onboarding once per viewport
  await page.goto(`${base}/`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(500)

  const asset = await page.evaluate(() => {
    const s = document.querySelector('script[src*="assets/index"]')
    return s?.getAttribute('src') || ''
  })
  note('OK', `${vp.name}: asset ${asset}`)

  const onboard = await page.locator('.onboard-overlay').count()
  if (onboard > 0) {
    note('OK', `${vp.name}: onboarding visible`)
    await page.getByRole('button', { name: 'Continue' }).click().catch(() => {})
    await page.waitForTimeout(150)
    await page.getByRole('button', { name: 'Continue' }).click().catch(() => {})
    await page.waitForTimeout(150)
    const selects = page.locator('.onboard-modal select')
    if ((await selects.count()) >= 1) {
      await selects.nth(0).selectOption({ label: 'Accounting' }).catch(async () => {
        await selects.nth(0).selectOption({ index: 1 })
      })
    }
    const showBtn = page.getByRole('button', { name: /Show Matches|Show my matches/i })
    await showBtn.click()
    await page.waitForTimeout(1800)
    const url = page.url()
    if (url.includes('/matches')) note('OK', `${vp.name}: onboard → /matches`)
    else if (url.includes('/results')) note('GAP', `${vp.name}: onboard landed ${url} (expected /matches)`)
    else note('FAIL', `${vp.name}: onboard landed ${url}`)
  } else {
    note('GAP', `${vp.name}: onboarding not shown (returning user storage?)`)
  }

  for (const route of routes) {
    await page.goto(`${base}${route}`, { waitUntil: 'networkidle', timeout: 45000 })
    await page.waitForTimeout(400)
    const finalUrl = page.url()
    const shot = `${vp.name}${route === '/' ? '-home' : route.replace(/\//g, '-')}.png`
    await page.screenshot({ path: join(outDir, shot), fullPage: true })

    const h1 = await page.locator('h1, h2.h2-section').first().textContent().catch(() => '')
    const navCount = await page.locator('.topbar__nav a').count()
    const mainH = await page.locator('#main-content').boundingBox()
    const bodyText = await page.locator('body').innerText()

    note('OK', `${vp.name} ${route} → ${finalUrl.replace(base, '')} h="${(h1 || '').trim().slice(0, 40)}" nav=${navCount} shot=${shot}`)

    if (route === '/pipeline' && !finalUrl.includes('/tracker')) {
      note('FAIL', `${vp.name}: /pipeline did not redirect to tracker (${finalUrl})`)
    }
    if (route === '/matches' && !/match/i.test(bodyText)) {
      note('FAIL', `${vp.name}: /matches missing match copy`)
    }
    if (route === '/tracker' && !/track/i.test(bodyText)) {
      note('FAIL', `${vp.name}: /tracker missing track copy`)
    }
    if (navCount < 3 && route !== '/') {
      note('WARN', `${vp.name} ${route}: few nav links (${navCount})`)
    }
    // Horizontal overflow rough check
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2)
    if (overflow) note('GAP', `${vp.name} ${route}: horizontal overflow`)

    // Critical interactive elements
    if (route === '/matches') {
      const ai = await page.locator('.page-ai-actions button, button:has-text("Explain")').count()
      if (ai < 1) note('GAP', `${vp.name}: Matches missing AI action buttons`)
    }
    if (route === '/tracker') {
      const board = await page.locator('#tracker, .pipeline-board').count()
      if (board < 1) note('GAP', `${vp.name}: Tracker board missing`)
    }

    if (mainH && mainH.y > vp.height * 0.55 && route !== '/') {
      note('GAP', `${vp.name} ${route}: main content starts low (y=${Math.round(mainH.y)})`)
    }
  }

  // Header search smoke
  await page.goto(`${base}/matches`, { waitUntil: 'networkidle' })
  const search = page.locator('.header-search__input:visible').first()
  if ((await search.count()) > 0) {
    await search.fill('nursing undergrad')
    await page.locator('.header-search:visible .header-search__btn').first().click()
    await page.waitForTimeout(1200)
    if (page.url().includes('/matches') || page.url().includes('/results')) {
      note('OK', `${vp.name}: header search navigated ${page.url().replace(base, '')}`)
    } else note('FAIL', `${vp.name}: header search → ${page.url()}`)
  } else {
    note('GAP', `${vp.name}: header search not visible`)
  }

  if (consoleErrors.length) {
    note('FAIL', `${vp.name}: console errors: ${consoleErrors.slice(0, 3).join(' | ')}`)
  } else {
    note('OK', `${vp.name}: no console errors`)
  }

  await context.close()
}

await browser.close()

const md = `# Visual route audit

**Date:** ${new Date().toISOString()}  
**Base:** ${base}

## Findings

${findings.length ? findings.map((f) => `- **${f.level}:** ${f.msg}`).join('\n') : '_No FAIL/GAP findings._'}

## Log

\`\`\`
${log.join('\n')}
\`\`\`

Screenshots in \`docs/visual-audit/\`.
`
writeFileSync(join(outDir, 'VISUAL-AUDIT.md'), md)
writeFileSync(join(outDir, 'visual-audit-log.txt'), log.join('\n'))

console.log('\n——')
console.log(`Findings: ${findings.length}`)
console.log(`Shots: ${outDir}`)
if (findings.some((f) => f.level === 'FAIL')) process.exit(1)
