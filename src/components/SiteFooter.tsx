/**
 * Site footer: four link columns collapsing to one on phones.
 *
 * Extra bottom padding clears the fixed mobile tab bar and the iOS home
 * indicator — without it the last row of links sits underneath the tab bar and
 * cannot be tapped.
 */
import { Link } from 'react-router-dom'
import { BrandLogo } from './BrandLogo'
import type { SiteConfig } from '../config/site'

type Column = { heading: string; links: { label: string; to?: string; href?: string }[] }

const COLUMNS: Column[] = [
  {
    heading: 'Find scholarships',
    links: [
      { label: 'My matches', to: '/matches' },
      { label: 'Browse catalog', to: '/results' },
      { label: 'Deadlines', to: '/digest' },
      { label: 'Application tracker', to: '/tracker' },
    ],
  },
  {
    heading: 'Your account',
    links: [
      { label: 'Create an account', to: '/register' },
      { label: 'Sign in', to: '/login' },
      { label: 'Reset password', to: '/forgot-password' },
      { label: 'Your path', to: '/path' },
    ],
  },
  {
    heading: 'About',
    links: [
      { label: 'About us', to: '/about' },
      { label: 'Contact us', to: '/contact' },
      { label: 'Source on GitHub', href: 'https://github.com/brianference/scholarship-one' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy Policy', to: '/privacy' },
      { label: 'Terms and Conditions', to: '/terms' },
    ],
  },
]

const LINK_CLASS =
  'inline-flex min-h-[28px] items-center rounded-sm text-[length:var(--font-size-sm)] text-[var(--muted)] ' +
  'transition-colors hover:text-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 ' +
  'focus-visible:outline-[var(--accent)]'

export function SiteFooter({ config }: { config: SiteConfig }) {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-16 border-t border-[var(--border-strong)] bg-[var(--bg-solid)]/40">
      {/* Container query, not a viewport breakpoint: the AI chat dock takes up to
          400px on the right, so the footer's real width is far smaller than the
          window. A `lg:` rule would fire at 1024px of *window* and cram five
          columns into ~790px of actual space. */}
      <div className="@container mx-auto w-full max-w-[1100px] px-4 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] pt-10 sm:pb-12">
        <div className="grid gap-8 @xl:grid-cols-2 @4xl:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div className="flex flex-col gap-3">
            <Link
              to="/"
              className="w-fit rounded-sm no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            >
              <BrandLogo />
            </Link>
            <p className="m-0 max-w-xs text-[length:var(--font-size-sm)] leading-relaxed text-[var(--muted)]">
              Real scholarships with official links. No sponsored listings, no selling your details, free to use.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.heading} aria-label={column.heading} className="flex flex-col gap-2">
              <h2 className="m-0 text-[length:var(--font-size-sm)] font-bold tracking-tight text-[var(--text)]">
                {column.heading}
              </h2>
              <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
                {column.links.map((link) => (
                  <li key={link.label}>
                    {link.to ? (
                      <Link to={link.to} className={LINK_CLASS}>
                        {link.label}
                      </Link>
                    ) : (
                      <a href={link.href} target="_blank" rel="noreferrer noopener" className={LINK_CLASS}>
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-[var(--border-strong)] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="m-0 text-[length:var(--font-size-xs)] text-[var(--muted)]">
            © {year} Scholarship One. Built with TypeScript, React, Vite, and Cloudflare Pages.
          </p>
          <p className="m-0 text-[length:var(--font-size-xs)] text-[var(--muted)]">
            {config.finePrint || 'Every award links to an official page. We do not invent scholarships.'}
          </p>
        </div>

        <p className="mt-4 mb-0 text-[length:var(--font-size-xs)] leading-relaxed text-[var(--muted)]/80">
          Scholarship One is not affiliated with the organisations that award these scholarships. Always confirm
          deadlines and eligibility on the official page before applying.
        </p>
      </div>
    </footer>
  )
}
