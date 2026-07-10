import type { Profile } from '../../lib/profile'

export type ProfilePanelProps = {
  profile: Profile
  onChange: (next: Profile) => void
}

/** Ranking inputs — isolated for easy option edits. */
export function ProfilePanel({ profile, onChange }: ProfilePanelProps) {
  return (
    <div className="card profile-strip">
      <h2 className="h2-tight">Your profile</h2>
      <div className="filters">
        <label className="field">
          <span>Major / focus</span>
          <select
            value={profile.major}
            onChange={(event) => onChange({ ...profile, major: event.target.value })}
            aria-label="Major"
          >
            <option value="accounting">Accounting</option>
            <option value="business">Business</option>
            <option value="engineering">Engineering</option>
            <option value="any">Any / undecided</option>
          </select>
        </label>
        <label className="field">
          <span>Level</span>
          <select
            value={profile.level}
            onChange={(event) => onChange({ ...profile, level: event.target.value })}
            aria-label="Level"
          >
            <option value="high-school">High school</option>
            <option value="undergrad">Undergrad</option>
            <option value="grad">Grad</option>
          </select>
        </label>
        <label className="field">
          <span>State focus</span>
          <select
            value={profile.state}
            onChange={(event) => onChange({ ...profile, state: event.target.value })}
            aria-label="State"
          >
            <option value="any">Any</option>
            <option value="arizona">Arizona</option>
            <option value="california">California</option>
            <option value="texas">Texas</option>
          </select>
        </label>
      </div>
    </div>
  )
}
