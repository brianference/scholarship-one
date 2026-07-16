import { CATALOG, type CatalogItem } from '../data/catalog'

export type MatchHit = { id: string; reason: string; score: number }

/** True when the query has enough signal to show matches (not only vague chat). */
export function isSpecificQuery(query: string): boolean {
  const q = query.toLowerCase()
  if (q.trim().length < 8) return false
  const signals = [
    /\b(black|african[-\s]?american|hispanic|latino|latina|mexican|mexico|chican[ao]|minority|bipoc|women?|girl|female|asian|lgbtq|daca|undocumented|military|veteran)\b/,
    /\b(market(ing)?|business|account|engineer|stem|nurs|educat|law|computer|cs\b|sport|athletic|athlete|track|math|mathematics)\b/,
    /\b(handicap|handicapped|disabilit(y|ies)|disabled|ada\b|accessibility|blind|deaf|iep|first[-\s]?gen|transfer|community)\b/,
    /\b(high[-\s]?school|undergrad|college|freshman|sophomore|junior|senior|grad|student)\b/,
    /\b(need|pell|fafsa|merit|deadline|due soon)\b/,
  ]
  return signals.filter((re) => re.test(q)).length >= 1 && q.split(/\s+/).filter(Boolean).length >= 2
}

/**
 * Keyword match against the grounded catalog (client ranking + AI fallback).
 * Never invents awards outside CATALOG.
 */
export function matchCatalog(query: string, limit = 5): MatchHit[] {
  const q = query.toLowerCase()
  const wantsBlack = /\b(black|african[-\s]?american|bipoc)\b/.test(q)
  const wantsMinority = wantsBlack || /\b(minority|of color|poc)\b/.test(q)
  const wantsWomen = /\b(girl|woman|women|female|ladies|latina|swe\b)\b/.test(q)
  const wantsMarketing = /\b(market(ing)?|comms?|advertis|pr\b|brand|ama\b)\b/.test(q)
  const wantsAccounting = /\b(account(ing|ant)?|cpa|aicpa)\b/.test(q)
  const wantsBusiness =
    wantsAccounting || /\b(business|mgmt|management|finance|mba)\b/.test(q)
  const wantsLeadership = /\b(leader|leadership|community service)\b/.test(q)
  const wantsGoogle = /\b(google|lime)\b/.test(q)
  const wantsMath = /\b(math|mathematics|calculus|algebra|statistics|stat\b)\b/.test(q)
  const wantsStem =
    wantsMath ||
    /\b(stem|engineer|engineering|computer|cs\b|coding|software|science|physics|chemistry|biology)\b/.test(q)
  const wantsNursing = /\b(nurs(e|ing)?|rn\b|bsn|msn)\b/.test(q)
  const wantsSports =
    /\b(sport|sports|athletic|athlete|ncaa|soccer|basketball|softball|volleyball|track|field|swimming|tennis|running|cross[-\s]?country)\b/.test(
      q,
    )
  const wantsDisability =
    /\b(handicap|handicapped|disabilit(y|ies)|disabled|ada\b|accessibility|special[-\s]?needs|iep|504\b|blind|deaf|wheelchair|impairment)\b/.test(
      q,
    )
  const wantsHs = /\b(high[-\s]?school|12th|graduating)\b/.test(q)
  const wantsUndergrad = /\b(undergrad|college|university|freshman|sophomore|junior)\b/.test(q)
  const wantsNeed = /\b(need|pell|fafsa|low[-\s]?income|financial)\b/.test(q)
  const wantsHispanic =
    /\b(hispanic|latino|latina|latinx|mexican|mexico|chican[ao]|puerto\s*rican|cuban)\b/.test(q)
  const wantsFirstGen = /\b(first[-\s]?gen|first generation)\b/.test(q)
  const wantsTransfer = /\b(transfer|community[-\s]?college)\b/.test(q)
  const wantsDaca = /\b(daca|undocumented|dreamer|tps)\b/.test(q)
  const wantsLgbtq = /\b(lgbtq|lgbt|queer|gay|lesbian|trans)\b/.test(q)
  const wantsMilitary = /\b(military|veteran|spouse|army|navy|marines?|air force)\b/.test(q)
  const wantsAsian = /\b(asian|pacific islander|aanhpi|apia)\b/.test(q)
  const stateHits: [RegExp, string][] = [
    [/\bcalifornia\b|\bcal grant\b/, 'california'],
    [/\btexas\b/, 'texas'],
    [/\bflorida\b|\bbright futures\b/, 'florida'],
    [/\billinois\b/, 'illinois'],
    [/\bnew york\b|\bexcelsior\b/, 'new-york'],
    [/\bwashington\b/, 'washington'],
    [/\barizona\b/, 'arizona'],
    [/\bgeorgia\b/, 'georgia'],
    [/\bohio\b/, 'ohio'],
    [/\bpennsylvania\b/, 'pennsylvania'],
    [/\bmassachusetts\b|\bmassgrant\b/, 'massachusetts'],
    [/\boregon\b/, 'oregon'],
    [/\bmichigan\b/, 'michigan'],
    [/\bcolorado\b/, 'colorado'],
    [/\bnorth carolina\b/, 'north-carolina'],
    [/\bvirginia\b/, 'virginia'],
    [/\bnew jersey\b/, 'new-jersey'],
    [/\bminnesota\b/, 'minnesota'],
  ]
  const wantedStates = stateHits.filter(([re]) => re.test(q)).map(([, s]) => s)

  const scored = CATALOG.map((item) => {
    let score = 0
    const tags = item.tags.map((t) => t.toLowerCase())
    const blob = `${item.name} ${item.summary} ${tags.join(' ')}`.toLowerCase()

    if (wantsBlack && tags.some((t) => ['black', 'african-american'].includes(t))) score += 45
    else if (wantsMinority && tags.includes('minority')) score += 28

    if (wantsHispanic && tags.some((t) => ['hispanic', 'latino', 'latina', 'mexican'].includes(t))) score += 45
    if (wantsWomen && (tags.includes('women') || tags.includes('latina') || tags.includes('diversity'))) score += 16

    if (wantsDisability && tags.some((t) => ['disability', 'disabled', 'accessibility', 'blind', 'deaf'].includes(t))) {
      score += 48
    }
    if (wantsFirstGen && (tags.includes('first-gen') || tags.includes('need-based'))) score += 22
    if (wantsTransfer && tags.some((t) => ['community-college', 'transfer'].includes(t))) score += 42
    if (wantsDaca && tags.some((t) => ['daca', 'undocumented', 'immigrant'].includes(t))) score += 48
    if (wantsLgbtq && tags.includes('lgbtq')) score += 48
    if (wantsMilitary && tags.some((t) => ['military', 'veteran', 'spouse'].includes(t))) score += 42
    if (wantsAsian && tags.some((t) => ['asian', 'pacific-islander', 'minority'].includes(t))) score += 40
    for (const state of wantedStates) {
      if (tags.includes(state)) score += 50
      else if (tags.includes('state') && blob.includes(state.replace('-', ' '))) score += 20
    }

    if (wantsSports && tags.some((t) => ['sports', 'athletics', 'athlete', 'ncaa'].includes(t))) score += 38
    else if (wantsSports && tags.includes('all-majors') && wantsHispanic) score += 14

    if (wantsMarketing && tags.includes('marketing')) score += 32
    else if (wantsMarketing && (tags.includes('business') || tags.includes('all-majors'))) score += 22
    if (wantsAccounting && tags.includes('accounting')) score += 44
    else if (wantsAccounting && tags.includes('business') && !tags.includes('marketing')) score += 18
    else if (wantsBusiness && !wantsAccounting && tags.some((t) => ['business', 'marketing', 'accounting'].includes(t))) {
      score += 18
    }
    // Marketing-primary is not an accounting pin
    if (wantsAccounting && tags.includes('marketing') && !tags.includes('accounting')) score -= 38
    if (wantsMath && tags.includes('math')) score += 40
    else if (wantsStem && tags.some((t) => ['stem', 'engineering', 'computer-science', 'science', 'math'].includes(t))) {
      score += 36
    }
    if (wantsGoogle && (item.id.includes('google') || item.id.includes('lime') || tags.includes('computer-science'))) {
      score += 30
    }
    if (wantsLeadership && tags.includes('leadership')) score += 22
    if (wantsNursing && (tags.includes('nursing') || tags.includes('healthcare'))) score += 40

    if (wantsStem && !wantsNursing && tags.includes('nursing') && !tags.includes('stem')) score -= 20
    if (wantsNursing && !wantsStem && tags.some((t) => ['engineering', 'computer-science'].includes(t)) && !tags.includes('nursing')) {
      score -= 20
    }
    if (wantsSports && tags.includes('nursing') && !tags.includes('sports')) score -= 15
    // Field focus: do not pin sports-only awards for accounting/business queries
    if (
      (wantsBusiness || wantsAccounting || wantsMarketing) &&
      !wantsSports &&
      tags.some((t) => ['sports', 'athletics', 'athlete', 'ncaa'].includes(t)) &&
      !tags.some((t) => ['business', 'marketing', 'accounting', 'all-majors'].includes(t))
    ) {
      score -= 40
    }
    if (
      wantsAccounting &&
      !tags.some((t) => ['accounting', 'business', 'all-majors'].includes(t)) &&
      tags.some((t) => ['nursing', 'healthcare', 'sports', 'athletics', 'stem', 'engineering'].includes(t))
    ) {
      score -= 25
    }
    if (wantsDisability && !tags.some((t) => ['disability', 'disabled', 'accessibility', 'blind', 'deaf'].includes(t))) {
      // Keep partial STEM/sports fits, but rank true disability awards higher
      score -= 8
    }
    if (wantsHispanic && tags.includes('black') && !tags.some((t) => ['hispanic', 'latino', 'latina', 'mexican'].includes(t))) {
      score -= 25
    }
    if (wantsBlack && tags.includes('hispanic') && !tags.some((t) => ['black', 'african-american', 'minority'].includes(t))) {
      score -= 50
    }

    if (wantsHs && tags.includes('high-school')) score += 15
    // Dual-tagged "undergrad" often means pays for college — detect senior-entry programs
    const hsSeniorEntry =
      tags.includes('high-school') &&
      !(tags.includes('undergrad') && tags.includes('grad')) &&
      !tags.includes('state') &&
      !tags.includes('federal') &&
      !tags.includes('community-college') &&
      !tags.includes('transfer') &&
      !(
        tags.some((t) => ['disability', 'disabled', 'accessibility', 'blind', 'deaf'].includes(t)) &&
        tags.includes('undergrad')
      )
    if (wantsUndergrad && tags.includes('undergrad') && !hsSeniorEntry) score += 10
    else if (wantsUndergrad && tags.includes('all-majors') && !tags.includes('high-school')) score += 8
    if (wantsNeed && tags.some((t) => ['need-based', 'pell-eligible', 'federal'].includes(t))) score += 12

    for (const token of q.split(/[^a-z0-9+]+/).filter((t) => t.length > 2)) {
      if (blob.includes(token)) score += 3
    }

    if (wantsMarketing && tags.includes('accounting') && !tags.includes('marketing') && !tags.includes('business')) {
      score -= 12
    }
    // Undergrad / college queries must not promote high-school senior entry awards
    if ((wantsUndergrad || /\b(graduate|professional)\b/.test(q)) && !wantsHs && hsSeniorEntry) {
      score -= 50
    }

    // Identity-locked awards: demote when the query never asked for a matching identity.
    // Multi-tag awards (DACA + Hispanic) keep score if ANY requested identity matches.
    const blackPrimary = tags.some((t) => ['black', 'african-american'].includes(t))
    const hispanicPrimary = tags.some((t) => ['hispanic', 'latino', 'latina', 'mexican'].includes(t))
    const undocPrimary = tags.some((t) => ['undocumented', 'daca', 'immigrant'].includes(t))
    const disabilityPrimary = tags.some((t) =>
      ['disability', 'disabled', 'accessibility', 'blind', 'deaf'].includes(t),
    )
    const lgbtqPrimary = tags.includes('lgbtq')
    const matchedIdentity =
      (blackPrimary && (wantsBlack || wantsMinority)) ||
      (hispanicPrimary && (wantsHispanic || wantsMinority)) ||
      (undocPrimary && wantsDaca) ||
      (disabilityPrimary && wantsDisability) ||
      (lgbtqPrimary && wantsLgbtq)
    const hasIdentityLock =
      blackPrimary || hispanicPrimary || undocPrimary || disabilityPrimary || lgbtqPrimary
    if (hasIdentityLock && !matchedIdentity) {
      if (blackPrimary && !wantsBlack && !wantsMinority) score -= 45
      else if (undocPrimary && !wantsDaca) score -= 45
      else if (hispanicPrimary && !wantsHispanic && !wantsMinority) score -= 45
      else if (disabilityPrimary && !wantsDisability) score -= 40
      else if (lgbtqPrimary && !wantsLgbtq) score -= 45
    }

    const parsed = Date.parse(item.deadline)
    if (!Number.isNaN(parsed) && parsed < Date.now() - 86400000) score -= 30

    const reason = buildReason(item, {
      wantsBlack,
      wantsWomen,
      wantsMarketing,
      wantsAccounting,
      wantsBusiness,
      wantsNeed,
      wantsMinority,
      wantsStem,
      wantsMath,
      wantsNursing,
      wantsHispanic,
      wantsSports,
      wantsDisability,
    })
    return { id: item.id, reason, score }
  })
    .filter((h) => h.score > 12)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)

  return scored
}

function buildReason(
  item: CatalogItem,
  flags: {
    wantsBlack: boolean
    wantsWomen: boolean
    wantsMarketing: boolean
    wantsAccounting: boolean
    wantsBusiness: boolean
    wantsNeed: boolean
    wantsMinority: boolean
    wantsStem: boolean
    wantsMath: boolean
    wantsNursing: boolean
    wantsHispanic: boolean
    wantsSports: boolean
    wantsDisability: boolean
  },
): string {
  const bits: string[] = []
  if (
    flags.wantsDisability &&
    item.tags.some((t) => ['disability', 'disabled', 'accessibility', 'blind', 'deaf'].includes(t))
  ) {
    bits.push('supports students with disabilities')
  }
  if (flags.wantsHispanic && item.tags.some((t) => ['hispanic', 'latino', 'latina', 'mexican'].includes(t))) {
    bits.push('supports Hispanic / Latino / Mexican students')
  }
  if (flags.wantsBlack && item.tags.some((t) => ['black', 'african-american'].includes(t))) {
    bits.push('supports Black students')
  } else if (flags.wantsMinority && item.tags.includes('minority') && !flags.wantsHispanic) {
    bits.push('supports minority students')
  }
  if (flags.wantsWomen && (item.tags.includes('women') || item.tags.includes('latina'))) {
    bits.push('women / Latina focus')
  }
  if (flags.wantsSports && item.tags.some((t) => ['sports', 'athletics', 'athlete', 'ncaa'].includes(t))) {
    bits.push('sports / athletics pathway')
  }
  if (flags.wantsAccounting && item.tags.includes('accounting')) bits.push('accounting / CPA path')
  else if (flags.wantsAccounting && item.tags.includes('business')) bits.push('business path related to accounting')
  if (flags.wantsMarketing && item.tags.includes('marketing')) bits.push('marketing focus')
  else if (flags.wantsMarketing && item.tags.some((t) => ['business', 'all-majors'].includes(t))) {
    bits.push('open to marketing / business paths')
  } else if (flags.wantsBusiness && !flags.wantsAccounting && item.tags.some((t) => ['business', 'marketing', 'accounting'].includes(t))) {
    bits.push('business-related award')
  }
  if (flags.wantsMath && item.tags.includes('math')) bits.push('math / quantitative STEM pathway')
  else if (flags.wantsStem && item.tags.some((t) => ['stem', 'engineering', 'computer-science', 'science', 'math'].includes(t))) {
    bits.push('STEM / engineering pathway')
  }
  if (flags.wantsNursing && (item.tags.includes('nursing') || item.tags.includes('healthcare'))) {
    bits.push('nursing / healthcare focus')
  }
  if (flags.wantsNeed && item.tags.some((t) => ['need-based', 'pell-eligible', 'federal'].includes(t))) {
    bits.push('need-based pathway')
  }
  if (!bits.length) bits.push(item.summary.slice(0, 100))
  return bits.join(' · ')
}

export function catalogByIds(ids: string[]): CatalogItem[] {
  const map = new Map<string, CatalogItem>(CATALOG.map((item) => [item.id, item]))
  const out: CatalogItem[] = []
  for (const id of ids) {
    const item = map.get(id)
    if (item) out.push(item)
  }
  return out
}

export function filterValidMatches(hits: MatchHit[]): MatchHit[] {
  const ids = new Set(CATALOG.map((c) => c.id as string))
  return hits.filter((h) => ids.has(h.id))
}

/** Short lead-in only — cards below carry the details. */
export function buildPreviewMessage(_hits: MatchHit[], lead?: string): string {
  const intro =
    lead?.split('\n')[0]?.trim() ||
    'Here are programs that look like a good fit. Save any you want to keep, or refine your search.'
  return intro
}

/**
 * Honest lead when the list only partially matches the request.
 */
export function buildClosestFitMessage(query: string, hits: MatchHit[]): string {
  const q = query.toLowerCase()
  const gaps: string[] = []
  if (/\b(sport|athletic|athlete|track)\b/.test(q) && !hits.some((h) => /sport|athletic/i.test(h.reason))) {
    gaps.push('sports-only awards')
  }
  if (/\b(handicap|handicapped|disabilit|disabled)\b/.test(q) && !hits.some((h) => /disabilit/i.test(h.reason))) {
    gaps.push('disability-specific awards beyond this list')
  }
  if (/\bmexican\b/.test(q)) {
    gaps.push('Mexico-only awards (we include broader Hispanic and Latino programs)')
  }
  const gapText = gaps.length ? `We may not have an exact match for ${gaps.join(' or ')}. ` : ''
  return `${gapText}Here are the closest programs from our list. Save any that help, or adjust your search.`
}

export function mergeMatches(ai: MatchHit[], local: MatchHit[], limit = 5): MatchHit[] {
  const map = new Map<string, MatchHit>()
  for (const hit of [...local, ...ai]) {
    const prev = map.get(hit.id)
    if (!prev || hit.score >= prev.score) {
      map.set(hit.id, {
        id: hit.id,
        reason: hit.reason || prev?.reason || '',
        score: Math.max(hit.score || 0, prev?.score || 0),
      })
    }
  }
  return filterValidMatches(Array.from(map.values()))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}
