/** /register — create a password account. */
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthLink, AuthShell } from './AuthShell'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { PasswordField, passwordProblem } from './PasswordField'
import { useAccount } from '../../state/account'
import { ApiError } from '../../lib/accountApi'
import { useToast } from '../../components/ui/Toast'

export default function RegisterPage() {
  const { register } = useAccount()
  const navigate = useNavigate()
  const { notify } = useToast()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setFormError('')

    // Check locally first so an obviously bad form never costs a round trip.
    const local: Record<string, string> = {}
    if (!email.trim()) local.email = 'Enter your email address.'
    const pwProblem = passwordProblem(password)
    if (pwProblem) local.password = pwProblem
    if (password !== confirm) local.confirm = 'Both passwords need to match.'
    setErrors(local)
    if (Object.keys(local).length) return

    setBusy(true)
    try {
      await register(email.trim(), password)
      notify('Account created. Your saved scholarships will sync from now on.', 'success')
      navigate('/matches', { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fields)
        // Only show a banner when nothing was attached to a specific field,
        // otherwise the same sentence appears twice on screen.
        if (!Object.keys(err.fields).length) setFormError(err.message)
      } else {
        setFormError('Something went wrong. Try again.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      path="/register"
      title="Create your account"
      subtitle="Save scholarships, track your applications, and get deadline reminders before they pass."
      footer={<>Already have an account? <AuthLink to="/login">Sign in</AuthLink></>}
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {formError && <Alert tone="error">{formError}</Alert>}

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

        <PasswordField
          label="Password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          showStrength
        />

        <PasswordField
          label="Confirm password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={errors.confirm}
        />

        <Button type="submit" size="lg" loading={busy} className="mt-1 w-full">
          {busy ? 'Creating account' : 'Create account'}
        </Button>

        <p className="m-0 text-center text-[var(--font-size-xs)] leading-relaxed text-[var(--muted)]">
          By creating an account you agree to our{' '}
          <AuthLink to="/terms" inline>
            Terms
          </AuthLink>{' '}
          and{' '}
          <AuthLink to="/privacy" inline>
            Privacy Policy
          </AuthLink>
          . You must be at least 13 years old.
        </p>
      </form>
    </AuthShell>
  )
}
