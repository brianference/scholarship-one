import type { Profile } from './profile'

/** Compute 0–100 match score from profile vs scholarship tags. */
export function scoreItem(tags: readonly string[], profile: Profile): number {
  let score = 40
  const normalized = tags.map((tag) => tag.toLowerCase())
  const major = profile.major.toLowerCase()
  if (major && normalized.some((tag) => tag.includes(major) || major.includes(tag))) score += 30
  if (profile.level === 'high-school' && normalized.includes('high-school')) score += 15
  if (
    profile.level === 'undergrad' &&
    (normalized.includes('merit') || normalized.includes('accounting') || normalized.includes('business'))
  ) {
    score += 10
  }
  if (profile.state !== 'any' && normalized.some((tag) => tag.includes(profile.state.toLowerCase()))) score += 15
  if (normalized.includes('federal') || normalized.includes('required')) score += 5
  return Math.min(100, score)
}
