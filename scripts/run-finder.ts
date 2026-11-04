/**
 * Daily finder run. Calls the site's protected /api/find-cron endpoint once per search query.
 * The site does the searching, page reading, model extraction and verification with its own
 * keys, so this job needs only the shared secret.
 *
 * Run: npx tsx scripts/run-finder.ts [--dry-run]
 * Env: CRON_SECRET (required), FIND_URL (default: the production endpoint), QUERIES_PER_RUN (default 8)
 */
import { IDENTITY_OPTIONS, LEVEL_OPTIONS, MAJOR_OPTIONS } from '../src/lib/profileOptions'
import { yearSpan } from '../functions/_lib/finder/queries'

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
  const queries = todaysQueries()
  console.log(`[finder] ${queries.length} queries${DRY ? ' (dry run)' : ''}`)
  if (DRY) {
    for (const q of queries) console.log(`  ${q}`)
    return
  }
  if (SECRET.length < 24) {
    console.error('[finder] CRON_SECRET is not set (or too short). Nothing was run.')
    process.exit(1)
  }
  let ok = 0
  let added = 0
  for (const query of queries) {
    try {
      const res = await fetch(FIND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Cron-Secret': SECRET },
        body: JSON.stringify({ query }),
        signal: AbortSignal.timeout(120_000),
      })
      const body = (await res.json().catch(() => null)) as {
        provider?: string
        searched?: number
        read?: number
        added?: { name: string; url: string }[]
        errors?: string[]
      } | null
      if (!res.ok || !body) {
        console.error(`  FAILED (${res.status}) ${query}`)
      } else {
        ok++
        added += body.added?.length ?? 0
        console.log(`  ${body.provider} searched ${body.searched} read ${body.read} added ${body.added?.length ?? 0} :: ${query}`)
        for (const a of body.added ?? []) console.log(`     + ${a.name}  ${a.url}`)
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
