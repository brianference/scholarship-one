/**
 * The set of awards the app knows about: the built-in catalog plus awards the finder found on the
 * web and verified. One registry so every lookup (tracker, saves, reminders, digest) sees both.
 * Web finds are cached locally so the first paint does not wait for the network.
 */
import { CATALOG, type AwardBase } from '../data/catalog'

const CACHE_KEY = 'scholarship-one-discovered'

/** A web find is only accepted into the registry if it has every field the UI reads. */
export function isAwardBase(x: unknown): x is AwardBase {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  return (
    typeof o.id === 'string' &&
    o.id.startsWith('web-') &&
    typeof o.name === 'string' &&
    typeof o.amount === 'string' &&
    typeof o.deadline === 'string' &&
    typeof o.url === 'string' &&
    o.url.startsWith('https://') &&
    typeof o.summary === 'string' &&
    typeof o.addedAt === 'string' &&
    Array.isArray(o.tags) &&
    o.tags.every((t) => typeof t === 'string')
  )
}

function loadCache(): AwardBase[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isAwardBase) : []
  } catch {
    return []
  }
}

const catalogAwards: readonly AwardBase[] = CATALOG
let discovered: readonly AwardBase[] = loadCache()
let merged: readonly AwardBase[] = [...catalogAwards, ...discovered]
let byId = new Map<string, AwardBase>(merged.map((a) => [a.id, a]))

/** Most web finds kept on a device. Older ones are dropped first. */
const MAX_CACHED_FINDS = 2000

/**
 * Take the latest list from the server. Finds already on this device are kept even if the server
 * list no longer carries them, so an award the student saved never turns into an unknown id.
 * The server's copy wins for any id it still has. Invalid entries are dropped.
 */
export function registerDiscovered(items: readonly unknown[]): readonly AwardBase[] {
  const fresh = items.filter(isAwardBase)
  const freshIds = new Set(fresh.map((a) => a.id))
  discovered = [...fresh, ...discovered.filter((a) => !freshIds.has(a.id))].slice(0, MAX_CACHED_FINDS)
  merged = [...catalogAwards, ...discovered]
  byId = new Map(merged.map((a) => [a.id, a]))
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(discovered))
  } catch {
    /* ignore quota */
  }
  return discovered
}

/** Catalog plus verified web finds. The array identity changes only when the finds change. */
export function allAwards(): readonly AwardBase[] {
  return merged
}

/** The web finds alone. */
export function discoveredAwards(): readonly AwardBase[] {
  return discovered
}

/** Look one award up by id across the catalog and the web finds. */
export function findAward(id: string): AwardBase | undefined {
  return byId.get(id)
}

/** When an award entered the app, in epoch ms. Web finds carry the exact verification time. */
export function addedAtMs(award: AwardBase): number {
  if (award.foundAtMs) return award.foundAtMs
  const t = Date.parse(`${award.addedAt}T00:00:00Z`)
  return Number.isNaN(t) ? 0 : t
}
