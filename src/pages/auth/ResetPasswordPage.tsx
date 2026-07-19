/** /reset?token=… — set a new password from an emailed link. */
import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AuthLink, AuthShell } from './AuthShell'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { PasswordField, passwordProblem } from './PasswordField'
import { useAccount } from '../../state/account'
import { ApiError } from '../../lib/accountApi'
import { useToast } from '../../components/ui/Toast'

export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const { completeReset } = useAccount()
  const navigate = useNavigate()
  const { notify } = useToast()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

  // A visitor who lands here without a token followed a broken or truncated link.
  if (!token) {
    return (
      <AuthShell title="This link is incomplete" footer={<AuthLink to="/forgot-password">Request a new link</AuthLink>}>
        <Alert tone="error">
          The reset link is missing its token. Email clients sometimes split long links across lines — request a fresh
          one and open it in a single click.
        </Alert>
      </AuthShell>
    )
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setFormError('')
    const local: Record<string, string> = {}
    const problem = passwordProblem(password)
    if (problem) local.password = problem
    if (password !== confirm) local.confirm = 'Both passwords need to match.'
    setErrors(local)
    if (Object.keys(local).length) return

    setBusy(true)
    try {
      await completeReset(token, password)
      notify('Password updated. You are signed in.', 'success')
      navigate('/matches', { replace: true })
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

  return (
    <AuthShell
      title="Choose a new password"
      subtitle="Setting a new password signs out every other device on this account."
      footer={<AuthLink to="/login">Back to sign in</AuthLink>}
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {formError && <Alert tone="error">{formError}</Alert>}
        <PasswordField
          label="New password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          showStrength
        />
        <PasswordField
          label="Confirm new password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={errors.confirm}
        />
        <Button type="submit" size="lg" loading={busy} className="w-full">
          {busy ? 'Updating' : 'Update password'}
        </Button>
      </form>
    </AuthShell>
  )
}
