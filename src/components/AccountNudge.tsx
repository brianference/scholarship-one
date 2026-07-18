/**
 * Prompt signed-out users to create an account once they've saved something, so
 * their list syncs and reminders turn on. Dismissible; hidden when accounts are off
 * or the user is signed in.
 */
import { useState } from 'react'
import { useAccount } from '../state/account'
import { useScholarship } from '../state/ScholarshipContext'
import { SignInModal } from './SignInModal'

export function AccountNudge() {
  const account = useAccount()
  const s = useScholarship()
  const [dismissed, setDismissed] = useState(false)
  const [modal, setModal] = useState(false)

  const show = account.enabled && account.status === 'signed-out' && s.shortlist.length > 0 && !dismissed
  if (!show) return null

  const n = s.shortlist.length
  return (
    <>
      <div className="account-nudge" role="region" aria-label="Create an account">
        <p>
          You've saved <strong>{n}</strong> scholarship{n === 1 ? '' : 's'} on this device. Create a free account
          to sync them across devices and get email reminders before deadlines.
        </p>
        <div className="account-nudge__actions">
          <button type="button" className="btn btn-primary" onClick={() => setModal(true)}>
            Create account
          </button>
          <button
            type="button"
            className="account-nudge__dismiss"
            aria-label="Dismiss"
            onClick={() => setDismissed(true)}
          >
            ×
          </button>
        </div>
      </div>
      {modal ? <SignInModal onClose={() => setModal(false)} /> : null}
    </>
  )
}
