/**
 * Overlay opacity and stacking guard, on mobile viewports.
 *
 * Written after shipping a build where the sticky header and the chat dock
 * rendered at 0.78 alpha with no blur, so page content read straight through
 * them. Nothing caught it:
 *
 *  - the text-overlap check only ran on /about, /terms, /privacy and /contact,
 *    never on / or /matches;
 *  - the chat dock is a bottom sheet only when open, and it defaults CLOSED
 *    below 900px, so every automated pass measured it at 0x0;
 *  - minification had dropped the unprefixed backdrop-filter, leaving only the
 *    -webkit- alias, which no assertion inspected.
 *
 * This opens the dock explicitly and asserts that anything overlapping content
 * is opaque enough to actually hide it.
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE || 'http://127.0.0.1:8788'
const SHOTS = 'docs/qa/v5'
mkdirSync(SHOTS, { recursive: true })

let pass = 0
let fail = 0
const check = (n, c, e = '') => {
  if (c) { pass++; console.log(`  ok   ${n}`) }
  else { fail++; console.log(`  FAIL ${n}${e ? '\n         ' + e : ''}`) }
}

/** Surfaces that float over page content and must therefore be opaque. */
const OVERLAY_SELECTORS = ['header.topbar', '.chat-dock', '.tabbar', '.onboard-overlay', '[role="alertdialog"]']
const VIEWPORTS = [
  { name: '390 (iPhone)', width: 390, height: 844 },
  { name: '360 (small Android)', width: 360, height: 780 },
  { name: '768 (tablet)', width: 768, height: 1024 },
]
const ROUTES = ['/', '/matches', '/results', '/scholarship/uncf']

const browser = await chromium.launch()

for (const vp of VIEWPORTS) {
  console.log(`\n-- ${vp.name} --`)
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.width < 700, hasTouch: true })
  await ctx.addInitScript(() => {
    localStorage.setItem('scholarship-one-onboarding-v1', JSON.stringify({ completed: true, skipped: true, completedAt: 0 }))
    // Force the assistant dock OPEN. Left closed, the bottom sheet never renders
    // on mobile and the whole failure mode stays invisible to this suite.
    localStorage.setItem('scholarship-one-chat-open', '1')
  })
  const page = await ctx.newPage()
  page.setDefaultNavigationTimeout(25000)

  for (const route of ROUTES) {
    await page.goto(BASE + route, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1600)

    const report = await page.evaluate((selectors) => {
      const parse = (c) => {
        const m = c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/)
        if (m) return { rgb: [+m[1], +m[2], +m[3]], a: m[4] === undefined ? 1 : +m[4] }
        const k = c.match(/color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)(?:\s*\/\s*([\d.]+))?\)/)
        if (k) return { rgb: [+k[1] * 255, +k[2] * 255, +k[3] * 255], a: k[4] === undefined ? 1 : +k[4] }
        return null
      }
      const out = []
      for (const sel of selectors) {
        for (const el of document.querySelectorAll(sel)) {
          const r = el.getBoundingClientRect()
          if (r.width < 8 || r.height < 8) continue
          const cs = getComputedStyle(el)
          if (cs.display === 'none' || cs.visibility === 'hidden') continue
          const bg = parse(cs.backgroundColor)
          // Does any text sit underneath this box?
          let covered = 0
          for (const t of document.querySelectorAll('h1, h2, h3, p, li, dd, button, a')) {
            if (el.contains(t) || t.contains(el)) continue
            const tr = t.getBoundingClientRect()
            if (tr.width < 4 || tr.height < 4) continue
            if (!(t.textContent || '').trim()) continue
            const overlaps = tr.left < r.right - 2 && r.left < tr.right - 2 && tr.top < r.bottom - 2 && r.top < tr.bottom - 2
            if (overlaps) covered++
          }
          out.push({
            sel,
            position: cs.position,
            alpha: bg ? bg.a : 1,
            backdrop: cs.backdropFilter,
            webkitBackdrop: cs.webkitBackdropFilter || '',
            covered,
            rect: { t: Math.round(r.top), h: Math.round(r.height) },
          })
        }
      }
      return out
    }, OVERLAY_SELECTORS)

    // Anything covering text must be opaque. 0.98 leaves room for rounding only.
    const seeThrough = report.filter((o) => o.covered > 0 && o.alpha < 0.98)
    check(
      `${route}: overlays covering content are opaque (${report.length} overlays)`,
      seeThrough.length === 0,
      seeThrough.map((o) => `${o.sel} alpha=${o.alpha} covering ${o.covered} nodes, backdrop=${o.backdrop || 'none'}`).join('\n         '),
    )

    // Reachability: a bottom sheet legitimately covers content you can scroll
    // past, so only flag elements still covered AFTER being scrolled into view.
    const unreachable = await page.evaluate(async () => {
      const out = []
      for (const el of document.querySelectorAll('main button, main a, main input, main textarea')) {
        const r0 = el.getBoundingClientRect()
        if (r0.width < 8 || r0.height < 8) continue
        const cs = getComputedStyle(el)
        if (cs.visibility === 'hidden' || cs.display === 'none') continue
        el.scrollIntoView({ block: 'center', behavior: 'instant' })
        await new Promise((r) => requestAnimationFrame(r))
        const r = el.getBoundingClientRect()
        const x = r.left + r.width / 2
        const y = r.top + r.height / 2
        if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) continue
        const top = document.elementFromPoint(x, y)
        if (top && !el.contains(top) && !top.contains(el)) {
          out.push(`"${(el.textContent || '?').trim().slice(0, 24)}" under ${(typeof top.className === 'string' && top.className) || top.tagName}`)
        }
      }
      return out
    })
    check(`${route}: every control is reachable by scrolling`, unreachable.length === 0, unreachable.slice(0, 4).join(' | '))

    // The dock must actually be exercised, or this whole suite proves nothing.
    if (route === '/matches' && vp.width < 700) {
      const dock = report.find((o) => o.sel === '.chat-dock')
      check(`${route}: chat dock is actually open and measurable`, !!dock && dock.rect.h > 100, dock ? `height ${dock.rect.h}` : 'dock not rendered')
    }

    await page.screenshot({ path: `${SHOTS}/overlay-${vp.width}${route.replace(/\//g, '-') || '-home'}.png` })
  }
  await ctx.close()
}

await browser.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
