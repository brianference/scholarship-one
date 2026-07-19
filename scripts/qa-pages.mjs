// Verifies the required marketing/legal pages render, submit, and behave on mobile.
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
const BASE = process.env.BASE || 'http://127.0.0.1:8788'
const SHOTS = 'docs/qa/v5'
mkdirSync(SHOTS, { recursive: true })
let pass = 0, fail = 0
const check = (n, c, e = '') => { if (c) { pass++; console.log(`  ok   ${n}`) } else { fail++; console.log(`  FAIL ${n}${e ? ' -> ' + e : ''}`) } }

const browser = await chromium.launch()
const errors = []
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push(String(e)))

const PAGES = [
  { path: '/about', heading: /about us/i },
  { path: '/terms', heading: /terms and conditions/i },
  { path: '/privacy', heading: /privacy policy/i },
  { path: '/contact', heading: /contact us/i },
]

console.log('\n-- pages render --')
for (const p of PAGES) {
  await page.goto(BASE + p.path, { waitUntil: 'networkidle' })
  check(`${p.path} renders its h1`, await page.getByRole('heading', { level: 1, name: p.heading }).isVisible())
  const h1s = await page.locator('h1').count()
  check(`${p.path} has exactly one h1`, h1s === 1, `found ${h1s}`)
  check(`${p.path} shows a breadcrumb`, await page.getByRole('navigation', { name: /breadcrumb/i }).isVisible())
  // Search every block, not just the first: index.html carries a site-wide
  // WebSite block that now precedes the route's BreadcrumbList.
  const lds = await page.locator('script[type="application/ld+json"]').allTextContents()
  let crumbs = null
  let allParse = true
  for (const raw of lds) {
    try {
      const parsed = JSON.parse(raw)
      if (parsed['@type'] === 'BreadcrumbList') crumbs = parsed
    } catch { allParse = false }
  }
  check(`${p.path} emits valid BreadcrumbList JSON-LD`, !!crumbs, `${lds.length} blocks`)
  check(`${p.path} every JSON-LD block parses`, allParse)
  await page.screenshot({ path: `${SHOTS}${p.path.replace('/', '/')}-desktop.png`.replace('//', '/'), fullPage: true })
}

console.log('\n-- policy content --')
await page.goto(BASE + '/privacy', { waitUntil: 'networkidle' })
check('privacy states no selling of data', (await page.getByText(/do not sell your personal information/i).count()) > 0)
check('privacy covers under-13 deletion', (await page.getByText(/under 13/i).count()) > 0)
await page.goto(BASE + '/terms', { waitUntil: 'networkidle' })
check('terms state the 13+ age floor', (await page.getByText(/at least 13 years old/i).count()) > 0)
check('terms name the jurisdiction', (await page.getByText(/Arizona/i).count()) > 0)
check('terms carry a liability limit', (await page.getByRole('heading', { name: /limitation of liability/i }).count()) > 0)
check('terms cover content removal', (await page.getByRole('heading', { name: /remove content/i }).count()) > 0)

console.log('\n-- contact form --')
await page.goto(BASE + '/contact', { waitUntil: 'networkidle' })
await page.getByRole('button', { name: /send message/i }).click()
await page.waitForTimeout(300)
check('empty submit blocked inline', (await page.locator('[role=alert]').count()) >= 3)
check('honeypot is off-screen', await page.evaluate(() => {
  const el = document.querySelector('#website')
  if (!el) return false
  return el.getBoundingClientRect().left < 0
}))
check('honeypot hidden from a11y tree', await page.evaluate(() => !!document.querySelector('#website')?.closest('[aria-hidden="true"]')))

// Scope to the contact form inside <main>: the header search and the AI chat
// dock are also forms on this page, and the dock has its own "Message" field.
const form = page.locator('main form').first()
await form.getByLabel(/your name/i).fill('QA Tester')
await form.getByLabel(/your email/i).fill(`qa${Date.now()}@example.com`)
await form.getByLabel(/subject/i).fill('Broken link on an award')
await form.getByLabel('Message', { exact: true }).fill('The official link for one of the listed awards returns a 404 now.')
await page.getByRole('button', { name: /send message/i }).click()
await page.waitForTimeout(1500)
check('successful submit shows confirmation', (await page.getByText(/your message is in/i).count()) > 0)
await page.screenshot({ path: `${SHOTS}/contact-sent.png`, fullPage: true })

console.log('\n-- mobile 375 --')
const m = await browser.newPage({ viewport: { width: 375, height: 812 } })
m.on('console', (e) => { if (e.type() === 'error') errors.push('mobile: ' + e.text()) })
for (const p of PAGES) {
  await m.goto(BASE + p.path, { waitUntil: 'networkidle' })
  const overflow = await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
  check(`${p.path} no horizontal overflow at 375px`, !overflow)
  // Overlap check: any two text blocks whose boxes intersect is a layout bug.
  const overlaps = await m.evaluate(() => {
    const els = [...document.querySelectorAll('h1, h2, p, li')].filter((e) => e.getBoundingClientRect().height > 0)
    let hits = 0
    for (let i = 0; i < els.length; i++) {
      for (let j = i + 1; j < els.length; j++) {
        if (els[i].contains(els[j]) || els[j].contains(els[i])) continue
        const a = els[i].getBoundingClientRect(), b = els[j].getBoundingClientRect()
        if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) hits++
      }
    }
    return hits
  })
  check(`${p.path} no overlapping text at 375px (${overlaps})`, overlaps === 0)
  await m.screenshot({ path: `${SHOTS}${p.path}-mobile.png`, fullPage: true })
}

console.log('\n-- console --')
check(`no console errors (${errors.length})`, errors.length === 0, errors.slice(0, 3).join(' | '))
await browser.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
