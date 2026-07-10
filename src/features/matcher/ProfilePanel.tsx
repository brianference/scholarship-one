import type { Profile } from '../../lib/profile'
import { profileCompleteness } from '../../lib/profileCompleteness'
import {
  IDENTITY_OPTIONS,
  LEVEL_OPTIONS,
  MAJOR_OPTIONS,
  NEED_OPTIONS,
  STATE_OPTIONS,
} from '../../lib/profileOptions'

export type ProfilePanelProps = {
  profile: Profile
  onChange: (next: Profile) => void
}

/** Ranking inputs — school level, major, background, needs (local only). */
export function ProfilePanel({ profile, onChange }: ProfilePanelProps) {
  const complete = profileCompleteness(profile)

  return (
    <div className="card profile-strip">
      <h3 className="h2-tight">About you</h3>
      <p className="meta profile-hint">
        School level, field, background, and aid needs help rank scholarships. Saved only on this device.
      </p>
      <div className="profile-complete" aria-label={`Profile ${complete.percent}% complete`}>
        <div className="profile-complete__bar" aria-hidden="true">
          <span style={{ width: `${complete.percent}%` }} />
        </div>
        <p className="meta">
          {complete.percent}% filled in
          {complete.missing.length
            ? ` · add ${complete.missing.slice(0, 2).join(' and ')} to improve rankings`
            : ' · rankings will be more precise'}
        </p>
      </div>
      <div className="filters">
        <label className="field">
          <span>School level</span>
          <select
            value={profile.level}
            onChange={(event) => onChange({ ...profile, level: event.target.value })}
            aria-label="School level"
          >
            {LEVEL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Major or field</span>
          <select
            value={profile.major}
            onChange={(event) => onChange({ ...profile, major: event.target.value })}
            aria-label="Major or field"
          >
            {MAJOR_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Background</span>
          <select
            value={profile.identity}
            onChange={(event) => onChange({ ...profile, identity: event.target.value })}
            aria-label="Background"
          >
            {IDENTITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Aid needs</span>
          <select
            value={profile.need}
            onChange={(event) => onChange({ ...profile, need: event.target.value })}
            aria-label="Aid needs"
          >
            {NEED_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>State</span>
          <select
            value={profile.state}
            onChange={(event) => onChange({ ...profile, state: event.target.value })}
            aria-label="State"
          >
            {STATE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  )
}
