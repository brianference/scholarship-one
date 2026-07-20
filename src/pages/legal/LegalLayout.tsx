/** Shared layout for the policy and marketing pages. */
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { safeJsonLd, SITE_ORIGIN } from '../../lib/jsonLd'
import { useMeta } from '../../lib/seo'

export const OPERATOR_JURISDICTION = 'Arizona, United States'
export const CONTACT_EMAIL = 'brianference@protonmail.com'

/** Single source of truth for the "last updated" line on the policy pages. */
export const POLICY_UPDATED = 'July 19, 2026'

export function LegalPage({
  title,
  intro,
  updated,
  path,
  description,
  children,
}: {
  title: string
  intro?: ReactNode
  updated?: string
  /** Route path, used for the canonical URL. */
  path: string
  /** Search-result snippet. Falls back to the site default when omitted. */
  description?: string
  children: ReactNode
}) {
  useMeta({ title, description, path })
  return (
    <main id="main" className="mx-auto w-full max-w-3xl px-4 pb-24 pt-8 sm:pt-12">
      <Breadcrumbs trail={[{ label: 'Home', to: '/' }, { label: title }]} />

      <header className="mt-4">
        <h1 className="m-0 text-3xl font-extrabold tracking-tight text-[var(--text)] sm:text-4xl">{title}</h1>
        {intro && <p className="mt-3 mb-0 text-base leading-relaxed text-[var(--muted)]">{intro}</p>}
        {updated && (
          <p className="mt-3 mb-0 text-[length:var(--font-size-xs)] font-medium uppercase tracking-wide text-[var(--muted)]">
            Last updated {updated}
          </p>
        )}
      </header>

      <div className="mt-8 flex flex-col gap-8">{children}</div>
    </main>
  )
}

/** One titled section of a policy. */
export function Section({ heading, children }: { heading: string; children: ReactNode }) {
  const id = heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return (
    <section aria-labelledby={id} className="scroll-mt-24">
      <h2 id={id} className="m-0 text-xl font-bold tracking-tight text-[var(--text)]">
        {heading}
      </h2>
      <div className="mt-2.5 flex flex-col gap-3 text-[length:var(--font-size)] leading-relaxed text-[var(--muted)] [&_a]:font-semibold [&_a]:text-[var(--accent)] [&_a:hover]:underline [&_strong]:text-[var(--text)]">
        {children}
      </div>
    </section>
  )
}

/** Bulleted list with the spacing the policy pages use. */
export function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="m-0 flex list-disc flex-col gap-2 pl-5">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  )
}

export type Crumb = { label: string; to?: string }


/**
 * Breadcrumb trail with schema.org BreadcrumbList markup, so search engines can
 * show the hierarchy instead of a bare URL.
 */
export function Breadcrumbs({ trail }: { trail: Crumb[] }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.label,
      ...(crumb.to ? { item: `${SITE_ORIGIN}${crumb.to}` } : {}),
    })),
  }

  return (
    <>
      <nav aria-label="Breadcrumb">
        {/* Wraps rather than overflowing: award names are long and this must not
            force a horizontal scrollbar on a phone. */}
        <ol className="m-0 flex list-none flex-wrap items-center gap-x-1.5 gap-y-1 p-0 text-[length:var(--font-size-sm)] text-[var(--muted)]">
          {trail.map((crumb, i) => (
            <li key={i} className="flex min-w-0 items-center gap-1.5">
              {i > 0 && (
                <span aria-hidden="true" className="text-[var(--muted)]/60">
                  /
                </span>
              )}
              {crumb.to ? (
                <Link
                  to={crumb.to}
                  className="rounded-sm font-medium text-[var(--accent)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span aria-current="page" className="min-w-0 truncate font-medium text-[var(--text)]">
                  {crumb.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
    </>
  )
}
