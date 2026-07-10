import type { Profile } from './profile'

export type ScorePart = { label: string; points: number }

export type ScoreBreakdown = {
  total: number
  parts: ScorePart[]
  penalties: ScorePart[]
}

/**
 * Explainable match score: parts sum (then clamped) so the UI can show why.
 */
export function scoreBreakdown(tags: readonly string[], profile: Profile): ScoreBreakdown {
  const parts: ScorePart[] = [{ label: 'Base fit', points: 36 }]
  const penalties: ScorePart[] = []
  const normalized = tags.map((tag) => tag.toLowerCase())
  const major = profile.major.toLowerCase()

  if (major && major !== 'any' && normalized.some((tag) => tag.includes(major) || major.includes(tag))) {
    parts.push({ label: `Major: ${major.replace(/-/g, ' ')}`, points: 28 })
  }
  if (major === 'marketing' && (normalized.includes('marketing') || normalized.includes('business'))) {
    parts.push({ label: 'Marketing / business path', points: 12 })
  }
  if (major === 'business' && normalized.some((t) => ['business', 'marketing', 'accounting'].includes(t))) {
    parts.push({ label: 'Business-related tags', points: 10 })
  }
  if (major === 'accounting' && normalized.includes('accounting')) {
    parts.push({ label: 'Accounting focus', points: 16 })
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
  if (major === 'sports' && normalized.some((t) => ['sports', 'athletics', 'athlete', 'ncaa'].includes(t))) {
    parts.push({ label: 'Sports / athletics', points: 22 })
  }
  if (major === 'social-science' && normalized.includes('all-majors')) {
    parts.push({ label: 'Open to all majors', points: 8 })
  }
  if (
    (major === 'engineering' || major === 'computer-science' || major === 'stem' || major === 'math') &&
    normalized.some((t) => ['stem', 'engineering', 'computer-science', 'science', 'math'].includes(t))
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
    parts.push({ label: 'High school senior', points: 16 })
  }
  if (
    (profile.level === 'undergrad' || profile.level === 'community-college') &&
    (normalized.includes('undergrad') || normalized.includes('all-majors'))
  ) {
    parts.push({ label: 'Undergraduate-friendly', points: 10 })
  }
  if (profile.level === 'grad' && (normalized.includes('grad') || normalized.includes('all-majors'))) {
    parts.push({ label: 'Graduate-friendly', points: 10 })
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
    parts.push({ label: 'Merit-based aid', points: 10 })
  }

  if (normalized.includes('federal') || normalized.includes('required')) {
    parts.push({ label: 'Federal aid gateway', points: 4 })
  }

  if (profile.identity === 'black' && normalized.includes('hispanic') && !normalized.includes('black')) {
    penalties.push({ label: 'Identity mismatch (Hispanic-focused)', points: -25 })
  }
  if (profile.identity === 'hispanic' && normalized.includes('black') && !normalized.includes('hispanic')) {
    penalties.push({ label: 'Identity mismatch (Black-focused)', points: -10 })
  }

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
