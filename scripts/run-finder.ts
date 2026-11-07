/**
 * Daily finder run. Calls the site's protected /api/find-cron endpoint once per search query.
 * The site does the searching, page reading, model extraction and verification with its own
 * keys, so this job needs only the shared secret.
 *
 * Run: npx tsx scripts/run-finder.ts [--dry-run]
 * Env: CRON_SECRET (required), FIND_URL (default: the production endpoint), QUERIES_PER_RUN (default 8),
 *      FIND_QUERIES (optional: queries separated by |, replaces the daily list for a targeted run),
 *      FIND_URLS (optional: result links separated by spaces; skips searching and sends these to the site)
 */
import { IDENTITY_OPTIONS, LEVEL_OPTIONS, MAJOR_OPTIONS } from '../src/lib/profileOptions'
import { yearSpan } from '../functions/_lib/finder/queries'
import { searchWeb } from '../functions/_lib/finder/search'
import type { Env } from '../functions/_lib/types'

const FIND_URL = process.env.FIND_URL || 'https://scholarship-one.pages.dev/api/find-cron'
const SECRET = process.env.CRON_SECRET || ''
const PER_RUN = Math.max(1, Math.min(20, Number(process.env.QUERIES_PER_RUN) || 8))
const DRY = process.argv.includes('--dry-run')
const PAUSE_MS = 1500

/** Every level crossed with every field of study and every background the site knows. */
export function allQueries(now = new Date()): string[] {
  const span = yearSpan(now)
  const levels = LEVEL_OPTIONS.map((l) => l.label)
  const topics = [
    ...MAJOR_OPTIONS.filter((m) => m.value !== 'any').map((m) => m.label),
    ...IDENTITY_OPTIONS.filter((i) => i.value !== 'any').map((i) => i.label),
  ]
  const out: string[] = []
  for (const topic of topics) for (const level of levels) out.push(`${level} ${topic} scholarship application ${span} apply official`)
  return out
}

/** Today's slice: a different block each day, wrapping around, so the whole list is covered over time. */
export function todaysQueries(now = new Date(), perRun = PER_RUN): string[] {
  const all = allQueries(now)
  const day = Math.floor(now.getTime() / 86_400_000)
  const start = (day * perRun) % all.length
  return Array.from({ length: Math.min(perRun, all.length) }, (_, i) => all[(start + i) % all.length])
}

async function main() {
  const custom = (process.env.FIND_QUERIES || '').split('|').map((q) => q.trim()).filter((q) => q.length >= 8)
  const manualUrls = (process.env.FIND_URLS || '').split(/\s+/).filter((u) => u.startsWith('https://')).slice(0, 8)
  const queries = manualUrls.length ? [custom[0] || 'manually supplied scholarship pages official'] : custom.length ? custom.slice(0, 20) : todaysQueries()
  console.log(`[finder] ${queries.length} queries${DRY ? ' (dry run)' : ''}`)
  if (DRY) {
    for (const q of queries) console.log(`  ${q}`)
    return
  }
  if (SECRET.length < 24) {
    console.error('[finder] CRON_SECRET is not set (or too short). Nothing was run.')
    process.exit(1)
  }
  // Search from this machine: search engines throttle Cloudflare's network but not GitHub's. Optional
  // FIRECRAWL_API_KEY / BRAVE_API_KEY here are tried first, then keyless DuckDuckGo. The site still reads
  // and verifies every page itself; this job only supplies the links.
  const searchEnv = { FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY, BRAVE_API_KEY: process.env.BRAVE_API_KEY } as Env
  let ok = 0
  let added = 0
  for (const query of queries) {
    try {
      let urls = manualUrls
      if (!manualUrls.length) {
        const found = await searchWeb(searchEnv, query)
        urls = found.hits.map((h) => h.url).slice(0, 8)
        console.log(`  search: ${found.provider}, ${urls.length} link(s)${found.errors.length ? ' (' + found.errors.join(' | ') + ')' : ''}`)
      } else {
        console.log(`  using ${urls.length} supplied link(s), no search`)
      }
      const res = await fetch(FIND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Cron-Secret': SECRET },
        // With no links the site falls back to its own search.
        body: JSON.stringify(urls.length ? { query, urls } : { query }),
        signal: AbortSignal.timeout(120_000),
      })
      const body = (await res.json().catch(() => null)) as {
        provider?: string
        searched?: number
        read?: number
        added?: { name: string; url: string }[]
        rejected?: { url: string; reason: string; detail?: string }[]
        errors?: string[]
      } | null
      if (!res.ok || !body) {
        console.error(`  FAILED (${res.status}) ${query}`)
      } else {
        ok++
        added += body.added?.length ?? 0
        console.log(`  ${body.provider} searched ${body.searched} read ${body.read} added ${body.added?.length ?? 0} :: ${query}`)
        for (const a of body.added ?? []) console.log(`     + ${a.name}  ${a.url}`)
        // Why pages were not listed is the evidence that verification is working, so it is always shown.
        for (const r of body.rejected ?? []) console.log(`     - ${r.reason} :: ${r.url}${r.detail ? ' :: model said ' + r.detail : ''}`)
        if (body.errors?.length) console.log(`     notes: ${body.errors.join(' | ')}`)
      }
    } catch (err) {
      console.error(`  FAILED ${query}: ${(err as Error).message}`)
    }
    await new Promise((r) => setTimeout(r, PAUSE_MS))
  }
  console.log(`[finder] done. ${ok}/${queries.length} queries ran, ${added} verified award(s) added.`)
  // A run where nothing worked at all (wrong secret, site down) must show as a failed job.
  if (ok === 0) process.exit(1)
}

void main()
