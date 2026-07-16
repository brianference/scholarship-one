import type { Profile } from './profile'

export type ScorePart = { label: string; points: number }

export type ScoreBreakdown = {
  total: number
  parts: ScorePart[]
  penalties: ScorePart[]
}

const SPORTS_TAGS = ['sports', 'athletics', 'athlete', 'ncaa'] as const
const NURSING_TAGS = ['nursing', 'healthcare'] as const
const STEM_TAGS = ['stem', 'engineering', 'computer-science', 'science', 'math'] as const
const BUSINESS_TAGS = ['business', 'marketing', 'accounting'] as const

function hasAny(tags: readonly string[], set: readonly string[]): boolean {
  return tags.some((t) => set.includes(t))
}

/**
 * High-school-only tags (no undergrad/grad/cc). Strict form.
 * Note: `all-majors` means any field of study — it does NOT mean current undergrads are eligible.
 */
export function isHighSchoolPrimary(tags: readonly string[]): boolean {
  const t = tags.map((x) => x.toLowerCase())
  return (
    t.includes('high-school') &&
    !t.includes('undergrad') &&
    !t.includes('grad') &&
    !t.includes('community-college')
  )
}

/**
 * Awards whose main application path is high school senior year.
 * Many catalog rows dual-tag `undergrad` to mean "pays for college," not "current undergrads apply."
 * Excludes ongoing state/federal aid, transfer/CC, multi-level (HS+UG+grad), and disability college programs.
 */
export function isHighSchoolSeniorEntry(tags: readonly string[]): boolean {
  const t = tags.map((x) => x.toLowerCase())
  if (!t.includes('high-school')) return false

  // Multi-level programs open across school stages
  if (t.includes('undergrad') && t.includes('grad')) return false

  // Ongoing college aid undergrads renew or re-apply for
  if (
    t.includes('state') ||
    t.includes('federal') ||
    t.includes('community-college') ||
    t.includes('transfer')
  ) {
    return false
  }

  // Disability awards often serve both graduating seniors and current students
  if (
    t.some((x) => ['disability', 'disabled', 'accessibility', 'blind', 'deaf'].includes(x)) &&
    t.includes('undergrad')
  ) {
    return false
  }

  // Pure HS-primary OR dual-tagged "senior → college" programs (Dell, Elks, Horatio Alger, etc.)
  return true
}

/** Explicit undergrad eligibility for currently enrolled / college-seeking undergrads. */
export function isUndergradEligible(tags: readonly string[]): boolean {
  const t = tags.map((x) => x.toLowerCase())
  if (isHighSchoolSeniorEntry(t)) return false
  if (t.includes('undergrad')) return true
  if (t.includes('all-majors') && !t.includes('high-school')) return true
  return false
}

const BLACK_ID_TAGS = ['black', 'african-american'] as const
const HISPANIC_ID_TAGS = ['hispanic', 'latino', 'latina', 'mexican'] as const
const DISABILITY_ID_TAGS = ['disability', 'disabled', 'accessibility', 'blind', 'deaf'] as const
const UNDOC_ID_TAGS = ['undocumented', 'daca', 'immigrant'] as const
const MILITARY_ID_TAGS = ['military', 'veteran', 'spouse'] as const

/** Award is clearly for Black / African American students. */
export function isBlackPrimary(tags: readonly string[]): boolean {
  return hasAny(
    tags.map((t) => t.toLowerCase()),
    BLACK_ID_TAGS,
  )
}

export function isHispanicPrimary(tags: readonly string[]): boolean {
  return hasAny(
    tags.map((t) => t.toLowerCase()),
    HISPANIC_ID_TAGS,
  )
}

/**
 * Penalize identity-locked awards when the student did not select a matching background.
 * Multi-tag awards (e.g. DACA + Hispanic) match if ANY lock matches the profile —
 * do not punish DACA students for a secondary Hispanic tag.
 * "No preference" still demotes locked awards so base + school level cannot look like a strong match.
 */
function identityMismatch(identity: string, tags: readonly string[]): ScorePart | null {
  const t = tags.map((x) => x.toLowerCase())
  const id = (identity || 'any').toLowerCase()

  const black = hasAny(t, BLACK_ID_TAGS)
  const hispanic = hasAny(t, HISPANIC_ID_TAGS)
  const disability = hasAny(t, DISABILITY_ID_TAGS)
  const lgbtq = t.includes('lgbtq')
  const undoc = hasAny(t, UNDOC_ID_TAGS)
  const military = hasAny(t, MILITARY_ID_TAGS)
  const asian = t.includes('asian') || t.includes('pacific-islander')
  const native = t.includes('native')

  const locked = black || hispanic || disability || lgbtq || undoc || military || asian || native
  if (!locked) return null

  if (id === 'any' || !id) {
    // Prefer the most specific lock label (DACA before broader Hispanic, etc.)
    if (undoc) return { label: 'DACA / undocumented focus — not selected in profile', points: -32 }
    if (disability) return { label: 'Disability focus — not selected in profile', points: -32 }
    if (lgbtq) return { label: 'LGBTQ+ focus — not selected in profile', points: -32 }
    if (black) return { label: 'Black / African American focus — not selected in profile', points: -32 }
    if (hispanic) return { label: 'Hispanic / Latino focus — not selected in profile', points: -32 }
    if (military) return { label: 'Military focus — not selected in profile', points: -28 }
    if (asian) return { label: 'AANHPI focus — not selected in profile', points: -28 }
    if (native) return { label: 'Native / Indigenous focus — not selected in profile', points: -28 }
    return null
  }

  // User matches at least one identity dimension on the award → no penalty
  // (e.g. undocumented matches TheDream.US even when it is also tagged Hispanic)
  if (id === 'black' && black) return null
  if (id === 'hispanic' && hispanic) return null
  if (id === 'disability' && disability) return null
  if (id === 'lgbtq' && lgbtq) return null
  if (id === 'undocumented' && undoc) return null
  if (id === 'military' && military) return null
  if (id === 'asian' && asian) return null
  if (id === 'native' && native) return null

  // No overlapping identity — pick the strongest mismatched lock for the message
  if (black) return { label: 'Identity mismatch (Black / African American focused)', points: -48 }
  if (undoc) return { label: 'Identity mismatch (DACA / undocumented focused)', points: -48 }
  if (hispanic) return { label: 'Identity mismatch (Hispanic / Latino focused)', points: -48 }
  if (disability) return { label: 'Identity mismatch (disability-focused)', points: -48 }
  if (lgbtq) return { label: 'Identity mismatch (LGBTQ+ focused)', points: -48 }
  if (military) return { label: 'Identity mismatch (military-focused)', points: -40 }
  if (asian) return { label: 'Identity mismatch (AANHPI-focused)', points: -40 }
  if (native) return { label: 'Identity mismatch (Native / Indigenous focused)', points: -40 }

  return null
}

/**
 * Penalize awards that target a different school level than the profile.
 */
function levelMismatch(level: string, tags: readonly string[]): ScorePart | null {
  if (!level || level === 'any') return null
  const t = tags.map((x) => x.toLowerCase())

  if (level === 'undergrad' || level === 'community-college' || level === 'grad') {
    if (isHighSchoolSeniorEntry(t)) {
      return { label: 'School level mismatch (high school seniors)', points: -50 }
    }
  }

  if (level === 'grad') {
    const gradOk = t.includes('grad') || (t.includes('all-majors') && !isHighSchoolSeniorEntry(t))
    if (!gradOk && t.includes('undergrad') && !t.includes('grad')) {
      return { label: 'School level mismatch (undergrad-focused)', points: -22 }
    }
  }

  if (level === 'high-school') {
    // Pure college-only awards with no HS path
    if (!t.includes('high-school') && t.includes('undergrad') && !t.includes('all-majors') && !t.includes('grad')) {
      // Many undergrad awards accept incoming freshmen — light penalty only
      return { label: 'Often for enrolled college students', points: -8 }
    }
  }

  return null
}

/**
 * True when the award is clearly specialized for a domain the student did not pick.
 * Open / all-majors awards are not treated as hard domain conflicts.
 */
function majorDomainMismatch(major: string, tags: readonly string[]): ScorePart | null {
  if (!major || major === 'any') return null
  if (tags.includes('all-majors')) return null

  const isSportsMajor = major === 'sports'
  const isNursingMajor = major === 'nursing' || major === 'healthcare'
  const isStemMajor = ['engineering', 'computer-science', 'stem', 'math'].includes(major)
  const isBusinessMajor = ['business', 'marketing', 'accounting'].includes(major)
  const isEducation = major === 'education'
  const isArts = major === 'arts'

  const sportsHeavy = hasAny(tags, SPORTS_TAGS) && !hasAny(tags, BUSINESS_TAGS) && !hasAny(tags, STEM_TAGS)
  const nursingHeavy = hasAny(tags, NURSING_TAGS) && !hasAny(tags, BUSINESS_TAGS) && !tags.includes('all-majors')
  const stemHeavy =
    hasAny(tags, STEM_TAGS) &&
    !hasAny(tags, BUSINESS_TAGS) &&
    !hasAny(tags, NURSING_TAGS) &&
    !tags.includes('all-majors')
  const businessHeavy = hasAny(tags, BUSINESS_TAGS) && !hasAny(tags, SPORTS_TAGS) && !hasAny(tags, NURSING_TAGS)

  // Accounting major + sports-only grant (e.g. Women’s Sports Foundation) must not look like a strong match
  if (!isSportsMajor && sportsHeavy) {
    return { label: 'Field mismatch (sports / athletics focus)', points: -42 }
  }
  if (!isNursingMajor && nursingHeavy && !isStemMajor) {
    return { label: 'Field mismatch (nursing / healthcare focus)', points: -36 }
  }
  if (!isStemMajor && !isNursingMajor && stemHeavy && isBusinessMajor) {
    return { label: 'Field mismatch (STEM focus)', points: -28 }
  }
  if (isSportsMajor && businessHeavy && !hasAny(tags, SPORTS_TAGS)) {
    return { label: 'Field mismatch (business focus)', points: -20 }
  }
  if (isEducation && nursingHeavy) {
    return { label: 'Field mismatch (nursing focus)', points: -30 }
  }
  if (isArts && stemHeavy) {
    return { label: 'Field mismatch (STEM focus)', points: -24 }
  }

  // Marketing-primary awards are not a fit for pure accounting (even if also tagged business)
  if (
    major === 'accounting' &&
    tags.includes('marketing') &&
    !tags.includes('accounting') &&
    !tags.includes('all-majors')
  ) {
    return { label: 'Field mismatch (marketing focus, not accounting)', points: -40 }
  }
  // Accounting-primary awards are weak for pure marketing majors
  if (
    major === 'marketing' &&
    tags.includes('accounting') &&
    !tags.includes('marketing') &&
    !tags.includes('business') &&
    !tags.includes('all-majors')
  ) {
    return { label: 'Field mismatch (accounting focus, not marketing)', points: -28 }
  }

  // Specific major set but award has no major-related signal at all (only level/identity tags)
  // Note: all-majors alone is NOT enough field overlap when a specific major is chosen
  // and the award is also identity-locked to a group the student did not select
  // (handled by identity mismatch). For field: require a real major tag or all-majors
  // only when not marketing-only for accounting etc.
  const hasMajorSignal =
    hasAny(tags, SPORTS_TAGS) ||
    hasAny(tags, NURSING_TAGS) ||
    hasAny(tags, STEM_TAGS) ||
    hasAny(tags, BUSINESS_TAGS) ||
    tags.includes('education') ||
    tags.includes('arts') ||
    tags.includes('all-majors') ||
    tags.some((t) => t.includes(major) || major.includes(t))

  if (!hasMajorSignal && ['accounting', 'nursing', 'engineering', 'computer-science', 'math', 'sports', 'marketing'].includes(major)) {
    return { label: 'No field overlap with your major', points: -18 }
  }

  return null
}

/**
 * Explainable match score: parts sum (then clamped) so the UI can show why.
 * Base is modest so level/identity alone cannot look like a strong major match.
 */
export function scoreBreakdown(tags: readonly string[], profile: Profile): ScoreBreakdown {
  const parts: ScorePart[] = [{ label: 'Base fit', points: 22 }]
  const penalties: ScorePart[] = []
  const normalized = tags.map((tag) => tag.toLowerCase())
  const major = profile.major.toLowerCase()

  // Exact / substring major tag — avoid matching short accidental substrings
  if (
    major &&
    major !== 'any' &&
    major.length >= 4 &&
    normalized.some((tag) => tag === major || (tag.length >= 4 && (tag.includes(major) || major.includes(tag))))
  ) {
    parts.push({ label: `Major: ${major.replace(/-/g, ' ')}`, points: 28 })
  }
  if (major === 'marketing' && (normalized.includes('marketing') || normalized.includes('business'))) {
    parts.push({ label: 'Marketing / business path', points: 12 })
  }
  if (major === 'business' && hasAny(normalized, BUSINESS_TAGS)) {
    parts.push({ label: 'Business-related tags', points: 10 })
  }
  if (major === 'accounting' && normalized.includes('accounting')) {
    parts.push({ label: 'Accounting focus', points: 20 })
  }
  // Only count generic business as related when the award is not marketing-primary
  if (
    major === 'accounting' &&
    normalized.includes('business') &&
    !normalized.includes('accounting') &&
    !normalized.includes('marketing')
  ) {
    parts.push({ label: 'Business path (related to accounting)', points: 8 })
  }
  if (major === 'nursing' && (normalized.includes('nursing') || normalized.includes('healthcare'))) {
    parts.push({ label: 'Nursing / healthcare', points: 22 })
  }
  if (major === 'healthcare' && (normalized.includes('healthcare') || normalized.includes('nursing'))) {
    parts.push({ label: 'Healthcare path', points: 16 })
  }
  if (major === 'education' && normalized.includes('education')) {
    parts.push({ label: 'Education focus', points: 18 })
  }
  if (major === 'arts' && (normalized.includes('arts') || normalized.includes('all-majors'))) {
    parts.push({ label: 'Arts / open majors', points: 12 })
  }
  if (major === 'sports' && hasAny(normalized, SPORTS_TAGS)) {
    parts.push({ label: 'Sports / athletics', points: 22 })
  }
  if (major === 'social-science' && normalized.includes('all-majors')) {
    parts.push({ label: 'Open to all majors', points: 8 })
  }
  if (
    (major === 'engineering' || major === 'computer-science' || major === 'stem' || major === 'math') &&
    hasAny(normalized, STEM_TAGS)
  ) {
    parts.push({ label: 'STEM pathway', points: 20 })
  }
  if (major === 'math' && normalized.includes('math')) {
    parts.push({ label: 'Math-specific', points: 14 })
  }
  if (major === 'computer-science' && normalized.includes('computer-science')) {
    parts.push({ label: 'Computer science', points: 10 })
  }

  if (profile.level === 'high-school' && normalized.includes('high-school')) {
    parts.push({ label: 'High school senior', points: 14 })
  }
  // Do not treat all-majors alone as undergrad when the award is high-school primary
  if (
    (profile.level === 'undergrad' || profile.level === 'community-college') &&
    isUndergradEligible(normalized)
  ) {
    parts.push({ label: 'Undergraduate-friendly', points: 8 })
  }
  if (
    profile.level === 'grad' &&
    (normalized.includes('grad') || (normalized.includes('all-majors') && !isHighSchoolSeniorEntry(normalized)))
  ) {
    parts.push({ label: 'Graduate-friendly', points: 8 })
  }
  if (profile.level === 'community-college' && normalized.includes('community-college')) {
    parts.push({ label: 'Community college / transfer', points: 18 })
  }

  if (profile.state !== 'any') {
    const state = profile.state.toLowerCase()
    if (normalized.includes(state)) {
      parts.push({ label: `Your state: ${state.replace(/-/g, ' ')}`, points: 28 })
    } else if (normalized.includes('state') && normalized.some((tag) => tag.includes(state))) {
      parts.push({ label: 'State-related award', points: 22 })
    }
  }

  if (profile.identity === 'black' && normalized.some((t) => ['black', 'african-american', 'minority'].includes(t))) {
    parts.push({ label: 'Black / minority support', points: 18 })
  }
  if (
    profile.identity === 'hispanic' &&
    normalized.some((t) => ['hispanic', 'latino', 'latina', 'mexican'].includes(t))
  ) {
    parts.push({ label: 'Hispanic / Latino support', points: 18 })
  }
  if (
    profile.identity === 'women' &&
    (normalized.includes('women') || normalized.includes('latina') || normalized.includes('diversity'))
  ) {
    parts.push({ label: 'Women / diversity focus', points: 12 })
  }
  if (profile.identity === 'first-gen' && (normalized.includes('need-based') || normalized.includes('all-majors'))) {
    parts.push({ label: 'First-gen friendly signals', points: 8 })
  }
  if (profile.identity === 'first-gen' && normalized.includes('first-gen')) {
    parts.push({ label: 'First-generation tag', points: 14 })
  }
  if (
    profile.identity === 'disability' &&
    normalized.some((t) => ['disability', 'disabled', 'accessibility', 'blind', 'deaf'].includes(t))
  ) {
    parts.push({ label: 'Disability support', points: 22 })
  }
  if (profile.identity === 'asian' && normalized.some((t) => ['asian', 'pacific-islander', 'minority'].includes(t))) {
    parts.push({ label: 'AANHPI / minority support', points: 16 })
  }
  if (profile.identity === 'native' && normalized.some((t) => ['native', 'minority'].includes(t))) {
    parts.push({ label: 'Native / minority support', points: 12 })
  }
  if (profile.identity === 'lgbtq' && normalized.includes('lgbtq')) {
    parts.push({ label: 'LGBTQ+ support', points: 22 })
  }
  if (profile.identity === 'military' && normalized.some((t) => ['military', 'veteran', 'spouse'].includes(t))) {
    parts.push({ label: 'Military family', points: 20 })
  }
  if (
    profile.identity === 'undocumented' &&
    normalized.some((t) => ['undocumented', 'daca', 'immigrant'].includes(t))
  ) {
    parts.push({ label: 'DACA / undocumented path', points: 22 })
  }

  if (
    (profile.need === 'need' || profile.need === 'both') &&
    normalized.some((t) => ['need-based', 'pell-eligible', 'federal'].includes(t))
  ) {
    parts.push({ label: 'Need-based aid', points: 12 })
  }
  if ((profile.need === 'merit' || profile.need === 'both') && normalized.includes('merit')) {
    parts.push({ label: 'Merit-based aid', points: 8 })
  }

  if (normalized.includes('federal') || normalized.includes('required')) {
    parts.push({ label: 'Federal aid gateway', points: 4 })
  }

  const domainPenalty = majorDomainMismatch(major, normalized)
  if (domainPenalty) penalties.push(domainPenalty)

  const levelPenalty = levelMismatch(profile.level, normalized)
  if (levelPenalty) penalties.push(levelPenalty)

  const idPenalty = identityMismatch(profile.identity, normalized)
  if (idPenalty) penalties.push(idPenalty)

  const raw = parts.reduce((s, p) => s + p.points, 0) + penalties.reduce((s, p) => s + p.points, 0)
  return {
    total: Math.max(0, Math.min(100, raw)),
    parts,
    penalties,
  }
}

/** Compute 0–100 match score from profile vs scholarship tags. */
export function scoreItem(tags: readonly string[], profile: Profile): number {
  return scoreBreakdown(tags, profile).total
}
