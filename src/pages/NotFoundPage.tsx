/**
 * Real 404 page.
 *
 * The catch-all route used to redirect to "/", which search engines treat as a
 * soft 404: a dead URL returning a 200 with unrelated content. That both wastes
 * crawl budget and strands anyone following a stale link with no explanation.
 */
import { Link, useLocation } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Breadcrumbs } from './legal/LegalLayout'
import { useMeta } from '../lib/seo'

export default function NotFoundPage() {
  const location = useLocation()
  useMeta({
    title: 'Page not found',
    description: 'That page does not exist. Browse scholarships or head back to the homepage.',
    path: location.pathname,
    noindex: true,
  })

  return (
    <main id="main" className="mx-auto w-full max-w-2xl px-4 pb-24 pt-8 sm:pt-12">
      <Breadcrumbs trail={[{ label: 'Home', to: '/' }, { label: 'Page not found' }]} />

      <div className="surface mt-6 p-6 sm:p-8">
        <p className="m-0 text-[length:var(--font-size-sm)] font-bold uppercase tracking-wide text-[var(--accent)]">
          Error 404
        </p>
        <h1 className="mt-2 mb-0 text-2xl font-extrabold tracking-tight text-[var(--text)] sm:text-3xl">
          We couldn&rsquo;t find that page
        </h1>
        <p className="mt-3 mb-0 text-[length:var(--font-size)] leading-relaxed text-[var(--muted)]">
          The link may be out of date, or the page may have moved. Nothing you saved is affected.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link to="/results" className="no-underline">
            <Button size="lg">Browse scholarships</Button>
          </Link>
          <Link to="/matches" className="no-underline">
            <Button size="lg" variant="secondary">
              See my matches
            </Button>
          </Link>
        </div>

        <nav aria-label="Helpful links" className="mt-8 border-t border-[var(--border-strong)] pt-5">
          <h2 className="m-0 text-[length:var(--font-size-sm)] font-bold text-[var(--text)]">Popular pages</h2>
          <ul className="m-0 mt-2 flex list-none flex-wrap gap-x-5 gap-y-1 p-0">
            {[
              { to: '/', label: 'Home' },
              { to: '/digest', label: 'Deadlines' },
              { to: '/tracker', label: 'Application tracker' },
              { to: '/about', label: 'About us' },
              { to: '/contact', label: 'Contact us' },
            ].map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className="inline-flex min-h-[28px] items-center rounded-sm text-[length:var(--font-size-sm)] font-medium text-[var(--accent)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </main>
  )
}
