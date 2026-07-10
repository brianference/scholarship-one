import { useState } from 'react'
import { loadDigestPrefs, saveDigestPrefs, type DigestPrefs } from '../lib/digestPrefs'
import { track } from '../lib/analytics'

export type DigestEmailItem = {
  name: string
  deadline: string
  amount: string
  url: string
  daysLeft: number | null
}

export type EmailDigestOptInProps = {
  weekLabel: string
  items: DigestEmailItem[]
}

/**
 * Opt in for email digests + send this week's list (Resend when configured).
 */
export function EmailDigestOptIn({ weekLabel, items }: EmailDigestOptInProps) {
  const [prefs, setPrefs] = useState<DigestPrefs>(loadDigestPrefs)
  const [email, setEmail] = useState(prefs.email)
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function persist(next: DigestPrefs) {
    setPrefs(next)
    saveDigestPrefs(next)
  }

  async function sendDigest() {
    const trimmed = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setStatus('Enter a valid email')
      return
    }
    setBusy(true)
    setStatus(null)
    try {
      const res = await fetch('/api/digest-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, weekLabel, items }),
      })
      const body = (await res.json()) as { ok?: boolean; configured?: boolean; error?: string }
      if (!res.ok || body.error) {
        if (body.configured === false) {
          setStatus(body.error || 'Server email not configured — use Copy digest or mailto instead')
        } else {
          setStatus(body.error || 'Could not send email')
        }
        return
      }
      persist({
        email: trimmed,
        optedIn: true,
        lastSentAt: Date.now(),
        remindInApp: prefs.remindInApp,
      })
      track({ type: 'digest_email', at: Date.now() })
      setStatus('Digest emailed')
    } catch {
      setStatus('Network error — try again or use Copy digest')
    } finally {
      setBusy(false)
      window.setTimeout(() => setStatus(null), 4000)
    }
  }

  return (
    <div className="email-digest">
      <h3 className="h2-tight">Email this week’s digest</h3>
      <p className="meta">
        We send the deadlines below to your inbox when email is configured. Your address stays on this device until you
        send.
      </p>
      <div className="email-digest__row">
        <label className="field email-digest__field">
          <span className="sr-only">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            aria-label="Email for deadline digest"
          />
        </label>
        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void sendDigest()}>
          {busy ? 'Sending…' : 'Email digest'}
        </button>
      </div>
      <label className="check-inline">
        <input
          type="checkbox"
          checked={prefs.optedIn}
          onChange={(e) =>
            persist({
              ...prefs,
              email: email.trim().toLowerCase(),
              optedIn: e.target.checked,
            })
          }
        />
        Remind me in the app about weekly digests
      </label>
      {status ? (
        <p className="export-bar__note" role="status">
          {status}
        </p>
      ) : null}
    </div>
  )
}
