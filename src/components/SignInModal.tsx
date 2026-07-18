/** Email sign-in (magic link). Enter email → we send a one-click link. */
import { useState } from 'react'
import { useAccount } from '../state/account'

export function SignInModal({ onClose }: { onClose: () => void }) {
  const account = useAccount()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [devLink, setDevLink] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const r = await account.requestLink(email.trim())
      setSent(true)
      setDevLink(r.devLink || null)
    } catch {
      setError('Could not send the link. Check the address and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="onboard-overlay" role="dialog" aria-modal="true" aria-labelledby="signin-title" onClick={onClose}>
      <div className="onboard-modal card" onClick={(e) => e.stopPropagation()}>
        <h2 id="signin-title">Save to your account</h2>
        {sent ? (
          <>
            <p className="lede">
              Check <strong>{email}</strong> for a sign-in link. Open it on this device to sync your saved
              scholarships and turn on deadline reminders.
            </p>
            {devLink ? (
              <p className="meta">
                Dev link: <a href={devLink}>{devLink}</a>
              </p>
            ) : null}
            <div className="onboard-actions">
              <button type="button" className="btn btn-primary" onClick={onClose}>
                Done
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={submit}>
            <p className="lede">
              Sign in with your email — no password. We send a one-click link. Your saved awards, notes, and
              deadlines follow you across devices, and you can get email reminders before due dates.
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
            <div className="onboard-actions">
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                Not now
              </button>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? 'Sending…' : 'Send sign-in link'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
