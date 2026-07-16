/**
 * Shared pin allowlist — used by onboarding, profile search, and header free-text search.
 */
import { CATALOG, type CatalogItem } from '../data/catalog'
import type { MatchHit } from './matchCatalog'
import type { Profile } from './profile'
import { isBlackPrimary, isHighSchoolSeniorEntry, isHispanicPrimary } from './scoring'

/**
 * Whether a catalog hit may appear as a suggested pin for this profile.
 */
export function pinAllowedForProfile(item: CatalogItem, profile: Profile): boolean {
  // Drop high-school senior entry awards when the student is already in college
  if (profile.level && profile.level !== 'any' && profile.level !== 'high-school') {
    if (isHighSchoolSeniorEntry(item.tags)) return false
  }

  // Accounting majors should not get marketing-primary awards as suggested pins
  if (
    profile.major === 'accounting' &&
    item.tags.some((t) => t === 'marketing') &&
    !item.tags.some((t) => t === 'accounting')
  ) {
    return false
  }

  const id = profile.identity || 'any'
  const tags = item.tags.map((t) => t.toLowerCase())
  const black = isBlackPrimary(item.tags)
  const hispanic = isHispanicPrimary(item.tags)
  const lgbtq = tags.includes('lgbtq')
  const disability = tags.some((t) =>
    ['disability', 'disabled', 'accessibility', 'blind', 'deaf'].includes(t),
  )
  const undoc = tags.some((t) => ['undocumented', 'daca', 'immigrant'].includes(t))
  const military = tags.some((t) => ['military', 'veteran', 'spouse'].includes(t))
  const asian = tags.includes('asian') || tags.includes('pacific-islander')
  const native = tags.includes('native')
  const locked = black || hispanic || lgbtq || disability || undoc || military || asian || native
  if (!locked) return true

  if (id === 'black' && black) return true
  if (id === 'hispanic' && hispanic) return true
  if (id === 'lgbtq' && lgbtq) return true
  if (id === 'disability' && disability) return true
  if (id === 'undocumented' && undoc) return true
  if (id === 'military' && military) return true
  if (id === 'asian' && asian) return true
  if (id === 'native' && native) return true

  return false
}

/**
 * Filter keyword match hits with the same gates as onboarding pins.
 * When state is open, de-prioritize state-tagged grants.
 */
export function filterPinsForProfile(hits: MatchHit[], profile: Profile, limit = 8): MatchHit[] {
  const byId = new Map(CATALOG.map((c) => [c.id, c]))
  let pins = hits.filter((hit) => {
    const item = byId.get(hit.id)
    if (!item) return false
    return pinAllowedForProfile(item, profile)
  })

  const stateOpen = !profile.state || profile.state === 'any'
  if (stateOpen && pins.length > 1) {
    pins = [...pins].sort((a, b) => {
      const aState = byId.get(a.id)?.tags.some((t) => t === 'state') ? 1 : 0
      const bState = byId.get(b.id)?.tags.some((t) => t === 'state') ? 1 : 0
      if (aState !== bState) return aState - bState
      return b.score - a.score
    })
  }

  if (profile.major && profile.major !== 'any' && pins.length > 1) {
    const majorToken = profile.major.replace(/-/g, ' ')
    const majorKeywords = [majorToken, profile.major, 'accounting', 'business', 'cpa', 'marketing']
    pins = [...pins].sort((a, b) => {
      const aMaj = majorKeywords.some((k) => k && `${a.reason} ${a.id}`.toLowerCase().includes(k))
      const bMaj = majorKeywords.some((k) => k && `${b.reason} ${b.id}`.toLowerCase().includes(k))
      if (aMaj !== bMaj) return aMaj ? -1 : 1
      return b.score - a.score
    })
  }

  return pins.slice(0, limit)
}
