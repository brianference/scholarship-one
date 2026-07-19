// Verifies the sticky header and the footer across breakpoints.
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
const BASE = process.env.BASE || 'http://127.0.0.1:8788'
const SHOTS = 'docs/qa/v5'
mkdirSync(SHOTS, { recursive: true })
let pass = 0, fail = 0
const check = (n, c, e = '') => { if (c) { pass++; console.log(`  ok   ${n}`) } else { fail++; console.log(`  FAIL ${n}${e ? ' -> ' + e : ''}`) } }

const browser = await chromium.launch()
const errors = []

console.log('\n-- sticky header --')
for (const [label, w, h] of [['desktop', 1280, 900], ['mobile', 375, 812]]) {
  const p = await browser.newPage({ viewport: { width: w, height: h } })
  p.on('console', (m) => { if (m.type() === 'error') errors.push(`${label}: ${m.text()}`) })
  p.on('pageerror', (e) => errors.push(`${label}: ${e}`))
  await p.goto(`${BASE}/terms`, { waitUntil: 'networkidle' })
  const topBefore = await p.locator('header.topbar').boundingBox()
  await p.evaluate(() => window.scrollTo(0, 1200))
  await p.waitForTimeout(400)
  const topAfter = await p.locator('header.topbar').boundingBox()
  check(`${label}: header stays pinned after scrolling`, topAfter && topAfter.y >= -1 && topAfter.y < 8,
    `before y=${topBefore?.y} after y=${topAfter?.y}`)
  // Pinned is useless if something paints over it.
  const covered = await p.evaluate(() => {
    const header = document.querySelector('header.topbar')
    if (!header) return 'no header'
    const r = header.getBoundingClientRect()
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + Math.min(12, r.height / 2))
    return header.contains(hit) ? null : (hit?.className || hit?.tagName || 'unknown')
  })
  check(`${label}: nothing paints over the pinned header`, covered === null, String(covered))
  await p.screenshot({ path: `${SHOTS}/sticky-${label}.png` })
  await p.close()
}

console.log('\n-- footer --')
for (const [label, w, h] of [['desktop', 1280, 900], ['tablet', 768, 900], ['mobile', 375, 812]]) {
  const p = await browser.newPage({ viewport: { width: w, height: h } })
  p.on('console', (m) => { if (m.type() === 'error') errors.push(`${label}: ${m.text()}`) })
  await p.goto(`${BASE}/about`, { waitUntil: 'networkidle' })
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await p.waitForTimeout(400)
  const footer = p.locator('footer')
  check(`${label}: footer renders`, await footer.isVisible())
  const cols = await p.locator('footer nav').count()
  check(`${label}: four link columns`, cols === 4, `found ${cols}`)
  check(`${label}: legal links present`, (await p.locator('footer a[href="/privacy"], footer a[href="/terms"]').count()) >= 2)
  check(`${label}: copyright present`, (await p.getByText(/© 20\d\d Scholarship One/).count()) > 0)
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
  check(`${label}: no horizontal overflow`, !overflow)
  // The mobile tab bar is fixed; footer links must not hide beneath it.
  const buried = await p.evaluate(() => {
    const bar = document.querySelector('.tabbar')
    if (!bar || getComputedStyle(bar).display === 'none') return 0
    const barTop = bar.getBoundingClientRect().top
    return [...document.querySelectorAll('footer a')].filter((a) => {
      const r = a.getBoundingClientRect()
      return r.height > 0 && r.bottom > barTop && r.top < window.innerHeight
    }).length
  })
  check(`${label}: no footer link trapped under the tab bar (${buried})`, buried === 0)
  // Column-count alone passed while the columns were visibly cramped by the
  // chat dock. Wrapped headings are the symptom that actually shows it.
  const wrapped = await p.evaluate(() => {
    const out = []
    for (const h of document.querySelectorAll('footer nav h2')) {
      const style = getComputedStyle(h)
      const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.5
      const lines = Math.round(h.getBoundingClientRect().height / lineHeight)
      if (lines > 1) out.push(`${h.textContent}(${lines} lines)`)
    }
    return out
  })
  check(`${label}: footer headings do not wrap`, wrapped.length === 0, wrapped.join(', '))
  await p.screenshot({ path: `${SHOTS}/footer-${label}.png`, fullPage: false })
  await p.close()
}

console.log('\n-- brand mark --')
const narrow = await browser.newPage({ viewport: { width: 360, height: 780 } })
await narrow.goto(`${BASE}/`, { waitUntil: 'networkidle' })
check('logo mark renders in header', (await narrow.locator('header .brand svg').count()) === 1)
check('wordmark hides under 380px', !(await narrow.locator('.brand__word').isVisible()))
const noOverflow = await narrow.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
check('no overflow at 360px', noOverflow)
await narrow.screenshot({ path: `${SHOTS}/header-360.png` })
await narrow.close()

console.log('\n-- console --')
check(`no console errors (${errors.length})`, errors.length === 0, errors.slice(0, 3).join(' | '))
await browser.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
