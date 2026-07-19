/** /login — password sign-in, with magic link as a fallback. */
import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AuthLink, AuthShell } from './AuthShell'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { PasswordField } from './PasswordField'
import { useAccount } from '../../state/account'
import { ApiError } from '../../lib/accountApi'
import { useToast } from '../../components/ui/Toast'

export default function LoginPage() {
  const { login, requestLink } = useAccount()
  const navigate = useNavigate()
  const location = useLocation()
  const { notify } = useToast()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [linkSent, setLinkSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [linkBusy, setLinkBusy] = useState(false)

  // Return the visitor wherever they were headed before the redirect to /login.
  const returnTo = (location.state as { from?: string } | null)?.from || '/matches'

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setFormError('')
    const local: Record<string, string> = {}
    if (!email.trim()) local.email = 'Enter your email address.'
    if (!password) local.password = 'Enter your password.'
    setErrors(local)
    if (Object.keys(local).length) return

    setBusy(true)
    try {
      await login(email.trim(), password)
      notify('Signed in.', 'success')
      navigate(returnTo, { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fields)
        if (!Object.keys(err.fields).length) setFormError(err.message)
      } else {
        setFormError('Something went wrong. Try again.')
      }
    } finally {
      setBusy(false)
    }
  }

  async function onSendLink() {
    if (!email.trim()) {
      setErrors({ email: 'Enter your email first, then we can send the link.' })
      return
    }
    setLinkBusy(true)
    setFormError('')
    try {
      await requestLink(email.trim())
      setLinkSent(true)
    } catch {
      setFormError('Could not send the link right now. Try again in a moment.')
    } finally {
      setLinkBusy(false)
    }
  }

  return (
    <AuthShell
      path="/login"
      title="Welcome back"
      subtitle="Sign in to reach your saved scholarships and application tracker."
      footer={<>New here? <AuthLink to="/register">Create an account</AuthLink></>}
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {formError && <Alert tone="error">{formError}</Alert>}
        {linkSent && (
          <Alert tone="success">
            Check your inbox — we sent a sign-in link to <strong>{email.trim()}</strong>. It works once and expires in 15
            minutes.
          </Alert>
        )}

        <Field
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          required
        />

        <div className="flex flex-col gap-1.5">
          <PasswordField
            label="Password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />
          <div className="text-right">
            <AuthLink to="/forgot-password">Forgot password?</AuthLink>
          </div>
        </div>

        <Button type="submit" size="lg" loading={busy} className="w-full">
          {busy ? 'Signing in' : 'Sign in'}
        </Button>

        <div className="flex items-center gap-3 text-[var(--font-size-xs)] text-[var(--muted)]">
          <span className="h-px flex-1 bg-[var(--border-strong)]" />
          or
          <span className="h-px flex-1 bg-[var(--border-strong)]" />
        </div>

        <Button type="button" variant="secondary" size="lg" onClick={onSendLink} loading={linkBusy} className="w-full">
          Email me a sign-in link
        </Button>
      </form>
    </AuthShell>
  )
}
