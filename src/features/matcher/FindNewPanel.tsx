/**
 * The big "Find new scholarships" button and its result line. A tap checks the catalog for
 * awards added since the last check and, when signed in, searches the web for new ones. The
 * results appear in the separate "New for you" area below, not here.
 */
import { useState } from 'react'
import type { FindSummary } from '../../state/ScholarshipContext'

type FindNewPanelProps = {
  finding: boolean
  /** Web search needs an account (it is rate limited per person). */
  signedIn: boolean
  accountsEnabled: boolean
  /** Epoch ms of the latest tap, 0 if never. */
  checkedAt: number
  onFind: () => Promise<FindSummary>
  onSignIn: () => void
}

/** "today at 3:05 PM" or "Nov 3" for the last-checked line. */
function whenLabel(ms: number): string {
  const d = new Date(ms)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return `today at ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function summaryText(r: FindSummary, signedIn: boolean): string {
  const web = r.webAdded > 0 ? ` ${r.webAdded} found on the web and verified against the official page.` : ''
  if (r.firstTime) {
    return r.webAdded > 0
      ? `Checked. ${r.webAdded} new ${r.webAdded === 1 ? 'scholarship' : 'scholarships'} found on the web and verified against the official page. From now on, anything new that fits you shows up below.`
      : `Checked. From now on, anything new that fits you shows up below.${signedIn ? '' : ' Sign in to also search the web.'}`
  }
  if (r.added > 0) return `${r.added} new since your last check.${web}`
  const failed = signedIn && r.errors.length > 0 ? ` The web search hit a problem: ${r.errors[0]}` : ''
  return `Nothing new since your last check.${failed}`
}

export function FindNewPanel({ finding, signedIn, accountsEnabled, checkedAt, onFind, onSignIn }: FindNewPanelProps) {
  const [result, setResult] = useState<string | null>(null)

  async function handleClick() {
    setResult(null)
    const summary = await onFind()
    setResult(summaryText(summary, signedIn))
  }

  return (
    <section className="find-new" aria-labelledby="find-new-heading">
      <h2 id="find-new-heading" className="sr-only">
        Find new scholarships
      </h2>
      <button type="button" className="find-new__btn" onClick={() => void handleClick()} disabled={finding} aria-busy={finding}>
        <svg className="find-new__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="m15.5 15.5 5 5" strokeLinecap="round" />
          <path d="M10.5 7.5v6M7.5 10.5h6" strokeLinecap="round" />
        </svg>
        <span className="find-new__text">
          <span className="find-new__title">{finding ? 'Searching for new scholarships...' : 'Find new scholarships'}</span>
          <span className="find-new__sub">
            {signedIn
              ? 'Searches the catalog and the web for awards that match your profile'
              : 'Checks the catalog for awards added since your last check'}
          </span>
        </span>
      </button>
      <p className="meta find-new__status" role="status" aria-live="polite">
        {result ??
          (checkedAt
            ? `Last checked ${whenLabel(checkedAt)}.`
            : 'Tap to start. New awards that fit your profile will appear in their own area below.')}
        {!signedIn && accountsEnabled ? (
          <>
            {' '}
            <button type="button" className="row-actions__link" onClick={onSignIn}>
              Sign in
            </button>{' '}
            to also search the web.
          </>
        ) : null}
      </p>
    </section>
  )
}
