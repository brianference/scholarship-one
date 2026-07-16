import type { Profile } from './profile'
import { isHighSchoolSeniorEntry, isUndergradEligible } from './scoring'

/**
 * Human-readable reasons a program fits the profile (trust / explainability).
 */
export function matchWhy(tags: readonly string[], profile: Profile): string[] {
  const normalized = tags.map((t) => t.toLowerCase())
  const why: string[] = []
  const major = profile.major.toLowerCase()

  if (major && major !== 'any' && normalized.some((t) => t.includes(major) || major.includes(t))) {
    why.push(`Matches your ${major.replace('-', ' ')} focus`)
  } else if (major === 'marketing' && normalized.includes('business')) {
    why.push('Open to marketing / business paths')
  } else if (
    (major === 'engineering' || major === 'computer-science' || major === 'stem' || major === 'math') &&
    normalized.some((t) => ['stem', 'engineering', 'computer-science', 'science', 'math'].includes(t))
  ) {
    why.push(major === 'math' ? 'Math / quantitative STEM pathway' : 'STEM / engineering pathway')
  } else if (major === 'nursing' && (normalized.includes('nursing') || normalized.includes('healthcare'))) {
    why.push('Nursing / healthcare pathway')
  }

  if (profile.level === 'high-school' && normalized.includes('high-school')) {
    why.push('Open to high school seniors')
  }
  // Dual-tagged senior programs are not "fits undergrad" for currently enrolled students
  if (
    (profile.level === 'undergrad' || profile.level === 'community-college') &&
    isUndergradEligible(normalized)
  ) {
    why.push('Fits undergrad applicants')
  } else if (
    (profile.level === 'undergrad' || profile.level === 'community-college') &&
    isHighSchoolSeniorEntry(normalized)
  ) {
    why.push('Typically for high school seniors applying to college — not for enrolled undergrads')
  }
  if (
    profile.level === 'grad' &&
    (normalized.includes('grad') ||
      (normalized.includes('all-majors') && !isHighSchoolSeniorEntry(normalized)))
  ) {
    why.push('Open to graduate students')
  }

  if (profile.identity === 'black' && normalized.some((t) => ['black', 'african-american', 'minority'].includes(t))) {
    why.push('Supports Black / minority students')
  } else if (
    profile.identity !== 'black' &&
    normalized.some((t) => ['black', 'african-american'].includes(t))
  ) {
    why.push('Targets Black / African American students — only if that applies to you')
  }
  if (profile.identity === 'hispanic' && normalized.some((t) => ['hispanic', 'latino', 'latina', 'mexican'].includes(t))) {
    why.push('Supports Hispanic / Latino / Mexican students')
  } else if (
    profile.identity !== 'hispanic' &&
    normalized.some((t) => ['hispanic', 'latino', 'latina', 'mexican'].includes(t))
  ) {
    why.push('Targets Hispanic / Latino students — only if that applies to you')
  }
  if (profile.identity === 'women' && (normalized.includes('women') || normalized.includes('latina') || normalized.includes('diversity'))) {
    why.push('Women / Latina focus')
  }
  if (
    profile.identity === 'disability' &&
    normalized.some((t) => ['disability', 'disabled', 'accessibility', 'blind', 'deaf'].includes(t))
  ) {
    why.push('Supports students with disabilities')
  }
  // Only claim sports pathway when the student chose sports (or left major open)
  if (
    (major === 'sports' || major === 'any' || !major) &&
    normalized.some((t) => ['sports', 'athletics', 'athlete', 'ncaa'].includes(t))
  ) {
    why.push('Sports / athletics pathway')
  }

  if (profile.need === 'need' && normalized.some((t) => ['need-based', 'pell-eligible', 'federal'].includes(t))) {
    why.push('Need-based pathway')
  }
  if (profile.need === 'merit' && normalized.includes('merit')) why.push('Merit-based award')

  if (normalized.includes('federal') || normalized.includes('required')) why.push('Federal aid gateway')

  return why.slice(0, 3)
}
