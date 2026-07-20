/**
 * Contrast regression guard.
 *
 * Written after the Tailwind port rendered the hero CTA as orange text on an
 * orange background: `.btn-primary` had been moved into @layer components, and
 * unlayered CSS in styles.css beats every layer regardless of specificity. The
 * build passed, TypeScript passed, and every existing assertion passed — only
 * looking at a screenshot caught it. This makes that class of failure automatic.
 */
import { chromium } from 'playwright'

const BASE = process.env.BASE || 'http://127.0.0.1:8788'
const ROUTES = ['/', '/results', '/matches', '/about', '/terms', '/privacy', '/contact', '/scholarship/uncf', '/login', '/register']

let pass = 0
let fail = 0
const check = (n, c, e = '') => {
  if (c) { pass++; console.log(`  ok   ${n}`) }
  else { fail++; console.log(`  FAIL ${n}${e ? '\n         ' + e : ''}`) }
}

/** Relative luminance per WCAG 2.1. */
function luminance([r, g, b]) {
  const f = (v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

function ratio(fg, bg) {
  const a = luminance(fg)
  const b = luminance(bg)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
await ctx.addInitScript(() =>
  localStorage.setItem('scholarship-one-onboarding-v1', JSON.stringify({ completed: true, skipped: true, completedAt: 0 })),
)

for (const theme of ['light', 'dark']) {
  console.log(`\n-- ${theme} theme --`)
  for (const route of ROUTES) {
    const page = await ctx.newPage()
    page.setDefaultNavigationTimeout(20000)
    await page.goto(BASE + route, { waitUntil: 'domcontentloaded' })
    await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme)
    await page.waitForTimeout(700)

    /**
     * Walk visible text elements and resolve the effective background by
     * climbing ancestors until something non-transparent is found — the same
     * way a reader's eye does.
     */
    const problems = await page.evaluate(() => {
      const parse = (c) => {
        const m = c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/)
        return m ? { rgb: [+m[1], +m[2], +m[3]], a: m[4] === undefined ? 1 : +m[4] } : null
      }
      const effectiveBg = (el) => {
        let node = el
        while (node && node !== document.documentElement) {
          const bg = parse(getComputedStyle(node).backgroundColor)
          if (bg && bg.a > 0.5) return bg.rgb
          node = node.parentElement
        }
        const body = parse(getComputedStyle(document.body).backgroundColor)
        return body ? body.rgb : [255, 255, 255]
      }
      const out = []
      const nodes = document.querySelectorAll('a, button, h1, h2, h3, p, li, span, label, dt, dd')
      for (const el of nodes) {
        const text = (el.textContent || '').trim()
        if (!text || text.length > 120) continue
        // Only leaf-ish nodes, so a wrapper is not blamed for its children.
        if (el.children.length > 0 && el.tagName !== 'A' && el.tagName !== 'BUTTON') continue
        const r = el.getBoundingClientRect()
        if (r.width < 4 || r.height < 4) continue
        const cs = getComputedStyle(el)
        if (cs.visibility === 'hidden' || cs.opacity === '0') continue
        const fg = parse(cs.color)
        if (!fg || fg.a < 0.5) continue
        out.push({
          text: text.slice(0, 40),
          cls: (typeof el.className === 'string' ? el.className : '').slice(0, 50),
          fg: fg.rgb,
          bg: effectiveBg(el),
          size: parseFloat(cs.fontSize),
          bold: parseInt(cs.fontWeight, 10) >= 700,
        })
      }
      return out
    })

    const invisible = []
    const lowContrast = []
    for (const p of problems) {
      const r = ratio(p.fg, p.bg)
      // WCAG AA: 3:1 for large text (18.66px+ bold, or 24px+), 4.5:1 otherwise.
      const large = p.size >= 24 || (p.bold && p.size >= 18.66)
      const required = large ? 3 : 4.5
      if (r < 1.2) invisible.push(`"${p.text}" [${p.cls}] ratio ${r.toFixed(2)}`)
      else if (r < required) lowContrast.push(`"${p.text}" [${p.cls}] ${r.toFixed(2)} < ${required}`)
    }

    // Effectively invisible text is always a defect, never a design choice.
    check(`${theme} ${route}: no invisible text (${problems.length} nodes)`, invisible.length === 0, invisible.slice(0, 4).join('\n         '))
    check(`${theme} ${route}: meets WCAG AA contrast`, lowContrast.length === 0, lowContrast.slice(0, 4).join('\n         '))
    await page.close()
  }
}

await browser.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
