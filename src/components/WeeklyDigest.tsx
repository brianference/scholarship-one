import { useMemo, useState } from 'react'
import type { CatalogItem } from '../data/catalog'
import { buildWeeklyDigest, digestMailto } from '../lib/deadlineDigest'
import { downloadIcs } from '../lib/exportTools'
import { EmailDigestOptIn } from './EmailDigestOptIn'
import { loadDigestPrefs, shouldPromptWeeklyDigest } from '../lib/digestPrefs'

export type WeeklyDigestProps = {
  catalog: readonly CatalogItem[]
  savedIds: string[]
  onFocusSaved: () => void
}

/**
 * Weekly deadline digest — in-app, copyable, mailto, calendar export.
 */
export function WeeklyDigestPanel({ catalog, savedIds, onFocusSaved }: WeeklyDigestProps) {
  const digest = useMemo(() => buildWeeklyDigest(catalog, savedIds, 7), [catalog, savedIds])
  const monthDigest = useMemo(() => buildWeeklyDigest(catalog, savedIds, 30), [catalog, savedIds])
  const [note, setNote] = useState<string | null>(null)
  const weeklyNudge =
    shouldPromptWeeklyDigest(loadDigestPrefs()) && (digest.items.length > 0 || savedIds.length > 0)

  async function copyText() {
    try {
      await navigator.clipboard.writeText(digest.plainText)
      setNote('Digest copied')
    } catch {
      setNote('Could not copy')
    }
    window.setTimeout(() => setNote(null), 2000)
  }

  return (
    <section className="panel digest-panel" id="digest" aria-labelledby="digest-heading">
      <div className="digest-panel__head">
        <div>
          <p className="kicker">This week</p>
          <h2 id="digest-heading" className="h2-section">
            Deadline digest
          </h2>
          <p className="lede">
            Fixed deadlines in the next 7 days ({digest.weekLabel}). Saved awards are listed first. Always confirm on
            the official site.
          </p>
        </div>
        <div className="digest-panel__actions">
          <button type="button" className="btn btn-ghost" onClick={() => void copyText()}>
            Copy digest
          </button>
          <a className="btn btn-ghost" href={digestMailto(digest)}>
            Email to myself
          </a>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() =>
              downloadIcs(
                digest.items.map((i) => ({
                  id: i.id,
                  name: i.name,
                  amount: i.amount,
                  deadline: i.deadline,
                  url: i.url,
                  score: 0,
                  tags: [],
                })),
                'scholarship-week-deadlines.ics',
              )
            }
            disabled={!digest.items.length}
          >
            Week .ics
          </button>
        </div>
      </div>

      {digest.items.length === 0 ? (
        <p className="lede empty-hint">
          No fixed deadlines in the next 7 days. {monthDigest.items.length} fixed deadline
          {monthDigest.items.length === 1 ? '' : 's'} in the next 30 days
          {monthDigest.items.length ? ` (soonest: ${monthDigest.items[0].name})` : ''}.{' '}
          {digest.rollingCount} programs use rolling or FAFSA-cycle dates.
        </p>
      ) : (
        <ul className="digest-list">
          {digest.items.map((item) => (
            <li key={item.id} className="digest-list__item">
              <div>
                <strong>{item.name}</strong>
                <p className="meta">
                  Due in {item.daysLeft} day{item.daysLeft === 1 ? '' : 's'} · {item.deadline} · {item.amount}
                  {item.saved ? ' · Saved' : ''}
                </p>
              </div>
              <a className="btn btn-primary" href={item.url} target="_blank" rel="noreferrer">
                Official site
              </a>
            </li>
          ))}
        </ul>
      )}

      {weeklyNudge ? (
        <p className="lede digest-nudge" role="status">
          Weekly digest reminder: you opted in and it has been about a week — email yourself the list below.
        </p>
      ) : null}

      <EmailDigestOptIn
        weekLabel={digest.weekLabel}
        items={digest.items.map((i) => ({
          name: i.name,
          deadline: i.deadline,
          amount: i.amount,
          url: i.url,
          daysLeft: i.daysLeft,
        }))}
      />

      <div className="digest-panel__foot">
        <button type="button" className="btn btn-ghost" onClick={onFocusSaved}>
          Open saved list
        </button>
        {note ? (
          <span className="export-bar__note" role="status">
            {note}
          </span>
        ) : null}
      </div>
    </section>
  )
}
