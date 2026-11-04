/** Search queries built on the server from a validated profile, so a client cannot inject its own. */
import { IDENTITY_OPTIONS, LEVEL_OPTIONS, MAJOR_OPTIONS, STATE_OPTIONS } from '../../../src/lib/profileOptions'

type ProfileLike = { major: string; state: string; level: string; identity: string; need: string }

const labelOf = (opts: readonly { value: string; label: string }[], value: string): string =>
  opts.find((o) => o.value === value)?.label ?? ''

/** Academic year phrase: before September it is this year to next, after it next year to the one after. */
export function yearSpan(now = new Date()): string {
  const y = now.getUTCMonth() >= 8 ? now.getUTCFullYear() + 1 : now.getUTCFullYear()
  return `${y}-${y + 1}`
}

/**
 * Two different searches for one profile (variant 0 = field of study, 1 = background and place).
 * A variant with nothing specific in the profile becomes a general query for the school level.
 */
export function profileQuery(profile: ProfileLike, variant: 0 | 1, now = new Date()): string {
  const level = labelOf(LEVEL_OPTIONS, profile.level) || 'college'
  const major = profile.major !== 'any' ? labelOf(MAJOR_OPTIONS, profile.major) : ''
  const identity = profile.identity !== 'any' ? labelOf(IDENTITY_OPTIONS, profile.identity) : ''
  const state = profile.state !== 'any' ? labelOf(STATE_OPTIONS, profile.state) : ''
  const specific = (variant === 0 ? [major] : [identity, state]).filter(Boolean)
  const subject = [level, ...specific].join(' ')
  return `${subject} scholarship application ${yearSpan(now)} apply official`.replace(/\s+/g, ' ').trim().slice(0, 200)
}
