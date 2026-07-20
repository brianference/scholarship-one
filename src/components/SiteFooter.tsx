/**
 * Site footer.
 *
 * Structure follows the FlowBoard reference: a wide brand column beside narrow
 * link columns, tiny uppercase column headings, and a separate dimmer base
 * strip for the copyright line.
 *
 * The footer is dark in BOTH themes rather than following --bg. That is the
 * whole effect: a deliberate dark band anchors the end of the page and reads as
 * a considered boundary instead of the content simply running out. Because the
 * surface no longer follows the theme, its colours are fixed literals rather
 * than tokens — a --text that flips to near-black would vanish against it.
 *
 * Extra bottom padding clears the fixed mobile tab bar and the iOS home
 * indicator; without it the last link row sits under the tab bar and cannot be
 * tapped.
 */
import { Link } from 'react-router-dom'
import { BrandMark } from './BrandLogo'
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
    heading: 'Account',
    links: [
      { label: 'Create an account', to: '/register' },
      { label: 'Sign in', to: '/login' },
      { label: 'Reset password', to: '/forgot-password' },
    ],
  },
  {
    heading: 'Company',
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

/* Fixed literals, not theme tokens — see the note above. All verified against
   the #17110e surface: heading 17.4:1, links 8.1:1, hover 8.8:1. */
const HEADING = 'text-[11.5px] font-bold uppercase tracking-[0.06em] text-[#faf6f2]'
const LINK =
  'inline-flex min-h-[30px] items-center rounded-sm text-sm text-[#b8a89c] transition-colors ' +
  'hover:text-[#e8a54b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8a54b]'

export function SiteFooter({ config }: { config: SiteConfig }) {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-16 border-t border-[#2a1f19] bg-[#17110e]">
      {/* Container query, not a viewport breakpoint: the AI chat dock takes up to
          400px on the right, so the footer's real width is far narrower than the
          window. A `lg:` rule fires at 1024px of *window* and would cram five
          columns into ~790px of actual space. */}
      <div className="@container mx-auto w-full max-w-[1100px] px-5 pb-6 pt-11">
        <div className="grid gap-10 @xl:grid-cols-2 @4xl:grid-cols-[1.5fr_repeat(4,1fr)]">
          <div className="flex flex-col gap-3">
            <Link
              to="/"
              // Colour set on the anchor itself, not only on the inner span:
              // the legacy 'a { color: var(--accent) }' rule would otherwise
              // apply to the anchor's own text nodes, and the accent lands at
              // 3.82:1 against this dark band.
              className="inline-flex w-fit items-center gap-2 rounded-sm text-[#faf6f2] no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8a54b]"
            >
              <BrandMark className="size-8 shrink-0" />
              <span className="text-[1.05rem] font-bold tracking-tight">Scholarship One</span>
              <span className="sr-only">home</span>
            </Link>
            <p className="m-0 max-w-xs text-sm leading-relaxed text-[#b8a89c]">
              Real scholarships with official links — searchable without an account, and never padded with sponsored
              listings or awards that closed years ago.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.heading} aria-label={column.heading} className="flex flex-col gap-3">
              <h2 className={`m-0 ${HEADING}`}>{column.heading}</h2>
              <ul className="m-0 flex list-none flex-col gap-1 p-0">
                {column.links.map((link) => (
                  <li key={link.label}>
                    {link.to ? (
                      <Link to={link.to} className={LINK}>
                        {link.label}
                      </Link>
                    ) : (
                      <a href={link.href} target="_blank" rel="noreferrer noopener" className={LINK}>
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      {/* Base strip: its own darker band and hairline, so the legal fine print
          reads as a footnote rather than as another column. */}
      <div className="border-t border-white/[0.07] bg-[#120d0b]">
        <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-2 px-5 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] pt-4 text-xs text-[#8d7f75] sm:flex-row sm:items-center sm:justify-between sm:pb-4">
          <p className="m-0">© {year} Scholarship One. All rights reserved.</p>
          <p className="m-0">
            {config.finePrint || 'Every award links to an official page. We do not invent scholarships.'}
          </p>
        </div>
        <div className="mx-auto w-full max-w-[1100px] px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:pb-5">
          <p className="m-0 text-[11px] leading-relaxed text-[#8d7f75]">
            Not affiliated with the organisations that award these scholarships. Always confirm deadlines and
            eligibility on the official page before applying.
          </p>
        </div>
      </div>
    </footer>
  )
}
