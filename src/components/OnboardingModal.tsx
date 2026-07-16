import { useState } from 'react'
import type { Profile } from '../lib/profile'
import { LEVEL_OPTIONS, MAJOR_OPTIONS, STATE_OPTIONS, IDENTITY_OPTIONS } from '../lib/profileOptions'
import { completeOnboarding, skipOnboarding } from '../lib/onboarding'
import { track } from '../lib/analytics'

export type OnboardingModalProps = {
  profile: Profile
  onComplete: (profile: Profile) => void
  onSkip: () => void
}

/**
 * ~60 second first-run: level → state → focus → done (profile filled, ready to match).
 */
export function OnboardingModal({ profile, onComplete, onSkip }: OnboardingModalProps) {
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<Profile>({ ...profile })

  const steps = ['School level', 'Your state', 'What matters most']

  function finish() {
    completeOnboarding()
    track({ type: 'onboarding_complete', at: Date.now() })
    onComplete(draft)
  }

  function handleSkip() {
    skipOnboarding()
    onSkip()
  }

  return (
    <div className="onboard-overlay" role="dialog" aria-modal="true" aria-labelledby="onboard-title">
      <div className="onboard-modal card">
        <p className="kicker">About 60 seconds</p>
        <h2 id="onboard-title">Let’s find scholarships that fit</h2>
        <p className="lede">
          Step {step + 1} of 3 — {steps[step]}. You can change this anytime in About you.
        </p>
        <div className="onboard-progress" aria-hidden="true">
          <span style={{ width: `${((step + 1) / 3) * 100}%` }} />
        </div>

        {step === 0 ? (
          <label className="field">
            <span>School level</span>
            <select
              value={draft.level}
              onChange={(e) => setDraft({ ...draft, level: e.target.value })}
              autoFocus
            >
              {LEVEL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {step === 1 ? (
          <label className="field">
            <span>State (for regional awards)</span>
            <select value={draft.state} onChange={(e) => setDraft({ ...draft, state: e.target.value })} autoFocus>
              {STATE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {step === 2 ? (
          <div className="onboard-grid">
            <label className="field">
              <span>Major or field</span>
              <select value={draft.major} onChange={(e) => setDraft({ ...draft, major: e.target.value })}>
                {MAJOR_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Background (optional)</span>
              <select value={draft.identity} onChange={(e) => setDraft({ ...draft, identity: e.target.value })}>
                {IDENTITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}

        <div className="onboard-actions">
          <button type="button" className="btn btn-ghost" onClick={handleSkip}>
            Skip for now
          </button>
          {step > 0 ? (
            <button type="button" className="btn btn-ghost" onClick={() => setStep((s) => s - 1)}>
              Back
            </button>
          ) : null}
          {step < 2 ? (
            <button type="button" className="btn btn-primary" onClick={() => setStep((s) => s + 1)}>
              Continue
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={finish}>
              Show Matches
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
