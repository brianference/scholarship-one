/** Button and link-button sharing one visual scale. Tailwind-only, no legacy CSS. */
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'md' | 'lg'

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] font-semibold ' +
  'transition-[background-color,box-shadow,transform] duration-150 select-none ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ' +
  'disabled:cursor-not-allowed disabled:opacity-60 active:not-disabled:translate-y-px'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-[var(--accent)] text-white hover:not-disabled:brightness-110 shadow-[0_2px_8px_rgba(196,92,38,0.28)]',
  secondary:
    'bg-[var(--bg-solid)] text-[var(--text)] border border-[var(--border-strong)] hover:not-disabled:bg-[var(--accent-soft)]',
  ghost: 'bg-transparent text-[var(--muted)] hover:not-disabled:text-[var(--text)] hover:not-disabled:bg-[var(--accent-soft)]',
  danger: 'bg-[var(--danger)] text-white hover:not-disabled:brightness-110',
}

/** Sizes map to --control-h / --control-h-lg so these line up with legacy controls. */
const SIZES: Record<Size, string> = {
  md: 'h-[var(--control-h)] px-4 text-[var(--font-size-sm)]',
  lg: 'h-[var(--control-h-lg)] px-5 text-[var(--font-size)]',
}

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', extra = ''): string {
  return [BASE, VARIANTS[variant], SIZES[size], extra].filter(Boolean).join(' ')
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  /** Shows a spinner and blocks input. The label stays put so width never jumps. */
  loading?: boolean
  children: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, disabled, className = '', children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={buttonClass(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <Spinner />}
      {children}
    </button>
  )
})

/** Router link styled as a button. */
export function ButtonLink({
  to,
  variant = 'primary',
  size = 'md',
  className = '',
  children,
}: {
  to: string
  variant?: Variant
  size?: Size
  className?: string
  children: ReactNode
}) {
  return (
    <Link to={to} className={buttonClass(variant, size, `no-underline ${className}`)}>
      {children}
    </Link>
  )
}

function Spinner() {
  return (
    <svg className="size-4 animate-spin" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
      <path d="M14.5 8A6.5 6.5 0 0 0 8 1.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}
