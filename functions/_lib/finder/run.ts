/**
 * One bounded finder pass: search one query, read a few official pages, keep only the awards
 * that pass verification, and store them in D1. Bounded on purpose (a handful of pages per
 * call) so a single request stays inside Workers CPU and subrequest limits; callers loop.
 */
import type { Env } from '../types'
import { CATALOG } from '../../../src/data/catalog'
import { extractCandidate } from './extract'
import { fetchPageHtml, MAX_PAGE_CHARS, searchWeb } from './search'
import {
  htmlToText,
  isAggregatorUrl,
  isSafePublicUrl,
  nameKey,
  normalizeUrlKey,
  verifyCandidate,
  webId,
  type VerifiedAward,
} from './verify'

/** Pages read per call. Each page costs one fetch and one model call. */
export const MAX_PAGES_PER_RUN = 4

export type FinderReport = {
  query: string
  provider: string
  searched: number
  read: number
  added: (VerifiedAward & { id: string; url: string })[]
  /** `detail` is what the model claimed, for tuning; it is only returned by the secret-protected cron endpoint. */
  rejected: { url: string; reason: string; detail?: string }[]
  errors: string[]
}

/** Every tag used in the catalog: the vocabulary the matcher scores against. */
export const TAG_VOCAB: ReadonlySet<string> = new Set(CATALOG.flatMap((c) => c.tags as readonly string[]))

const CATALOG_URL_KEYS = new Set(CATALOG.map((c) => safeUrlKey(c.url)).filter((k): k is string => k !== null))
const CATALOG_NAME_KEYS = new Set(CATALOG.map((c) => nameKey(c.name)))

function safeUrlKey(url: string): string | null {
  try {
    return normalizeUrlKey(url)
  } catch {
    return null
  }
}

/** Today as YYYY-MM-DD in UTC. */
export function todayIso(now = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10)
}

/** Run one search query end to end. Never throws: problems are returned in the report. */
export async function runFinder(
  env: Env,
  query: string,
  fetchFn: typeof fetch = fetch,
  suppliedUrls?: readonly string[],
): Promise<FinderReport> {
  const report: FinderReport = { query, provider: 'none', searched: 0, read: 0, added: [], rejected: [], errors: [] }
  // Supplied links skip the search; everything after (safety, fetch, model, verification) is unchanged.
  const search =
    suppliedUrls && suppliedUrls.length
      ? {
          provider: 'supplied' as const,
          hits: Array.from(new Set(suppliedUrls)).filter(isSafePublicUrl).map((url) => ({ url, title: '' })),
          errors: [] as string[],
        }
      : await searchWeb(env, query, fetchFn)
  report.provider = search.provider
  report.errors.push(...search.errors)
  report.searched = search.hits.length
  if (!search.hits.length) return report

  let known: { url: string; name: string }[]
  try {
    known = (await env.DB.prepare('select url, name from discovered_scholarships').all<{ url: string; name: string }>()).results
  } catch (err) {
    // A missing table or a D1 outage is reported, not thrown: this function never throws.
    report.errors.push(`database unavailable: ${(err as Error).message}`)
    return report
  }
  const urlKeys = new Set([...CATALOG_URL_KEYS, ...known.map((r) => safeUrlKey(r.url)).filter((k): k is string => k !== null)])
  const nameKeys = new Set([...CATALOG_NAME_KEYS, ...known.map((r) => nameKey(r.name))])

  const today = todayIso()
  let pages = 0
  for (const hit of search.hits) {
    if (pages >= MAX_PAGES_PER_RUN) break
    if (isAggregatorUrl(hit.url)) {
      report.rejected.push({ url: hit.url, reason: 'aggregator or social host' })
      continue
    }
    const key = safeUrlKey(hit.url)
    if (!key || urlKeys.has(key)) {
      report.rejected.push({ url: hit.url, reason: 'already known' })
      continue
    }
    pages++
    const page = await fetchPageHtml(hit.url, fetchFn)
    if (!page) {
      report.rejected.push({ url: hit.url, reason: 'page could not be fetched as HTML (or redirected to another host)' })
      continue
    }
    report.read++
    // From here on the URL is the one that actually answered, not the one the search engine listed.
    const pageUrl = page.finalUrl
    const text = htmlToText(page.html).slice(0, MAX_PAGE_CHARS)
    const read = await extractCandidate(env, text, [...TAG_VOCAB], fetchFn)
    if (!read.ok) {
      report.rejected.push({ url: hit.url, reason: read.reason })
      continue
    }
    const verdict = verifyCandidate(read.candidate, text, pageUrl, today, TAG_VOCAB)
    if (!verdict.ok) {
      report.rejected.push({
        url: hit.url,
        reason: verdict.reason,
        detail: JSON.stringify({ name: read.candidate.name, amount: read.candidate.amount, deadline: read.candidate.deadline, tags: read.candidate.tags }).slice(0, 300),
      })
      continue
    }
    const nk = nameKey(verdict.award.name)
    if (nameKeys.has(nk)) {
      report.rejected.push({ url: hit.url, reason: 'same award name already listed' })
      continue
    }
    const finalKey = safeUrlKey(pageUrl) ?? key
    if (urlKeys.has(finalKey)) {
      report.rejected.push({ url: hit.url, reason: 'already known' })
      continue
    }
    const id = webId(finalKey)
    try {
      await env.DB.prepare(
        `insert into discovered_scholarships
           (id, url, name, amount, deadline, summary, tags, added_at, verified_at, provider)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          id,
          pageUrl,
          verdict.award.name,
          verdict.award.amount,
          verdict.award.deadline,
          verdict.award.summary,
          JSON.stringify(verdict.award.tags),
          today,
          Date.now(),
          search.provider,
        )
        .run()
    } catch (err) {
      // A unique-constraint failure means another run stored it first: not an addition.
      const msg = (err as Error).message
      if (/unique|constraint/i.test(msg)) report.rejected.push({ url: hit.url, reason: 'already stored' })
      else report.errors.push(`db insert failed: ${msg}`)
      continue
    }
    urlKeys.add(key)
    urlKeys.add(finalKey)
    nameKeys.add(nk)
    report.added.push({ ...verdict.award, id, url: pageUrl })
  }
  return report
}
