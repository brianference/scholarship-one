/**
 * Shareable workspace pack — encodes shortlist + profile + apply map in a URL-safe payload.
 * No server required; optional paste into another browser/device.
 */
import type { Profile } from './profile'
import type { ApplyStatus } from './applyStatus'
import { DEFAULT_PROFILE } from './profile'

export type SharePackV1 = {
  v: 1
  at: number
  profile: Profile
  shortlist: string[]
  applyMap?: Record<string, ApplyStatus>
}

const PREFIX = 's1.'

// btoa/atob are global in browsers and in Node 18+ (the QA scripts run on Node 22),
// so no Node Buffer fallback is needed.
function toBase64Url(json: string): string {
  const b64 = btoa(unescape(encodeURIComponent(json)))
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(raw: string): string {
  const b64 = raw.replace(/-/g, '+').replace(/_/g, '/')
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4))
  return decodeURIComponent(escape(atob(b64 + pad)))
}

/** Build a compact share pack from workspace state. */
export function buildSharePack(input: {
  profile: Profile
  shortlist: string[]
  applyMap?: Record<string, ApplyStatus>
}): SharePackV1 {
  return {
    v: 1,
    at: Date.now(),
    profile: { ...DEFAULT_PROFILE, ...input.profile },
    shortlist: input.shortlist.slice(0, 80),
    applyMap: input.applyMap || {},
  }
}

/** Encode pack for URL query `?pack=` */
export function encodeSharePack(pack: SharePackV1): string {
  return PREFIX + toBase64Url(JSON.stringify(pack))
}

/** Decode pack from URL query value. */
export function decodeSharePack(raw: string): SharePackV1 | null {
  try {
    let s = raw.trim()
    if (s.startsWith(PREFIX)) s = s.slice(PREFIX.length)
    const json = fromBase64Url(s)
    const data = JSON.parse(json) as SharePackV1
    if (data.v !== 1 || !Array.isArray(data.shortlist)) return null
    return {
      v: 1,
      at: data.at || Date.now(),
      profile: { ...DEFAULT_PROFILE, ...data.profile },
      shortlist: data.shortlist.filter((id) => typeof id === 'string').slice(0, 80),
      applyMap: data.applyMap || {},
    }
  } catch {
    return null
  }
}

/** Full share URL for current origin. */
export function buildShareUrl(pack: SharePackV1, origin?: string): string {
  const base =
    origin ||
    (typeof window !== 'undefined' ? window.location.origin : 'https://scholarship-one.pages.dev')
  return `${base}/import?pack=${encodeURIComponent(encodeSharePack(pack))}`
}
