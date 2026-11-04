/**
 * Two one-tap actions under each match row: "Remind me" (pick a day, emailed that
 * morning when signed in) and "Not interested" (hide it from Matches and Results).
 * The reminder picker opens inline rather than as a popover because the match list
 * clips overflow.
 */
import { useId, useState } from 'react'
import { useAccount } from '../../state/account'
import { SignInModal } from '../../components/SignInModal'
import { dayString, formatRemindOn, isReminderDue, remindPresets } from '../../lib/reminders'

type RowActionsProps = {
  name: string
  deadline: string
  /** Current reminder day (YYYY-MM-DD) or '' when none. */
  remindOn: string
  onSetReminder: (date: string | null) => void
  onHide: () => void
}

export function RowActions({ name, deadline, remindOn, onSetReminder, onHide }: RowActionsProps) {
  const account = useAccount()
  const panelId = useId()
  const [open, setOpen] = useState(false)
  const [signIn, setSignIn] = useState(false)
  const presets = remindPresets(deadline)
  const due = remindOn !== '' && isReminderDue(remindOn)

  function choose(date: string | null) {
    onSetReminder(date)
    setOpen(false)
  }

  return (
    <div className="row-actions">
      <div className="row-actions__bar">
        <button
          type="button"
          className={`row-action${remindOn ? ' is-on' : ''}${due ? ' is-due' : ''}`}
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={
            remindOn ? `Reminder for ${name}: ${formatRemindOn(remindOn)}. Change` : `Remind me to apply to ${name}`
          }
          onClick={() => setOpen((v) => !v)}
        >
          <span aria-hidden="true">{remindOn ? '🔔' : '⏰'}</span>
          {remindOn ? `Remind ${formatRemindOn(remindOn)}` : 'Remind me'}
        </button>
        <button
          type="button"
          className="row-action row-action--quiet"
          aria-label={`Not interested in ${name}. Hide it`}
          onClick={onHide}
        >
          <span aria-hidden="true">✕</span>
          Not interested
        </button>
      </div>

      {open ? (
        <div id={panelId} className="row-actions__panel" role="group" aria-label={`Remind me to apply to ${name}`}>
          <div className="row-actions__chips">
            {presets.map((p) => (
              <button
                key={p.key}
                type="button"
                className={`chip-btn${remindOn === p.date ? ' is-on' : ''}`}
                onClick={() => choose(p.date)}
              >
                {p.label}
                <span className="chip-btn__sub">{formatRemindOn(p.date)}</span>
              </button>
            ))}
          </div>
          <label className="row-actions__date">
            <span>Pick a date</span>
            <input
              type="date"
              min={dayString(0)}
              value={remindOn}
              onChange={(e) => {
                if (e.target.value) choose(e.target.value)
              }}
            />
          </label>
          {remindOn ? (
            <button type="button" className="row-actions__clear" onClick={() => choose(null)}>
              Clear reminder
            </button>
          ) : null}
          {account.status === 'signed-in' ? (
            <p className="meta row-actions__note">We email you that morning. This also saves it to your list.</p>
          ) : account.enabled ? (
            <p className="meta row-actions__note">
              This saves it to your list.{' '}
              <button type="button" className="row-actions__link" onClick={() => setSignIn(true)}>
                Sign in
              </button>{' '}
              to get the reminder by email.
            </p>
          ) : (
            <p className="meta row-actions__note">This saves it to your list and shows the date on this device.</p>
          )}
        </div>
      ) : null}
      {signIn ? <SignInModal onClose={() => setSignIn(false)} /> : null}
    </div>
  )
}
