/**
 * Pure helpers for turning a profile into a search / pin plan.
 * Used by onboarding + About you — easy to unit-test without React.
 */
import type { Profile } from './profile'
import {
  IDENTITY_OPTIONS,
  LEVEL_OPTIONS,
  MAJOR_OPTIONS,
  NEED_OPTIONS,
  STATE_OPTIONS,
} from './profileOptions'
import { CATALOG } from '../data/catalog'
import { matchCatalog, type MatchHit } from './matchCatalog'
import { filterPinsForProfile, pinAllowedForProfile } from './pinFilter'
import { scoreItem } from './scoring'

function labelFor(options: readonly { value: string; label: string }[], value: string): string {
  if (!value || value === 'any') return ''
  return options.find((o) => o.value === value)?.label || value.replace(/-/g, ' ')
}

/** Human phrases that matchCatalog understands better than raw enum values. */
export function profileToSearchText(profile: Profile): string {
  const parts = [
    labelFor(LEVEL_OPTIONS, profile.level),
    labelFor(STATE_OPTIONS, profile.state),
    labelFor(MAJOR_OPTIONS, profile.major),
    labelFor(IDENTITY_OPTIONS, profile.identity),
    labelFor(NEED_OPTIONS, profile.need),
  ].filter(Boolean)
  return parts.join(' ') || 'undergraduate scholarships'
}

export type ProfileSearchPlan = {
  searchText: string
  displayLabel: string
  pins: MatchHit[]
  /** Keep category open so the list is not over-filtered after onboarding. */
  categoryId: string
}

/**
 * Rank catalog by profile score for pins when keyword match is empty after filters.
 * When state is open, prefer national / non-state awards so pins are not only random state grants.
 */
function scoreBasedPins(profile: Profile, pinLimit: number): MatchHit[] {
  const stateOpen = !profile.state || profile.state === 'any'
  return CATALOG.map((item) => {
    let score = scoreItem(item.tags, profile)
    const tags = item.tags.map((t) => t.toLowerCase())
    if (stateOpen && tags.some((t) => t === 'state')) score -= 12
    if (stateOpen && !tags.some((t) => t === 'state') && tags.includes('undergrad')) score += 4
    return {
      id: item.id,
      reason: item.summary.slice(0, 100),
      score,
    }
  })
    .filter((h) => h.score >= 28)
    .filter((h) => {
      const item = CATALOG.find((c) => c.id === h.id)
      return item ? pinAllowedForProfile(item, profile) : false
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, pinLimit)
}

/**
 * Plan pins + labels after onboarding / Save & rank.
 * Prefers major-aligned hits so a sports-only award is not “suggested” for accounting.
 */
export function buildProfileSearchPlan(profile: Profile, pinLimit = 8): ProfileSearchPlan {
  const searchText = profileToSearchText(profile)

  const collect = (query: string) =>
    filterPinsForProfile(matchCatalog(query, Math.max(pinLimit * 3, 16)), profile, pinLimit * 2)

  let pins = collect(searchText)

  if (pins.length === 0) {
    const fallbacks = [
      labelFor(MAJOR_OPTIONS, profile.major),
      labelFor(STATE_OPTIONS, profile.state),
      labelFor(IDENTITY_OPTIONS, profile.identity),
      profile.level === 'undergrad' || profile.level === 'community-college'
        ? 'undergraduate college scholarships merit need'
        : labelFor(LEVEL_OPTIONS, profile.level),
      'undergraduate scholarships',
      'college scholarships undergrad',
    ].filter(Boolean)
    for (const fb of fallbacks) {
      pins = collect(fb)
      if (pins.length) break
    }
  }

  if (pins.length === 0) {
    pins = filterPinsForProfile(scoreBasedPins(profile, pinLimit * 2), profile, pinLimit)
  } else {
    pins = filterPinsForProfile(pins, profile, pinLimit)
  }

  return {
    searchText,
    displayLabel: searchText,
    pins: pins.slice(0, pinLimit),
    categoryId: 'all',
  }
}

/**
 * Free-text header search → filtered pin ids (same gates as onboarding).
 */
export function pinsFromFreeTextSearch(query: string, profile: Profile, limit = 8): MatchHit[] {
  const raw = matchCatalog(query, Math.max(limit * 3, 16))
  let pins = filterPinsForProfile(raw, profile, limit)
  if (pins.length === 0) {
    // Fall back to profile plan if query only matched filtered-out awards
    pins = buildProfileSearchPlan(profile, limit).pins
  }
  return pins
}
