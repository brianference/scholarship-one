/**
 * Web search for the finder. Providers are tried in order and the first one that returns
 * results wins, so a missing key or a failing provider falls through to the next:
 *   1. Firecrawl  (needs FIRECRAWL_API_KEY)   POST https://api.firecrawl.dev/v2/search
 *   2. Brave      (needs BRAVE_API_KEY)       GET  https://api.search.brave.com/res/v1/web/search
 *   3. DuckDuckGo (no key, HTML endpoint)     POST https://html.duckduckgo.com/html/
 * Shapes were checked against each provider's docs (Firecrawl: data.web[].url; Brave:
 * web.results[].url) and, for DuckDuckGo, against a live response.
 */
import type { Env } from '../types'
import { isSafePublicUrl } from './verify'

export type SearchHit = { url: string; title: string }
export type SearchOutcome = {
  provider: 'firecrawl' | 'brave' | 'duckduckgo' | 'supplied' | 'none'
  hits: SearchHit[]
  errors: string[]
}

const USER_AGENT = 'Mozilla/5.0 (compatible; ScholarshipOneFinder/1.0; +https://scholarship-one.pages.dev)'
const SEARCH_TIMEOUT_MS = 12_000
const MAX_HITS = 10

type FetchFn = typeof fetch

async function withTimeout(fetchFn: FetchFn, url: string, init: RequestInit): Promise<Response> {
  return fetchFn(url, { ...init, signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS) })
}

async function firecrawl(query: string, key: string, fetchFn: FetchFn): Promise<SearchHit[]> {
  const res = await withTimeout(fetchFn, 'https://api.firecrawl.dev/v2/search', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: query.slice(0, 500), limit: MAX_HITS }),
  })
  if (!res.ok) throw new Error(`firecrawl ${res.status}`)
  const body = (await res.json()) as { data?: { web?: { url?: string; title?: string }[] } }
  return (body.data?.web ?? []).flatMap((r) => (r.url ? [{ url: r.url, title: r.title ?? '' }] : []))
}

async function brave(query: string, key: string, fetchFn: FetchFn): Promise<SearchHit[]> {
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${MAX_HITS}`
  const res = await withTimeout(fetchFn, url, { headers: { 'X-Subscription-Token': key, Accept: 'application/json' } })
  if (!res.ok) throw new Error(`brave ${res.status}`)
  const body = (await res.json()) as { web?: { results?: { url?: string; title?: string }[] } }
  return (body.web?.results ?? []).flatMap((r) => (r.url ? [{ url: r.url, title: r.title ?? '' }] : []))
}

/** Result links on the DuckDuckGo HTML page, either direct or wrapped in its uddg redirect. */
export function parseDuckDuckGo(html: string): SearchHit[] {
  const hits: SearchHit[] = []
  const re = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g
  for (const m of html.matchAll(re)) {
    let href = m[1].replace(/&amp;/g, '&')
    if (href.startsWith('//')) href = `https:${href}`
    try {
      const u = new URL(href)
      const wrapped = u.searchParams.get('uddg')
      if (wrapped) href = decodeURIComponent(wrapped)
    } catch {
      continue
    }
    hits.push({ url: href, title: m[2].replace(/<[^>]+>/g, '').trim() })
  }
  return hits
}

async function duckduckgo(query: string, fetchFn: FetchFn): Promise<SearchHit[]> {
  const res = await withTimeout(fetchFn, 'https://html.duckduckgo.com/html/', {
    method: 'POST',
    headers: { 'User-Agent': USER_AGENT, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ q: query }).toString(),
  })
  if (!res.ok) throw new Error(`duckduckgo ${res.status}`)
  return parseDuckDuckGo(await res.text())
}

/** Search with the first working provider. Results are de-duplicated and limited to safe public https URLs. */
export async function searchWeb(env: Env, query: string, fetchFn: FetchFn = fetch): Promise<SearchOutcome> {
  const errors: string[] = []
  const chain: [SearchOutcome['provider'], (() => Promise<SearchHit[]>) | null][] = [
    ['firecrawl', env.FIRECRAWL_API_KEY ? () => firecrawl(query, env.FIRECRAWL_API_KEY as string, fetchFn) : null],
    ['brave', env.BRAVE_API_KEY ? () => brave(query, env.BRAVE_API_KEY as string, fetchFn) : null],
    ['duckduckgo', () => duckduckgo(query, fetchFn)],
  ]
  for (const [provider, run] of chain) {
    if (!run) continue
    try {
      const seen = new Set<string>()
      const hits = (await run()).filter((h) => {
        if (!isSafePublicUrl(h.url) || seen.has(h.url)) return false
        seen.add(h.url)
        return true
      })
      if (hits.length) return { provider, hits: hits.slice(0, MAX_HITS), errors }
      errors.push(`${provider}: no results`)
    } catch (err) {
      errors.push(`${provider}: ${(err as Error).message}`)
    }
  }
  return { provider: 'none', hits: [], errors }
}

const PAGE_TIMEOUT_MS = 12_000
/** A page larger than this is truncated; award facts sit near the top, and the model input is bounded. */
const MAX_PAGE_CHARS = 60_000

/** Bytes read from a page body. Award facts sit near the top; a bigger body is cut off, never buffered whole. */
const MAX_PAGE_BYTES = 400_000

export type FetchedPage = { html: string; finalUrl: string }

/** Read at most MAX_PAGE_BYTES of a response body as text. */
async function readCapped(res: Response): Promise<string> {
  if (!res.body) return (await res.text()).slice(0, MAX_PAGE_BYTES)
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let received = 0
  let out = ''
  while (received < MAX_PAGE_BYTES) {
    const { done, value } = await reader.read()
    if (done || !value) break
    received += value.byteLength
    out += decoder.decode(value, { stream: true })
  }
  await reader.cancel().catch(() => {})
  return out
}

/** Hosts compare equal when they differ only by a leading www. */
function sameSite(a: string, b: string): boolean {
  const host = (u: string) => new URL(u).hostname.toLowerCase().replace(/^www\./, '')
  return host(a) === host(b)
}

/**
 * Fetch a public page. Returns null on any failure, a non-HTML response, or a redirect to another
 * host (an open redirect on a trusted site must not launder a link to a different one).
 */
export async function fetchPageHtml(url: string, fetchFn: FetchFn = fetch): Promise<FetchedPage | null> {
  if (!isSafePublicUrl(url)) return null
  try {
    const res = await fetchFn(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml' },
      redirect: 'follow',
      signal: AbortSignal.timeout(PAGE_TIMEOUT_MS),
    })
    if (!res.ok) return null
    const finalUrl = res.url || url
    // A redirect can land somewhere unsafe or somewhere else entirely; both are rejected.
    if (!isSafePublicUrl(finalUrl) || !sameSite(url, finalUrl)) return null
    const type = res.headers.get('content-type') || ''
    if (!/text\/html|application\/xhtml/i.test(type)) return null
    return { html: await readCapped(res), finalUrl }
  } catch {
    return null
  }
}

export { MAX_PAGE_CHARS }
