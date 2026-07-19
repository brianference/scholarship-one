/** Labelled form control with inline validation messaging wired for screen readers. */
import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'

const CONTROL =
  'w-full rounded-[var(--radius-sm)] border bg-[var(--bg-solid)] px-3 text-[var(--text)] ' +
  'placeholder:text-[var(--muted)] transition-colors duration-150 ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ' +
  'disabled:cursor-not-allowed disabled:opacity-60'

const borderFor = (invalid: boolean) =>
  invalid ? 'border-[var(--danger)]' : 'border-[var(--border-strong)] hover:border-[var(--accent)]/40'

type Shared = {
  label: string
  error?: string
  hint?: ReactNode
  /** Renders a "why we ask" style note under the control. */
  className?: string
}

type FieldProps = Shared & Omit<InputHTMLAttributes<HTMLInputElement>, 'className'>

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, error, hint, className = '', id, ...rest },
  ref,
) {
  const autoId = useId()
  const inputId = id || autoId
  const errorId = `${inputId}-error`
  const hintId = `${inputId}-hint`
  const invalid = !!error

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={inputId} className="text-[var(--font-size-sm)] font-semibold text-[var(--text)]">
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        className={`${CONTROL} ${borderFor(invalid)} h-[var(--control-h-lg)]`}
        aria-invalid={invalid || undefined}
        // Point at whichever descriptions actually exist, so nothing announces "undefined".
        aria-describedby={[error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined}
        {...rest}
      />
      {hint && !error && (
        <p id={hintId} className="text-[var(--font-size-xs)] text-[var(--muted)]">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-[var(--font-size-xs)] font-medium text-[var(--danger)]">
          {error}
        </p>
      )}
    </div>
  )
})

type TextAreaProps = Shared & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'>

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextAreaField(
  { label, error, hint, className = '', id, rows = 6, ...rest },
  ref,
) {
  const autoId = useId()
  const inputId = id || autoId
  const errorId = `${inputId}-error`
  const invalid = !!error

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={inputId} className="text-[var(--font-size-sm)] font-semibold text-[var(--text)]">
        {label}
      </label>
      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        className={`${CONTROL} ${borderFor(invalid)} resize-y py-2.5 leading-relaxed`}
        aria-invalid={invalid || undefined}
        aria-describedby={error ? errorId : undefined}
        {...rest}
      />
      {hint && !error && <p className="text-[var(--font-size-xs)] text-[var(--muted)]">{hint}</p>}
      {error && (
        <p id={errorId} role="alert" className="text-[var(--font-size-xs)] font-medium text-[var(--danger)]">
          {error}
        </p>
      )}
    </div>
  )
})
