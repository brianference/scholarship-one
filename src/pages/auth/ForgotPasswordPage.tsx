/** /forgot-password — request a reset email. */
import { useState, type FormEvent } from 'react'
import { AuthLink, AuthShell } from './AuthShell'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { requestPasswordReset, ApiError } from '../../lib/accountApi'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!email.trim()) {
      setError('Enter your email address.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await requestPasswordReset(email.trim())
      setSent(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  // The server answers identically for known and unknown addresses, so this
  // confirmation is deliberately worded not to reveal whether an account exists.
  if (sent) {
    return (
      <AuthShell path="/forgot-password" title="Check your email" footer={<AuthLink to="/login">Back to sign in</AuthLink>}>
        <Alert tone="success">
          If an account exists for <strong>{email.trim()}</strong>, a reset link is on its way. It works once and expires
          in an hour.
        </Alert>
        <p className="mt-4 mb-0 text-[length:var(--font-size-sm)] leading-relaxed text-[var(--muted)]">
          Nothing arriving? Check your spam folder, then try again in a few minutes.
        </p>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      path="/forgot-password"
      title="Reset your password"
      subtitle="Give us the email on your account and we'll send a link to set a new password."
      footer={<AuthLink to="/login">Back to sign in</AuthLink>}
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {error && <Alert tone="error">{error}</Alert>}
        <Field
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Button type="submit" size="lg" loading={busy} className="w-full">
          {busy ? 'Sending' : 'Send reset link'}
        </Button>
      </form>
    </AuthShell>
  )
}
