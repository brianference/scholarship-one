/** Password input with a show/hide toggle and an optional strength read-out. */
import { useId, useState, type InputHTMLAttributes } from 'react'

/** Mirrors the server's Zod rule, so the client never fails a check the API would pass. */
export const MIN_PASSWORD_LENGTH = 12

/** Returns a message when the password is unusable, or null when it is fine. */
export function passwordProblem(password: string): string | null {
  if (!password) return 'Choose a password.'
  if (password.length < MIN_PASSWORD_LENGTH) return `Use at least ${MIN_PASSWORD_LENGTH} characters.`
  if (password.length > 200) return 'That password is too long.'
  return null
}

type Strength = { score: 0 | 1 | 2 | 3; label: string; className: string }

/**
 * Length-weighted strength estimate, matching the NIST-style rule the API uses:
 * a long passphrase beats a short string with a symbol bolted on.
 */
export function estimateStrength(password: string): Strength {
  if (password.length < MIN_PASSWORD_LENGTH) return { score: 0, label: 'Too short', className: 'bg-[var(--danger)]' }
  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length
  if (password.length >= 20 || (password.length >= 16 && variety >= 3)) {
    return { score: 3, label: 'Strong', className: 'bg-emerald-600' }
  }
  if (password.length >= 14 || variety >= 3) return { score: 2, label: 'Good', className: 'bg-[var(--accent-2)]' }
  return { score: 1, label: 'Fair', className: 'bg-[var(--accent)]' }
}

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'className'> & {
  label: string
  error?: string
  showStrength?: boolean
}

export function PasswordField({ label, error, showStrength = false, id, value, ...rest }: Props) {
  const autoId = useId()
  const inputId = id || autoId
  const errorId = `${inputId}-error`
  const [visible, setVisible] = useState(false)
  const text = String(value ?? '')
  const strength = estimateStrength(text)

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-[var(--font-size-sm)] font-semibold text-[var(--text)]">
        {label}
      </label>

      <div className="relative">
        <input
          id={inputId}
          type={visible ? 'text' : 'password'}
          value={value}
          className={`h-[var(--control-h-lg)] w-full rounded-[var(--radius-sm)] border bg-[var(--bg-solid)] pl-3 pr-11 text-[var(--text)] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
            error ? 'border-[var(--danger)]' : 'border-[var(--border-strong)] hover:border-[var(--accent)]/40'
          }`}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? errorId : undefined}
          required
          {...rest}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          // The label carries the action; aria-pressed carries the state.
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-[var(--radius-sm)] text-[var(--muted)] transition-colors hover:text-[var(--text)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--accent)]"
        >
          <svg viewBox="0 0 24 24" className="size-4.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            {visible ? (
              <>
                <path d="M3 3l18 18" strokeLinecap="round" />
                <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                <path d="M9.4 5.2A9.5 9.5 0 0 1 12 4.9c4.6 0 8.3 3.6 9.4 7.1a12 12 0 0 1-2.4 3.9M6.2 6.8A12 12 0 0 0 2.6 12c1.1 3.5 4.8 7.1 9.4 7.1a9.7 9.7 0 0 0 3.4-.6" />
              </>
            ) : (
              <>
                <path d="M2.6 12C3.7 8.5 7.4 4.9 12 4.9s8.3 3.6 9.4 7.1c-1.1 3.5-4.8 7.1-9.4 7.1S3.7 15.5 2.6 12Z" />
                <circle cx="12" cy="12" r="2.6" />
              </>
            )}
          </svg>
        </button>
      </div>

      {showStrength && text.length > 0 && !error && (
        <div className="flex items-center gap-2">
          <div className="flex h-1 flex-1 gap-1" aria-hidden="true">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`h-full flex-1 rounded-full transition-colors ${
                  strength.score >= step ? strength.className : 'bg-[var(--border-strong)]'
                }`}
              />
            ))}
          </div>
          <span className="text-[var(--font-size-xs)] font-medium text-[var(--muted)]">{strength.label}</span>
        </div>
      )}

      {showStrength && !error && (
        <p className="m-0 text-[var(--font-size-xs)] text-[var(--muted)]">
          At least {MIN_PASSWORD_LENGTH} characters. A few unrelated words beats a short, cryptic one.
        </p>
      )}

      {error && (
        <p id={errorId} role="alert" className="text-[var(--font-size-xs)] font-medium text-[var(--danger)]">
          {error}
        </p>
      )}
    </div>
  )
}
