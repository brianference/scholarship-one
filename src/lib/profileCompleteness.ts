import type { Profile } from './profile'

export type Completeness = {
  percent: number
  filled: number
  total: number
  missing: string[]
}

/** Simple on-device profile completeness for better ranking. */
export function profileCompleteness(profile: Profile): Completeness {
  const checks: { ok: boolean; label: string }[] = [
    { ok: profile.major !== 'any', label: 'Major' },
    { ok: Boolean(profile.level), label: 'School level' },
    { ok: profile.identity !== 'any', label: 'Background' },
    { ok: profile.need !== 'any', label: 'Aid needs' },
    { ok: profile.state !== 'any', label: 'State' },
  ]
  const filled = checks.filter((c) => c.ok).length
  const total = checks.length
  return {
    percent: Math.round((filled / total) * 100),
    filled,
    total,
    missing: checks.filter((c) => !c.ok).map((c) => c.label),
  }
}
