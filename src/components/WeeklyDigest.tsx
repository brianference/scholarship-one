import { useMemo, useState } from 'react'
import type { CatalogItem } from '../data/catalog'
import { buildWeeklyDigest, digestMailto, type DigestItem } from '../lib/deadlineDigest'
import { downloadIcs } from '../lib/exportTools'
import { EmailDigestOptIn } from './EmailDigestOptIn'
import { loadDigestPrefs, shouldPromptWeeklyDigest } from '../lib/digestPrefs'
import { PageAiActions } from './PageAiActions'

export type WeeklyDigestProps = {
  catalog: readonly CatalogItem[]
  savedIds: string[]
  onFocusSaved: () => void
  onAskAi?: (prompt: string) => void
}

function DigestRow({ item }: { item: DigestItem }) {
  return (
    <li className={`digest-list__item${item.saved ? ' digest-list__item--saved' : ''}`}>
      <div>
        <strong>{item.name}</strong>
        <p className="meta">
          {item.statusLabel}
          {item.deadline ? ` · ${item.deadline}` : ''}
          {` · ${item.amount}`}
          {item.saved ? ' · Saved' : ''}
        </p>
      </div>
      <a className="btn btn-primary" href={item.url} target="_blank" rel="noreferrer">
        Official site
      </a>
    </li>
  )
}

/**
 * Deadline digest — always lists saved awards; week window is a separate section.
 */
export function WeeklyDigestPanel({ catalog, savedIds, onFocusSaved, onAskAi }: WeeklyDigestProps) {
  const digest = useMemo(() => buildWeeklyDigest(catalog, savedIds, 7), [catalog, savedIds])
  const monthDigest = useMemo(() => buildWeeklyDigest(catalog, savedIds, 30), [catalog, savedIds])
  const [note, setNote] = useState<string | null>(null)
  const weeklyNudge =
    shouldPromptWeeklyDigest(loadDigestPrefs()) && (digest.items.length > 0 || savedIds.length > 0)

  const savedFixedSoon = digest.savedItems.filter((i) => i.kind === 'fixed' && (i.daysLeft ?? 999) <= 30)
  const savedRolling = digest.savedItems.filter((i) => i.kind === 'rolling' || i.kind === 'unknown')
  const savedPassed = digest.savedItems.filter((i) => i.kind === 'passed')

  async function copyText() {
    try {
      await navigator.clipboard.writeText(digest.plainText)
      setNote('Digest copied')
    } catch {
      setNote('Could not copy')
    }
    window.setTimeout(() => setNote(null), 2000)
  }

  const aiActions =
    onAskAi && savedIds.length > 0
      ? [
          {
            label: 'Prioritize my saved deadlines',
            prompt: `I have ${savedIds.length} saved scholarships on Scholarship One. ${savedFixedSoon.length} have fixed dates in the next 30 days, ${savedRolling.length} are rolling/cycle, ${savedPassed.length} may be past. Using only programs in the catalog, tell me what to work on this week in order, and what to confirm on official sites.`,
          },
          {
            label: 'Draft a weekly apply plan',
            prompt: `Build a simple 7-day application plan for my ${savedIds.length} saved scholarships. Use only catalog programs. Include checklist steps (docs, essay, portal) and which ones need FAFSA or official confirmation.`,
          },
        ]
      : onAskAi
        ? [
            {
              label: 'What deadlines should I watch?',
              prompt:
                'Based on a typical undergrad profile, which types of deadlines in your catalog matter most this month (fixed vs rolling/FAFSA), and how should I use the Deadlines page with a saved list?',
            },
          ]
        : []

  return (
    <section className="panel digest-panel" id="digest" aria-labelledby="digest-heading">
      <div className="digest-panel__head">
        <div>
          <p className="kicker">Deadlines</p>
          <h2 id="digest-heading" className="h2-section">
            Deadline digest
          </h2>
          <p className="lede">
            Your <strong>saved</strong> awards always appear here (including rolling and far-out dates). The week
            section only lists fixed dates in the next 7 days. Confirm every date on the official site.
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
                [...digest.savedItems, ...digest.items]
                  .filter((i, idx, arr) => arr.findIndex((x) => x.id === i.id) === idx)
                  .filter((i) => i.kind === 'fixed' && i.daysLeft != null)
                  .map((i) => ({
                    id: i.id,
                    name: i.name,
                    amount: i.amount,
                    deadline: i.deadline,
                    url: i.url,
                    score: 0,
                    tags: [],
                  })),
                'scholarship-deadlines.ics',
              )
            }
            disabled={!digest.savedItems.some((i) => i.kind === 'fixed') && !digest.items.length}
          >
            Calendar (.ics)
          </button>
        </div>
      </div>

      {/* ALWAYS show saved section first */}
      <div className="digest-section">
        <h3 className="list-section__title">Your saved awards ({digest.savedItems.length})</h3>
        {digest.savedItems.length === 0 ? (
          <p className="lede empty-hint">
            No saved awards yet. On Results, star programs (★ Save), then return here — they will list with deadline
            status even if the date is rolling or more than a week away.
          </p>
        ) : (
          <ul className="digest-list">
            {digest.savedItems.map((item) => (
              <DigestRow key={`saved-${item.id}`} item={item} />
            ))}
          </ul>
        )}
      </div>

      <div className="digest-section">
        <h3 className="list-section__title">Fixed deadlines this week ({digest.weekLabel})</h3>
        {digest.items.length === 0 ? (
          <p className="lede empty-hint">
            No fixed catalog deadlines in the next 7 days.
            {monthDigest.items.length
              ? ` ${monthDigest.items.length} fixed date${monthDigest.items.length === 1 ? '' : 's'} in the next 30 days (soonest: ${monthDigest.items[0].name}).`
              : ''}{' '}
            {digest.rollingCount} programs use rolling or FAFSA-cycle dates.
          </p>
        ) : (
          <ul className="digest-list">
            {digest.items.map((item) => (
              <DigestRow key={`week-${item.id}`} item={item} />
            ))}
          </ul>
        )}
      </div>

      {onAskAi ? <PageAiActions title="AI on deadlines" actions={aiActions} onAsk={onAskAi} /> : null}

      {weeklyNudge ? (
        <p className="lede digest-nudge" role="status">
          Weekly digest reminder: you opted in and it has been about a week — email yourself the list below.
        </p>
      ) : null}

      <EmailDigestOptIn
        weekLabel={digest.weekLabel}
        items={[
          ...digest.savedItems.map((i) => ({
            name: i.name,
            deadline: i.deadline,
            amount: i.amount,
            url: i.url,
            daysLeft: i.daysLeft,
          })),
          ...digest.items
            .filter((i) => !digest.savedItems.some((s) => s.id === i.id))
            .map((i) => ({
              name: i.name,
              deadline: i.deadline,
              amount: i.amount,
              url: i.url,
              daysLeft: i.daysLeft,
            })),
        ]}
      />

      <div className="digest-panel__foot">
        <button type="button" className="btn btn-ghost" onClick={onFocusSaved}>
          Open saved on Results
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
