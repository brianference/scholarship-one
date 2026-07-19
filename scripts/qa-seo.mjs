/**
 * SEO verification. Checks the built artefacts on disk and the live behaviour
 * in a browser, so a passing run means crawlers actually get what we intend.
 */
import { chromium } from 'playwright'
import { readFileSync, existsSync } from 'node:fs'

const BASE = process.env.BASE || 'http://127.0.0.1:8788'
let pass = 0
let fail = 0
const check = (n, c, e = '') => {
  if (c) { pass++; console.log(`  ok   ${n}`) }
  else { fail++; console.log(`  FAIL ${n}${e ? ' -> ' + e : ''}`) }
}

console.log('\n-- build artefacts --')
check('dist/sitemap.xml exists', existsSync('dist/sitemap.xml'))
check('dist/robots.txt exists', existsSync('dist/robots.txt'))
check('dist/og.png exists', existsSync('dist/og.png'))

const sitemap = existsSync('dist/sitemap.xml') ? readFileSync('dist/sitemap.xml', 'utf8') : ''
const robots = existsSync('dist/robots.txt') ? readFileSync('dist/robots.txt', 'utf8') : ''
const urlCount = (sitemap.match(/<loc>/g) || []).length
check(`sitemap lists every scholarship (${urlCount} urls)`, urlCount > 200, String(urlCount))
check('sitemap includes the homepage', sitemap.includes('<loc>https://scholarship-one.pages.dev/</loc>'))
check('sitemap includes legal pages', sitemap.includes('/privacy') && sitemap.includes('/terms'))
check('sitemap includes detail pages', sitemap.includes('/scholarship/uncf'))
check('sitemap excludes per-user routes', !sitemap.includes('/tracker') && !sitemap.includes('/activity'))
check('sitemap excludes auth routes', !sitemap.includes('/login') && !sitemap.includes('/register'))
check('sitemap is well-formed XML', sitemap.startsWith('<?xml') && sitemap.trimEnd().endsWith('</urlset>'))
check('robots points at the sitemap', robots.includes('Sitemap: https://scholarship-one.pages.dev/sitemap.xml'))
check('robots disallows the API', robots.includes('Disallow: /api/'))
check('robots disallows auth pages', robots.includes('Disallow: /login'))

console.log('\n-- prerendered HTML (no JS required) --')
for (const [route, file, expectTitle] of [
  ['/', 'dist/index.html', /find scholarships/i],
  ['/about', 'dist/about.html', /About Us/i],
  ['/terms', 'dist/terms.html', /Terms and Conditions/i],
  ['/privacy', 'dist/privacy.html', /Privacy Policy/i],
  ['/contact', 'dist/contact.html', /Contact Us/i],
]) {
  const html = existsSync(file) ? readFileSync(file, 'utf8') : ''
  check(`${route} prerendered to ${file}`, html.length > 1000, `${html.length} bytes`)
  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || ''
  check(`${route} has its own title`, expectTitle.test(title), title)
  check(`${route} has a meta description`, /<meta name="description" content="[^"]{50,}"/.test(html))
  check(`${route} has a canonical`, html.includes(`href="https://scholarship-one.pages.dev${route === '/' ? '/' : route}"`))
  check(`${route} has real content without JS`, /<h1[^>]*>/.test(html))
  check(`${route} has og:title`, /<meta property="og:title"/.test(html))
}

console.log('\n-- prerendered routes serve directly, no redirect hop --')
for (const route of ['/about', '/terms', '/privacy', '/contact']) {
  const res = await fetch(BASE + route, { redirect: 'manual' })
  // Writing "<route>/index.html" makes Cloudflare Pages 308 /route -> /route/.
  // That redirect would sit in front of every canonical and sitemap URL, which
  // both use the non-slash form, costing a hop on every crawl.
  check(`${route} returns 200 directly (${res.status})`, res.status === 200, String(res.status))
}

console.log('\n-- live routes --')
const browser = await chromium.launch()
const ctx = await browser.newContext()
await ctx.addInitScript(() =>
  localStorage.setItem('scholarship-one-onboarding-v1', JSON.stringify({ completed: true, skipped: true, completedAt: 0 })),
)
const errors = []
/**
 * A fresh page per section. The AI chat dock holds a connection open on every
 * route, and reusing one page across ~20 navigations eventually stalls goto().
 */
async function freshPage() {
  const p = await ctx.newPage()
  p.setDefaultNavigationTimeout(20000)
  p.on('pageerror', (e) => errors.push(String(e)))
  return p
}
let page = await freshPage()

const seen = new Map()
for (const [route, expect] of [
  ['/', /Scholarship One/i],
  ['/results', /Browse all scholarships/i],
  ['/matches', /matches/i],
  ['/about', /About Us/i],
  ['/privacy', /Privacy Policy/i],
  ['/scholarship/uncf', /UNCF/i],
]) {
  // domcontentloaded, not networkidle: the AI chat dock keeps a connection
  // open on app routes, so networkidle never fires there.
  await page.goto(BASE + route, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(900)
  const title = await page.title()
  const canonical = await page.getAttribute('link[rel="canonical"]', 'href')
  const desc = await page.getAttribute('meta[name="description"]', 'content')
  check(`${route} title is route-specific`, expect.test(title), title)
  check(`${route} canonical matches the route`, canonical === `https://scholarship-one.pages.dev${route}`, String(canonical))
  check(`${route} description is substantial`, (desc || '').length >= 50, `${(desc || '').length} chars`)
  // Duplicate titles across routes are a classic SEO own-goal.
  check(`${route} title is unique`, !seen.has(title), `already used by ${seen.get(title)}`)
  seen.set(title, route)
}

console.log('\n-- noindex on per-user and error routes --')
for (const route of ['/tracker', '/login', '/register', '/this-page-does-not-exist']) {
  await page.goto(BASE + route, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(900)
  const robotsMeta = await page.getAttribute('meta[name="robots"]', 'content')
  check(`${route} is noindex`, /noindex/.test(robotsMeta || ''), String(robotsMeta))
}

console.log('\n-- real 404, not a soft 404 --')
await page.goto(`${BASE}/this-page-does-not-exist`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(900)
check('404 page renders instead of redirecting', /this-page-does-not-exist/.test(page.url()), page.url())
check('404 says so plainly', (await page.getByText(/404/).count()) > 0)
check('404 offers a route out', (await page.getByRole('link', { name: /browse scholarships/i }).count()) > 0)

console.log('\n-- headings --')
for (const route of ['/', '/about', '/terms', '/privacy', '/contact', '/scholarship/uncf']) {
  await page.goto(BASE + route, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(900)
  const h1s = await page.locator('h1').count()
  check(`${route} has exactly one h1 (${h1s})`, h1s === 1)
}

check(`no page errors (${errors.length})`, errors.length === 0, errors.slice(0, 2).join(' | '))

await browser.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
