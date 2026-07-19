// Detail page + destructive-action confirmations, driven in a real browser.
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE || 'http://127.0.0.1:8788'
const SHOTS = 'docs/qa/v5'
mkdirSync(SHOTS, { recursive: true })

let pass = 0
let fail = 0
const check = (n, c, e = '') => {
  if (c) { pass++; console.log(`  ok   ${n}`) }
  else { fail++; console.log(`  FAIL ${n}${e ? ' -> ' + e : ''}`) }
}

const browser = await chromium.launch()
const errors = []
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
// Skip onboarding so its modal never intercepts clicks. Shape must match
// OnboardingState in src/lib/onboarding.ts — a wrong key silently does nothing.
await ctx.addInitScript(() =>
  localStorage.setItem(
    'scholarship-one-onboarding-v1',
    JSON.stringify({ completed: true, skipped: true, completedAt: Date.now() }),
  ),
)
const page = await ctx.newPage()
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push(String(e)))

console.log('\n-- detail page renders --')
await page.goto(`${BASE}/scholarship/uncf`, { waitUntil: 'networkidle' })
check('renders the award name as h1', await page.getByRole('heading', { level: 1, name: /UNCF/i }).isVisible())
check('shows breadcrumb', await page.getByRole('navigation', { name: /breadcrumb/i }).isVisible())
check('shows award amount', (await page.getByText(/award amount/i).count()) > 0)
check('shows eligibility tags', (await page.getByRole('heading', { name: /eligibility tags/i }).count()) > 0)
check('shows application checklist', (await page.getByRole('heading', { name: /application checklist/i }).count()) > 0)
check('links to the official page', (await page.locator('a[href="https://uncf.org/scholarships"]').count()) > 0)
check('official link opens safely in a new tab', await page.evaluate(() => {
  const a = document.querySelector('a[href="https://uncf.org/scholarships"]')
  return a?.getAttribute('target') === '_blank' && /noopener/.test(a?.getAttribute('rel') || '')
}))
check('carries the fee warning', (await page.getByText(/never pay a fee/i).count()) > 0)
await page.screenshot({ path: `${SHOTS}/detail-desktop.png`, fullPage: true })

console.log('\n-- JSON-LD --')
const blocks = await page.locator('script[type="application/ld+json"]').allTextContents()
let program = null
let crumbs = null
for (const b of blocks) {
  try {
    const j = JSON.parse(b)
    if (j['@type'] === 'EducationalOccupationalProgram') program = j
    if (j['@type'] === 'BreadcrumbList') crumbs = j
  } catch { /* asserted below */ }
}
check('emits EducationalOccupationalProgram', !!program, blocks.join(' | ').slice(0, 80))
check('emits BreadcrumbList', !!crumbs)
check('all JSON-LD parses', blocks.every((b) => { try { JSON.parse(b); return true } catch { return false } }))
check('JSON-LD escapes < so a name cannot close the tag', blocks.every((b) => !b.includes('<')))

console.log('\n-- unknown id --')
await page.goto(`${BASE}/scholarship/does-not-exist-xyz`, { waitUntil: 'networkidle' })
check('unknown award explains itself instead of crashing', (await page.getByText(/find that award/i).count()) > 0)
check('offers a route out', (await page.getByRole('link', { name: /browse all scholarships/i }).count()) > 0)

console.log('\n-- save, then confirmed removal --')
await page.goto(`${BASE}/scholarship/uncf`, { waitUntil: 'networkidle' })
await page.getByRole('button', { name: /save to my list/i }).click()
await page.waitForTimeout(500)
check('saving shows a toast', (await page.getByText(/saved uncf/i).count()) > 0)
check('button flips to remove', (await page.getByRole('button', { name: /remove/i }).count()) > 0)
await page.screenshot({ path: `${SHOTS}/detail-saved-toast.png` })

await page.getByRole('button', { name: /saved . remove/i }).click()
await page.waitForTimeout(400)
const dialog = page.locator('[role=alertdialog]')
check('removal opens a confirmation dialog', await dialog.isVisible())
check('dialog is modal', (await dialog.getAttribute('aria-modal')) === 'true')
check('focus starts on Cancel, not the destructive action', await page.evaluate(() => /cancel/i.test(document.activeElement?.textContent || '')))
await page.screenshot({ path: `${SHOTS}/detail-confirm-dialog.png` })

await page.keyboard.press('Escape')
await page.waitForTimeout(350)
check('Escape cancels', !(await dialog.isVisible()))
check('still saved after cancelling', (await page.getByRole('button', { name: /saved . remove/i }).count()) > 0)

await page.getByRole('button', { name: /saved . remove/i }).click()
await page.waitForTimeout(350)
await dialog.getByRole('button', { name: /^remove$/i }).click()
await page.waitForTimeout(500)
check('confirming actually removes', (await page.getByRole('button', { name: /save to my list/i }).count()) > 0)
check('removal shows a toast', (await page.getByText(/removed uncf/i).count()) > 0)

console.log('\n-- notes --')
await page.getByLabel(/notes for this award/i).fill('Ask my counsellor about the essay prompt.')
await page.getByRole('button', { name: /save note/i }).click()
await page.waitForTimeout(400)
check('note saves with a toast', (await page.getByText(/note saved/i).count()) > 0)
await page.reload({ waitUntil: 'networkidle' })
check('note persists across reload', (await page.getByLabel(/notes for this award/i).inputValue()).includes('counsellor'))

await page.getByRole('button', { name: /clear note/i }).click()
await page.waitForTimeout(350)
check('clearing a note asks first', await dialog.isVisible())
await dialog.getByRole('button', { name: /clear note/i }).click()
await page.waitForTimeout(450)
check('note cleared after confirming', (await page.getByLabel(/notes for this award/i).inputValue()) === '')

console.log('\n-- cards link through --')
await page.goto(`${BASE}/results`, { waitUntil: 'networkidle' })
// networkidle fires before React finishes rendering ~200 cards, so wait on the
// element rather than asserting immediately.
const detailLink = page.locator('a[href^="/scholarship/"]').first()
await detailLink.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {})
check('cards expose a detail link', (await page.locator('a[href^="/scholarship/"]').count()) > 0)
await detailLink.click()
await page.waitForTimeout(800)
check('clicking through reaches a detail page', /\/scholarship\//.test(page.url()), page.url())

console.log('\n-- list unsave is also gated --')
await page.goto(`${BASE}/results`, { waitUntil: 'networkidle' })
await page.locator('article.card').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {})
// Card buttons carry a star prefix: '☆ Save' / '★ Saved'.
const saveBtn = page.getByRole('button', { name: /☆ Save/ }).first()
if (await saveBtn.count()) {
  await saveBtn.click()
  await page.waitForTimeout(500)
  check('saving from a list shows a toast', (await page.getByText(/saved .* to your list/i).count()) > 0)
  await page.getByRole('button', { name: /★ Saved/ }).first().click()
  await page.waitForTimeout(500)
  check('unsaving from a list asks first', await dialog.isVisible())
  await dialog.getByRole('button', { name: /cancel/i }).click()
  await page.waitForTimeout(300)
  check('cancelling from a list keeps it saved', (await page.getByRole('button', { name: /★ Saved/ }).count()) > 0)
} else {
  check('unsaving from a list asks first', false, 'no save button found on /results')
}

console.log('\n-- mobile 375 --')
const m = await ctx.newPage()
await m.setViewportSize({ width: 375, height: 812 })
await m.goto(`${BASE}/scholarship/uncf`, { waitUntil: 'networkidle' })
check('no horizontal overflow at 375px', !(await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)))
const overlaps = await m.evaluate(() => {
  const els = [...document.querySelectorAll('h1, h2, p, li, dd, dt')].filter((e) => e.getBoundingClientRect().height > 0)
  let hits = 0
  for (let i = 0; i < els.length; i++) {
    for (let j = i + 1; j < els.length; j++) {
      if (els[i].contains(els[j]) || els[j].contains(els[i])) continue
      const a = els[i].getBoundingClientRect()
      const b = els[j].getBoundingClientRect()
      if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) hits++
    }
  }
  return hits
})
check(`no overlapping text at 375px (${overlaps})`, overlaps === 0)
await m.screenshot({ path: `${SHOTS}/detail-mobile.png`, fullPage: true })

console.log('\n-- console --')
check(`no console errors (${errors.length})`, errors.length === 0, errors.slice(0, 3).join(' | '))

await browser.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
