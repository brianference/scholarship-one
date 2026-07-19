/** Centred card layout shared by every auth screen. */
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <main id="main" className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-10 sm:py-16">
      <div className="text-center">
        <Link
          to="/"
          className="inline-flex items-center gap-2 no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        >
          <span className="text-2xl" aria-hidden="true">
            🎓
          </span>
          <span className="text-lg font-extrabold tracking-tight text-[var(--text)]">Scholarship One</span>
        </Link>
      </div>

      <div className="surface p-6 sm:p-7">
        <h1 className="m-0 text-xl font-extrabold tracking-tight text-[var(--text)]">{title}</h1>
        {subtitle && <p className="mt-1.5 mb-0 text-[var(--font-size-sm)] leading-relaxed text-[var(--muted)]">{subtitle}</p>}
        <div className="mt-5">{children}</div>
      </div>

      {footer && <div className="text-center text-[var(--font-size-sm)] text-[var(--muted)]">{footer}</div>}
    </main>
  )
}

/**
 * Text link matching the auth screens' tone.
 *
 * Vertical padding is not decoration: at the bare line height these render 19px
 * tall, under the 24px WCAG 2.2 target-size floor and awkward to hit with a
 * thumb. Links sitting inside a sentence are exempt from that rule and pass
 * `inline` so they do not disturb the surrounding line box.
 */
export function AuthLink({ to, inline = false, children }: { to: string; inline?: boolean; children: ReactNode }) {
  const base =
    'font-semibold text-[var(--accent)] underline-offset-2 hover:underline ' +
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] rounded-sm'
  return (
    <Link to={to} className={inline ? base : `${base} inline-flex min-h-[28px] items-center px-1 py-1`}>
      {children}
    </Link>
  )
}
