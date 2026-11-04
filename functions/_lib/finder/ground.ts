/**
 * Stricter grounding helpers for the finder: whole-token matching, "near the award's name"
 * checks, tag support from the page text, and a provider-host heuristic. Pure functions.
 */
import { normalizeText } from './verify'

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Index of every place `needle` occurs in `page` as a whole token. Both strings are normalized.
 * A match may not be glued to a letter or digit before it, nor continue into a letter, digit or
 * a "," or "." followed by a digit after it. So "$5,000" does not match inside "$5,000,000", and
 * "rolling" does not match inside "scrolling".
 */
export function tokenIndexes(needle: string, normalizedPage: string): number[] {
  const n = normalizeText(needle)
  if (n.length < 3) return []
  const re = new RegExp(`(?<![a-z0-9])${escapeRe(n)}(?![a-z0-9]|[,.][0-9])`, 'g')
  const out: number[] = []
  for (const m of normalizedPage.matchAll(re)) out.push(m.index ?? 0)
  return out
}

/** True when `needle` appears as a whole token somewhere on the page. */
export function appearsAsToken(needle: string, normalizedPage: string): boolean {
  return tokenIndexes(needle, normalizedPage).length > 0
}

/** How far a fact may sit from the award's name and still count as being about that award. */
export const NEAR_NAME_CHARS = 3000

/** True when some occurrence of `needle` lies within NEAR_NAME_CHARS of some occurrence of the name. */
export function appearsNearName(needle: string, name: string, normalizedPage: string): boolean {
  const nameAt = tokenIndexes(name, normalizedPage)
  if (!nameAt.length) return false
  const n = normalizeText(needle)
  if (n.length < 3) return false
  let from = 0
  while (true) {
    const at = normalizedPage.indexOf(n, from)
    if (at === -1) return false
    if (nameAt.some((p) => Math.abs(p - at) <= NEAR_NAME_CHARS)) return true
    from = at + 1
  }
}

/**
 * What the page must say for a tag to be believed. A tag with no entry here must have its own
 * words (hyphens as spaces) on the page. Level and identity tags are the ones that decide who
 * is shown an award, so each needs real evidence.
 */
const TAG_EVIDENCE: Record<string, RegExp> = {
  undergrad: /undergraduate|bachelor|college student|freshman|sophomore|junior|first-year|four-year/,
  // "(?<!under)graduate": the word "undergraduate" must not count as evidence for a graduate award.
  grad: /(?<!under)graduate|master'?s|ph\.?d|doctoral|doctorate|professional school|law school|medical school/,
  'high-school': /high school|secondary school|graduating senior|high-school/,
  'community-college': /community college|two-year|associate degree/,
  transfer: /transfer student|transferring/,
  women: /\bwomen\b|\bwoman\b|female|\bgirls?\b/,
  black: /black|african american|african-american/,
  'african-american': /african american|african-american|\bblack\b/,
  hispanic: /hispanic|latino|latina|latinx/,
  latino: /latino|latina|latinx|hispanic/,
  latina: /latina|latino|hispanic/,
  mexican: /mexican|mexico/,
  asian: /asian|pacific islander/,
  'pacific-islander': /pacific islander/,
  native: /native american|american indian|alaska native|indigenous|tribal/,
  lgbtq: /lgbt|queer|gay|lesbian|transgender|bisexual/,
  military: /military|armed forces|service member|servicemember/,
  veteran: /veteran/,
  spouse: /spouse/,
  disability: /disabilit|disabled/,
  disabled: /disabilit|disabled/,
  blind: /\bblind\b|visually impaired|low vision/,
  deaf: /\bdeaf\b|hard of hearing|hearing loss/,
  undocumented: /undocumented|daca|dreamer/,
  daca: /daca|deferred action/,
  immigrant: /immigrant|immigration/,
  'first-gen': /first-generation|first generation|first in (?:their|your) family|first-gen/,
  'need-based': /financial need|need-based|demonstrated need|low-income|low income/,
  merit: /merit|academic achievement|gpa|academic excellence/,
  'no-essay': /no essay|without an essay|essay is not required/,
  'pell-eligible': /pell/,
  stem: /\bstem\b|science|technology|engineering|mathematics/,
  engineering: /engineer/,
  'computer-science': /computer science|computing|software|cybersecurity/,
  nursing: /nursing|nurse/,
  healthcare: /health ?care|medical|medicine|health professions?/,
  business: /business|management|entrepreneur/,
  accounting: /accounting|accountant|cpa\b/,
  education: /education|teaching|teacher/,
  arts: /\barts?\b|design|music|theat|creative|film/,
  sports: /athlet|sport/,
  athletics: /athlet/,
  athlete: /athlet/,
  ncaa: /ncaa/,
  math: /\bmath|mathematic/,
  science: /science/,
  research: /research/,
  leadership: /leadership|leader/,
  service: /community service|volunteer|service/,
  'all-majors': /any major|all majors|any field|any course of study/,
  state: /\bstate\b|resident/,
}

/** State and region tags are accepted when the state's name (hyphens as spaces) is on the page. */
export function tagSupported(tag: string, normalizedPage: string): boolean {
  const evidence = TAG_EVIDENCE[tag]
  if (evidence) return evidence.test(normalizedPage)
  const words = tag.replace(/-/g, ' ')
  return normalizedPage.includes(words)
}

/** Top-level domains that organizations that award scholarships commonly use. */
const TRUSTED_TLDS = ['edu', 'gov', 'org', 'mil']

/**
 * Heuristic for "this page belongs to the award's provider": the host ends in .edu, .gov, .org or
 * .mil, or the registrable domain contains a distinctive word (4+ letters) from the award's name.
 * It is not proof. It removes SEO blogs and thin landing pages on throwaway .com and .info hosts,
 * and the UI still tells students to confirm on the official site.
 */
export function looksLikeProviderHost(url: string, awardName: string): boolean {
  let host: string
  try {
    host = new URL(url).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return false
  }
  const labels = host.split('.')
  const tld = labels[labels.length - 1]
  if (TRUSTED_TLDS.includes(tld)) return true
  if (labels.length >= 3 && labels[labels.length - 2] === 'co' && labels[labels.length - 1].length === 2) return false
  const domain = labels.slice(-2, -1)[0] ?? ''
  const stop = new Set(['scholarship', 'scholarships', 'program', 'award', 'foundation', 'fund', 'grant', 'student', 'students', 'college', 'university'])
  const words = normalizeText(awardName)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4 && !stop.has(w))
  return words.some((w) => domain.includes(w))
}
