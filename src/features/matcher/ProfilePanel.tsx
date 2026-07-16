import { useEffect, useState } from 'react'
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
  /** Called when the user saves / applies the draft profile. */
  onChange: (next: Profile) => void
  /** Optional: also run a ranked search + suggestions from this profile. */
  onApply?: (next: Profile) => void
}

/**
 * Ranking inputs — draft until the user hits Save & rank (or Rank scholarships).
 */
export function ProfilePanel({ profile, onChange, onApply }: ProfilePanelProps) {
  const [draft, setDraft] = useState<Profile>(profile)
  const [savedNote, setSavedNote] = useState<string | null>(null)
  const complete = profileCompleteness(draft)
  const dirty =
    draft.level !== profile.level ||
    draft.major !== profile.major ||
    draft.identity !== profile.identity ||
    draft.need !== profile.need ||
    draft.state !== profile.state

  // Sync draft when parent profile changes from elsewhere (onboarding, chat, restore)
  useEffect(() => {
    setDraft(profile)
  }, [profile])

  function apply(andSearch: boolean) {
    onChange(draft)
    if (andSearch) onApply?.(draft)
    setSavedNote(andSearch ? 'Rankings updated — best fits are listed below' : 'Profile saved on this device')
    window.setTimeout(() => setSavedNote(null), 2500)
  }

  return (
    <div className="card profile-strip">
      <h3 className="h2-tight">About you</h3>
      <p className="meta profile-hint">
        Choose your school level, field, background, and state, then save to re-rank scholarships. Saved only on this
        device.
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
          {dirty ? ' · unsaved changes' : ''}
        </p>
      </div>
      <div className="filters">
        <label className="field">
          <span>School level</span>
          <select
            value={draft.level}
            onChange={(event) => setDraft({ ...draft, level: event.target.value })}
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
            value={draft.major}
            onChange={(event) => setDraft({ ...draft, major: event.target.value })}
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
            value={draft.identity}
            onChange={(event) => setDraft({ ...draft, identity: event.target.value })}
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
            value={draft.need}
            onChange={(event) => setDraft({ ...draft, need: event.target.value })}
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
            value={draft.state}
            onChange={(event) => setDraft({ ...draft, state: event.target.value })}
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

      <div className="profile-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => apply(true)}
          disabled={!dirty && !onApply}
        >
          Save &amp; rank scholarships
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => apply(false)} disabled={!dirty}>
          Save profile only
        </button>
        {dirty ? (
          <button type="button" className="btn btn-ghost" onClick={() => setDraft(profile)}>
            Reset
          </button>
        ) : null}
        {savedNote ? (
          <span className="export-bar__note" role="status">
            {savedNote}
          </span>
        ) : null}
      </div>
    </div>
  )
}
