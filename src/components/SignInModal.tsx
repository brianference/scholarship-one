/** Create an account / sign in with an email magic link (no password). */
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useAccount } from '../state/account'

export function SignInModal({ onClose }: { onClose: () => void }) {
  const account = useAccount()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await account.requestLink(email.trim())
      setSent(true)
    } catch {
      setError('Could not send the link. Check the address and try again.')
    } finally {
      setBusy(false)
    }
  }

  return createPortal(
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="signin-title" onClick={onClose}>
      <div className="account-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="account-modal__close" aria-label="Close" onClick={onClose}>
          ×
        </button>
        {sent ? (
          <>
            <h2 id="signin-title">Check your email</h2>
            <p className="lede">
              We sent a one-click sign-in link to <strong>{email}</strong>. Open it on this device to sync your
              saved scholarships and turn on deadline reminders.
            </p>
            <p className="meta account-modal__spam">
              Don't see it in a minute? Check your <strong>spam / junk</strong> folder and mark it "not spam" so
              future reminders reach your inbox.
            </p>
            <div className="account-modal__actions">
              <button type="button" className="btn btn-primary" onClick={onClose}>
                Done
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={submit}>
            <h2 id="signin-title">Create your account</h2>
            <p className="lede">
              Enter your email — <strong>no password</strong>. We send a one-click link: if you're new it creates
              your account, if you're back it signs you in. Your saved awards, notes, and deadlines sync across
              devices, and you get email reminders before due dates.
            </p>
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                aria-label="Email address"
              />
            </label>
            {error ? (
              <p className="chat-error" role="alert">
                {error}
              </p>
            ) : null}
            <div className="account-modal__actions">
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                Not now
              </button>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? 'Sending…' : 'Email me a sign-in link'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body,
  )
}
