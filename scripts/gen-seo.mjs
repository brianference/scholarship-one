/**
 * Generates robots.txt and sitemap.xml into dist/ after a build.
 *
 * The catalog is the source of truth for scholarship URLs, so the sitemap is
 * derived from it rather than hand-maintained — a hand-written list goes stale
 * the first time an award is added.
 */
import { build } from 'esbuild'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ORIGIN = 'https://scholarship-one.pages.dev'
const DIST = 'dist'

// Static routes worth indexing. Per-user views (tracker, activity, import) and
// the auth screens are deliberately excluded: they hold nothing a crawler can
// use and would only dilute the site's crawl budget.
const STATIC_ROUTES = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/results', priority: '0.9', changefreq: 'weekly' },
  { path: '/matches', priority: '0.8', changefreq: 'weekly' },
  { path: '/digest', priority: '0.7', changefreq: 'daily' },
  { path: '/about', priority: '0.5', changefreq: 'monthly' },
  { path: '/contact', priority: '0.4', changefreq: 'yearly' },
  { path: '/privacy', priority: '0.3', changefreq: 'yearly' },
  { path: '/terms', priority: '0.3', changefreq: 'yearly' },
]

const NOINDEX_ROUTES = ['/login', '/register', '/forgot-password', '/reset', '/auth', '/tracker', '/activity', '/import', '/path']

/**
 * Load the catalog by transpiling the TS module to a temp file.
 * Uses esbuild's API rather than spawning a shell: no command string is built,
 * so a path containing spaces or shell metacharacters cannot cause trouble.
 */
async function loadCatalog() {
  const dir = mkdtempSync(join(tmpdir(), 'seo-'))
  const outfile = join(dir, 'catalog.mjs')
  await build({ entryPoints: ['src/data/catalog.ts'], format: 'esm', target: 'es2022', outfile, logLevel: 'silent' })
  const mod = await import('file://' + outfile.replace(/\\/g, '/'))
  return mod.CATALOG
}

function escapeXml(value) {
  return value.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c])
}

const catalog = await loadCatalog()
// A fixed date, not "now": regenerating an unchanged sitemap should not tell
// crawlers every page changed today.
const lastmod = new Date(Date.parse('2026-07-19T00:00:00Z')).toISOString().slice(0, 10)

const urls = [
  ...STATIC_ROUTES.map((r) => ({ loc: ORIGIN + r.path, priority: r.priority, changefreq: r.changefreq })),
  ...catalog.map((award) => ({
    loc: `${ORIGIN}/scholarship/${award.id}`,
    priority: '0.6',
    changefreq: 'monthly',
  })),
]

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${escapeXml(u.loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>
`

const robots = `# Scholarship One
User-agent: *
Allow: /
${NOINDEX_ROUTES.map((r) => `Disallow: ${r}`).join('\n')}

# Per-user API responses hold nothing crawlable.
Disallow: /api/

Sitemap: ${ORIGIN}/sitemap.xml
`

writeFileSync(join(DIST, 'sitemap.xml'), sitemap, 'utf8')
writeFileSync(join(DIST, 'robots.txt'), robots, 'utf8')

console.log(`sitemap.xml: ${urls.length} urls (${STATIC_ROUTES.length} static + ${catalog.length} scholarships)`)
console.log(`robots.txt: ${NOINDEX_ROUTES.length} disallowed paths`)
