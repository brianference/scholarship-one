/**
 * Verification for scholarships found on the web. Pure functions, no network.
 *
 * The rule this file enforces: a model may READ a page, but nothing it says is listed
 * unless the same words are on the page. The amount, the deadline, the award name and a
 * description quote must each appear verbatim in the fetched text. A model that invents
 * a figure produces a string that is not on the page, and the candidate is dropped.
 *
 * Matching is by whole token ("$5,000" is not found inside "$5,000,000") and each fact must sit
 * near the award's name, tags must be supported by the page, and the host must look like the
 * award's provider. See ground.ts.
 */
import { appearsAsToken, appearsNearName, looksLikeProviderHost, tagSupported } from './ground'

/** Hosts that list other organizations' awards. An award is only listed from its provider's own page. */
export const AGGREGATOR_HOSTS = [
  'fastweb.com',
  'scholarships.com',
  'niche.com',
  'cappex.com',
  'unigo.com',
  'collegescholarships.org',
  'scholarshipowl.com',
  'goingmerry.com',
  'going-merry.com',
  'bold.org',
  'petersons.com',
  'studentscholarships.org',
  'scholarshipportal.com',
  'bigfuture.collegeboard.org',
  'youtube.com',
  'facebook.com',
  'instagram.com',
  'tiktok.com',
  'reddit.com',
  'quora.com',
  'pinterest.com',
  'linkedin.com',
  'wikipedia.org',
  'x.com',
  'twitter.com',
  'opportunityinside.com',
  'thecollegeinvestor.com',
]

/** Tags that tell the matcher which school level an award is for. At least one is required. */
export const LEVEL_TAGS = ['undergrad', 'grad', 'high-school', 'community-college', 'transfer']

const MS_PER_DAY = 86_400_000

/** Lowercase, unify quotes and dashes, drop zero-width and non-breaking spaces, collapse whitespace. */
export function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[‐-―−]/g, '-')
    .replace(/[​-‍﻿]/g, '')
    .replace(/ /g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** True when `needle` (after normalizing) is a substring of the already-normalized page text. */
export function appearsVerbatim(needle: string, normalizedPage: string): boolean {
  const n = normalizeText(needle)
  return n.length >= 3 && normalizedPage.includes(n)
}

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
  '&ndash;': '-',
  '&mdash;': '-',
  '&rsquo;': "'",
  '&lsquo;': "'",
  '&ldquo;': '"',
  '&rdquo;': '"',
}

/** Visible text of an HTML document: scripts, styles and tags removed, common entities decoded. */
export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    // Text a visitor cannot see (hidden, aria-hidden, display:none) must not count as page text.
    // Handles the common non-nested case; a nested hidden block is still read.
    .replace(/<([a-z][a-z0-9]*)\b[^>]*\b(?:hidden|aria-hidden="true"|style="[^"]*display\s*:\s*none[^"]*")[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(?:#(\d+)|#x([0-9a-f]+));/gi, (_m, dec: string, hex: string) => {
      const code = dec ? Number(dec) : parseInt(hex, 16)
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : ' '
    })
    .replace(/&[a-z]+;|&#39;/gi, (m) => ENTITIES[m.toLowerCase()] ?? ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Only fetch public https pages. Blocks credentials in the URL, a non-default port, IP literals,
 * localhost and single-label hosts, so a search result cannot point the finder at internal services.
 */
export function isSafePublicUrl(raw: string): boolean {
  let u: URL
  try {
    u = new URL(raw)
  } catch {
    return false
  }
  if (u.protocol !== 'https:') return false
  if (u.username || u.password) return false
  if (u.port && u.port !== '443') return false
  const host = u.hostname.toLowerCase()
  if (!host.includes('.')) return false
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) return false
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(':') || host.startsWith('[')) return false
  return true
}

/** True when the URL's host is one of the aggregator or social hosts. */
export function isAggregatorUrl(raw: string): boolean {
  try {
    const host = new URL(raw).hostname.toLowerCase().replace(/^www\./, '')
    return AGGREGATOR_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))
  } catch {
    return true
  }
}

/** Dedup key for a page: host without www plus path without a trailing slash. No query or hash. */
export function normalizeUrlKey(raw: string): string {
  const u = new URL(raw)
  const path = u.pathname.replace(/\/+$/, '')
  return `${u.hostname.toLowerCase().replace(/^www\./, '')}${path.toLowerCase()}`
}

/** Normalized award name for dedup against the catalog: letters and digits only. */
export function nameKey(name: string): string {
  return normalizeText(name)
    .replace(/\b(scholarship|scholarships|program|award|fund|foundation|the|of|for|and)\b/g, ' ')
    .replace(/[^a-z0-9]/g, '')
}

/** Stable id from the normalized URL: two independent 32-bit FNV-1a hashes, 16 hex characters. */
export function webId(urlKey: string): string {
  let a = 0x811c9dc5
  let b = 0x01234567
  for (let i = 0; i < urlKey.length; i++) {
    const code = urlKey.charCodeAt(i)
    a = Math.imul(a ^ code, 0x01000193) >>> 0
    b = Math.imul(b ^ (code + i), 0x85ebca6b) >>> 0
  }
  return `web-${a.toString(16).padStart(8, '0')}${b.toString(16).padStart(8, '0')}`
}

/** What the model returns for a page. Every string here is checked against the page text. */
export type Candidate = {
  name: string
  amount: string
  deadline: string
  summaryQuote: string
  tags: string[]
}

export type VerifiedAward = {
  name: string
  amount: string
  /** ISO date when one was read, otherwise the catalog's rolling phrase. */
  deadline: string
  summary: string
  tags: string[]
}

export type Verdict = { ok: true; award: VerifiedAward } | { ok: false; reason: string }

const ROLLING_RE = /\b(?:rolling|varies|ongoing|year-round|open until filled)\b/i
const ROLLING_LABEL = 'Rolling (check portal)'
const MONTH_NAMES = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const MONTH_ALT = 'jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?'
// String.raw keeps the backslashes: a plain template literal would turn \b into a backspace character.
const TEXT_DATE_RE = new RegExp(
  String.raw`\b(${MONTH_ALT})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(20\d{2})\b`,
  'i',
)
const ISO_DATE_RE = /\b(20\d{2})-(\d{2})-(\d{2})\b/
const US_DATE_RE = /\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/

/** ISO YYYY-MM-DD from a deadline string that carries a year, or null. Impossible days (Feb 31) are null. */
export function parseDeadlineIso(text: string): string | null {
  let y: number
  let m: number
  let d: number
  const t = TEXT_DATE_RE.exec(text)
  const i = ISO_DATE_RE.exec(text)
  const u = US_DATE_RE.exec(text)
  if (t) {
    y = Number(t[3])
    m = MONTH_NAMES.indexOf(t[1].slice(0, 3).toLowerCase()) + 1
    d = Number(t[2])
  } else if (i) {
    y = Number(i[1])
    m = Number(i[2])
    d = Number(i[3])
  } else if (u) {
    y = Number(u[3])
    m = Number(u[1])
    d = Number(u[2])
  } else {
    return null
  }
  const dt = new Date(Date.UTC(y, m - 1, d))
  // Round-trip: a rolled-over date (Feb 31 -> Mar 3) does not survive.
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null
  return dt.toISOString().slice(0, 10)
}

/**
 * Decide whether a model-extracted candidate may be listed. `pageText` is the visible text of the
 * page that `pageUrl` returned. `vocab` is the catalog tag vocabulary. `todayIso` is YYYY-MM-DD.
 */
export function verifyCandidate(
  c: Candidate,
  pageText: string,
  pageUrl: string,
  todayIso: string,
  vocab: ReadonlySet<string>,
): Verdict {
  if (!isSafePublicUrl(pageUrl)) return { ok: false, reason: 'unsafe url' }
  if (isAggregatorUrl(pageUrl)) return { ok: false, reason: 'aggregator or social host, not the provider' }

  const page = normalizeText(pageText)
  if (page.length < 400) return { ok: false, reason: 'page text too short to verify' }

  const name = c.name.trim()
  if (name.length < 4 || name.length > 140) return { ok: false, reason: 'name length' }
  if (!appearsAsToken(name, page)) return { ok: false, reason: 'name not on page' }
  if (!/\b(?:scholarship|grant|fellowship|award|bursary)s?\b/i.test(name + ' ' + c.summaryQuote)) {
    return { ok: false, reason: 'not described as a scholarship, grant, fellowship or award' }
  }
  if (!looksLikeProviderHost(pageUrl, name)) {
    return { ok: false, reason: 'host does not look like the award provider (.edu, .gov, .org, .mil or named in the domain)' }
  }

  const amount = c.amount.trim()
  if (amount.length < 2 || amount.length > 80) return { ok: false, reason: 'amount length' }
  if (!appearsAsToken(amount, page)) return { ok: false, reason: 'amount not on page' }
  if (!appearsNearName(amount, name, page)) return { ok: false, reason: 'amount not near the award name' }
  if (!/\d|full|tuition|varies/i.test(amount)) return { ok: false, reason: 'amount has no figure' }

  const deadlineText = c.deadline.trim()
  if (deadlineText.length < 3 || deadlineText.length > 80) return { ok: false, reason: 'deadline length' }
  if (!appearsAsToken(deadlineText, page)) return { ok: false, reason: 'deadline not on page' }
  if (!appearsNearName(deadlineText, name, page)) return { ok: false, reason: 'deadline not near the award name' }
  let deadline: string
  const iso = parseDeadlineIso(deadlineText)
  if (iso) {
    if (iso < todayIso) return { ok: false, reason: 'deadline already passed' }
    // More than ~2 years out is almost always a misread of an unrelated date.
    const days = (Date.parse(iso) - Date.parse(todayIso)) / MS_PER_DAY
    if (days > 730) return { ok: false, reason: 'deadline implausibly far away' }
    deadline = iso
  } else if (ROLLING_RE.test(deadlineText)) {
    deadline = ROLLING_LABEL
  } else {
    return { ok: false, reason: 'deadline is neither a dated day with a year nor a rolling phrase' }
  }

  const quote = c.summaryQuote.trim()
  if (quote.length < 30 || quote.length > 300) return { ok: false, reason: 'summary quote length' }
  if (!appearsVerbatim(quote, page)) return { ok: false, reason: 'summary quote not on page' }
  if (!appearsNearName(quote, name, page)) return { ok: false, reason: 'summary quote not near the award name' }

  // A tag decides who is shown the award, so the page itself must support it.
  const tags = Array.from(new Set(c.tags.map((t) => t.trim().toLowerCase())))
    .filter((t) => vocab.has(t))
    .filter((t) => tagSupported(t, page))
  if (tags.length < 2) return { ok: false, reason: 'fewer than two valid tags' }
  if (!tags.some((t) => LEVEL_TAGS.includes(t))) return { ok: false, reason: 'no school-level tag' }

  return { ok: true, award: { name, amount, deadline, summary: quote, tags } }
}
