import type { Profile } from './profile'

/**
 * Suggest profile gaps that would improve ranking for a given award.
 */
export function fitTips(tags: readonly string[], profile: Profile, score: number): string[] {
  if (score >= 78) return []
  const normalized = tags.map((t) => t.toLowerCase())
  const tips: string[] = []

  if (profile.state === 'any' && normalized.some((t) => t === 'state' || isStateTag(t))) {
    tips.push('Set your state — this looks like a state or regional award')
  }
  if (profile.identity === 'any') {
    if (normalized.some((t) => ['black', 'african-american'].includes(t))) tips.push('Add Black / African American under Background if it applies')
    if (normalized.some((t) => ['hispanic', 'latino', 'latina', 'mexican'].includes(t))) {
      tips.push('Add Hispanic / Latino / Mexican under Background if it applies')
    }
    if (normalized.includes('disability') || normalized.includes('disabled')) {
      tips.push('Add Student with a disability under Background if it applies')
    }
    if (normalized.includes('women')) tips.push('Add Women / female students under Background if it applies')
  }
  if (profile.major === 'any') {
    if (normalized.some((t) => ['stem', 'engineering', 'math', 'computer-science'].includes(t))) {
      tips.push('Set Major to STEM, engineering, CS, or math if that is your field')
    }
    if (normalized.includes('nursing')) tips.push('Set Major to Nursing if that is your field')
    if (normalized.some((t) => ['sports', 'athletics'].includes(t))) tips.push('Set Major to Sports / athletics if you compete')
  }
  if (profile.need === 'any' && normalized.includes('need-based')) {
    tips.push('Set Aid needs to Need-based if you plan to file FAFSA / show need')
  }
  if (
    (profile.level === 'undergrad' || profile.level === 'community-college' || profile.level === 'grad') &&
    normalized.includes('high-school') &&
    !normalized.includes('state') &&
    !normalized.includes('federal') &&
    !normalized.includes('community-college') &&
    !normalized.includes('transfer') &&
    !(normalized.includes('undergrad') && normalized.includes('grad'))
  ) {
    tips.push('This award is typically for high school seniors — not a fit if you are already in college')
  }

  return tips.slice(0, 3)
}

function isStateTag(tag: string): boolean {
  return [
    'california',
    'texas',
    'florida',
    'illinois',
    'new-york',
    'washington',
    'arizona',
    'georgia',
    'ohio',
    'pennsylvania',
    'massachusetts',
    'oregon',
    'michigan',
    'colorado',
    'north-carolina',
    'virginia',
    'new-jersey',
    'minnesota',
  ].includes(tag)
}
