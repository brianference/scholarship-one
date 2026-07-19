/**
 * Prerenders the crawlable static routes to real HTML.
 *
 * The app is client-rendered, so a crawler that does not execute JavaScript sees
 * an empty <div id="root">. Google usually renders JS, but Bing and every social
 * scraper handle it poorly or not at all. This serves each of these routes as
 * complete HTML with its own title, description, canonical, and Open Graph tags,
 * while the SPA still hydrates and takes over on load.
 *
 * Only content pages are prerendered. Per-user views depend on localStorage and
 * would bake one visitor's empty state into the shipped HTML.
 */
import { chromium } from 'playwright'
import { createServer } from 'node:http'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, extname, dirname } from 'node:path'

const DIST = 'dist'
const PORT = 4178

const ROUTES = ['/', '/about', '/terms', '/privacy', '/contact']

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
}

/** Minimal static server with SPA fallback, so routes resolve like production. */
const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)
  let filePath = join(DIST, decodeURIComponent(url.pathname))
  if (!extname(filePath) || !existsSync(filePath)) filePath = join(DIST, 'index.html')
  try {
    const body = await readFile(filePath)
    res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' })
    res.end(body)
  } catch {
    res.writeHead(404)
    res.end('not found')
  }
})

await new Promise((resolve) => server.listen(PORT, resolve))

const browser = await chromium.launch()
const page = await browser.newPage()
// Suppress the onboarding modal: baking it into the HTML would show a wizard
// to crawlers and to anyone whose JS has not loaded yet.
await page.addInitScript(() =>
  localStorage.setItem(
    'scholarship-one-onboarding-v1',
    JSON.stringify({ completed: true, skipped: true, completedAt: 0 }),
  ),
)

let written = 0
for (const route of ROUTES) {
  await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: 'networkidle' })
  await page.waitForSelector('#root > *', { timeout: 15000 })
  // Let the meta hook run before the HTML is captured.
  await page.waitForTimeout(350)

  const html = await page.content()
  // Write "<route>.html", not "<route>/index.html". Cloudflare Pages serves the
  // former directly at /route, while the latter 308-redirects /route -> /route/.
  // That redirect would sit in front of every canonical and sitemap URL, since
  // both use the non-slash form.
  const outPath = route === '/' ? join(DIST, 'index.html') : join(DIST, `${route.slice(1)}.html`)
  await mkdir(dirname(outPath), { recursive: true })
  await writeFile(outPath, html, 'utf8')

  const title = await page.title()
  const description = await page.getAttribute('meta[name="description"]', 'content')
  const canonical = await page.getAttribute('link[rel="canonical"]', 'href')
  const h1 = await page.locator('h1').first().textContent().catch(() => null)
  console.log(`  ${route.padEnd(10)} -> ${outPath}`)
  console.log(`    title:     ${title}`)
  console.log(`    canonical: ${canonical}`)
  console.log(`    h1:        ${(h1 || '(none)').trim().slice(0, 60)}`)
  if (!description) console.warn(`    WARNING: no meta description on ${route}`)
  written++
}

await browser.close()
server.close()
console.log(`\nprerendered ${written} routes`)
