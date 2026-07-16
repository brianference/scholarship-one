/**
 * Matches route `/matches` — profile-ranked “for you” list (not the full catalog browser).
 * Ranking: score × urgency, demote irrelevant state grants; bulk save + compare + share.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageAiActions } from '../components/PageAiActions'
import { ComparePanel, type CompareRow } from '../components/ComparePanel'
import { ScholarshipCard } from '../features/matcher/ScholarshipCard'
import { downloadIcs } from '../lib/exportTools'
import { selectTopMatches } from '../lib/matchRanking'
import { urgency } from '../lib/urgency'
import { checklistProgress } from '../lib/checklist'
import { APPLY_STATUS_LABEL } from '../lib/applyStatus'
import { profileSummary } from '../lib/profile'
import { buildSharePack, buildShareUrl } from '../lib/sharePack'
import { useScholarship } from '../state/ScholarshipContext'

export function MatchesPage() {
  const s = useScholarship()
  const [shareNote, setShareNote] = useState<string | null>(null)

  const matches = useMemo(() => selectTopMatches(s.ranked, s.profile, 12), [s.ranked, s.profile])

  const compareRows = useMemo<CompareRow[]>(() => {
    return s.compareIds
      .map((id) => matches.find((m) => m.id === id) || s.ranked.find((m) => m.id === id))
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .map((item) => ({
        id: item.id,
        name: item.name,
        amount: item.amount,
        deadline: item.deadline,
        url: item.url,
        score: item.score,
        tags: item.tags,
        urgLabel: urgency(item.deadline).label,
        status: APPLY_STATUS_LABEL[s.applyMap[item.id] || 'none'],
        checklistPercent: checklistProgress(s.checklist[item.id]).percent,
        note: s.notes[item.id] || undefined,
      }))
  }, [s.compareIds, matches, s.ranked, s.applyMap, s.checklist, s.notes])

  const topNames = matches
    .slice(0, 5)
    .map((m) => `${m.name} (score ${m.score}, id ${m.id})`)
    .join('; ')

  const profileBits = profileSummary(s.profile)

  function saveTopN(n: number) {
    const ids = matches.slice(0, n).map((m) => m.id)
    for (const id of ids) {
      if (!s.shortlist.includes(id)) s.toggleSave(id)
    }
    setShareNote(`Saved top ${ids.length} to your list (Tracker).`)
    window.setTimeout(() => setShareNote(null), 2500)
  }

  function compareTop3() {
    s.setCompareSelection(matches.slice(0, 3).map((m) => m.id))
  }

  async function copyShareLink() {
    const pack = buildSharePack({
      profile: s.profile,
      shortlist: s.shortlist,
      applyMap: s.applyMap,
    })
    const url = buildShareUrl(pack)
    try {
      await navigator.clipboard.writeText(url)
      setShareNote('Share link copied — open on another device to restore saved awards + profile.')
    } catch {
      setShareNote(url)
    }
    window.setTimeout(() => setShareNote(null), 4000)
  }

  function exportTopIcs() {
    downloadIcs(
      matches
        .filter((m) => m.urg.kind === 'fixed')
        .slice(0, 8)
        .map((m) => ({
          id: m.id,
          name: m.name,
          amount: m.amount,
          deadline: m.deadline,
          url: m.url,
          score: m.score,
          tags: m.tags,
        })),
      'matches-deadlines.ics',
    )
  }

  return (
    <div className="page-stack">
      <p className="meta page-crumb">
        <Link to="/results">Results</Link> · Matches for you
      </p>

      <section className="panel matches-hero" aria-labelledby="matches-heading">
        <p className="kicker">For you</p>
        <h1 id="matches-heading" className="h2-section">
          Matches
        </h1>
        <p className="lede">
          Ranked for your profile with deadline urgency — not the full catalog. Save awards into the{' '}
          <Link to="/tracker">application tracker</Link>. Browse everything on{' '}
          <Link to="/results">Results</Link>. Path overview:{' '}
          <Link to="/path">Path</Link>.
        </p>
        {s.lastSearchLabel ? (
          <p className="meta">
            Based on: <strong>{s.lastSearchLabel}</strong>
          </p>
        ) : (
          <p className="meta">
            Tip: complete <strong>About you</strong> on Results or the welcome walkthrough to improve ranking.
          </p>
        )}
        <div className="matches-hero__actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => s.applyProfileSearch(s.profile, { to: '/matches' })}
          >
            Refresh matches from profile
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => saveTopN(3)} disabled={!matches.length}>
            Save top 3
          </button>
          <button type="button" className="btn btn-ghost" onClick={compareTop3} disabled={matches.length < 2}>
            Compare top 3
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => void copyShareLink()}>
            Copy share link
          </button>
          <button type="button" className="btn btn-ghost" onClick={exportTopIcs} disabled={!matches.length}>
            Calendar (.ics)
          </button>
          <Link className="btn btn-ghost" to="/results">
            Browse full catalog
          </Link>
        </div>
        {shareNote ? (
          <p className="meta" role="status">
            {shareNote}
          </p>
        ) : null}
      </section>

      {compareRows.length >= 2 ? (
        <ComparePanel rows={compareRows} onClose={s.clearCompare} onRemove={s.removeCompare} />
      ) : null}

      <PageAiActions
        title="AI match coach"
        actions={[
          {
            label: 'Explain my top matches',
            prompt: `My Scholarship One profile is ${profileBits}. My top matches are: ${topNames || 'none yet'}.
For each, in 2 sentences: why it fits (catalog tags/summary only) and one next step on the official site. Do not invent awards.`,
          },
          {
            label: 'What is missing in my profile?',
            prompt: `Profile: ${profileBits}. Top matches: ${topNames || 'none'}.
Which 2 profile fields (level, major, state, background, need) should I set next to improve ranking in the real catalog? Be specific.`,
          },
          {
            label: 'Compare my top 3',
            prompt: `Compare these Scholarship One catalog programs side by side for my profile (${profileBits}): ${matches
              .slice(0, 3)
              .map((m) => `${m.name} (${m.amount}, ${m.deadline}, tags: ${m.tags.join(', ')})`)
              .join(' | ') || 'none'}.
Who should apply first and why? Catalog facts only.`,
          },
          {
            label: 'Find similar awards',
            prompt: `Based on my profile (${profileBits}) and current top matches (${topNames || 'none'}), suggest other catalog programs I should open on Results that I may have missed. List only real catalog names/ids — never invent scholarships.`,
          },
        ]}
        onAsk={s.askAi}
      />

      {matches.length === 0 ? (
        <section className="panel">
          <p className="lede empty-hint">
            No strong matches yet. Set your school level and major in About you, or run a header search.
          </p>
          <Link className="btn btn-primary" to="/results">
            Go to Results
          </Link>
        </section>
      ) : (
        <section className="list-section" aria-label="Your top matches">
          <h2 className="list-section__title">Top matches ({matches.length})</h2>
          <div className="list">
            {matches.map((item, index) => (
              <div key={item.id} className={item.pinned ? 'result-row result-row--pinned' : 'result-row'}>
                <p className="result-row__badge">
                  #{index + 1}
                  {item.pinned ? ' · Suggested' : ''} · Match {item.score}
                  {item.urg.kind === 'fixed' && item.urg.daysLeft != null
                    ? ` · Due in ${item.urg.daysLeft}d`
                    : ''}
                </p>
                {item.scoreParts && item.scoreParts.length > 0 ? (
                  <ul className="score-breakdown__list score-breakdown__list--inline" aria-label="Score parts">
                    {item.scoreParts.slice(0, 4).map((part) => (
                      <li key={part.label}>
                        <span>{part.label}</span>
                        <span className="score-breakdown__pts">+{part.points}</span>
                      </li>
                    ))}
                    {(item.scorePenalties || []).slice(0, 2).map((part) => (
                      <li key={part.label} className="score-breakdown__penalty">
                        <span>{part.label}</span>
                        <span className="score-breakdown__pts">{part.points}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <ScholarshipCard
                  item={item}
                  saved={s.shortlist.includes(item.id)}
                  onToggleSave={() => s.toggleSave(item.id)}
                  applyStatus={s.applyMap[item.id] || 'none'}
                  onApplyStatusChange={(status) => s.setApplyStatus(item.id, status)}
                  note={s.notes[item.id] || ''}
                  onNoteChange={(value) => s.setNoteFor(item.id, value)}
                  checklistDone={s.checklist[item.id] || []}
                  onToggleChecklistStep={(stepId) => s.toggleChecklistStep(item.id, stepId)}
                  compareSelected={s.compareIds.includes(item.id)}
                  onToggleCompare={() => s.toggleCompare(item.id)}
                  onOpenOfficial={() => s.markOfficialOpen(item.id)}
                  onAskAi={() =>
                    s.askAi(
                      `I am looking at match #${index + 1}: "${item.name}" (id ${item.id}, score ${item.score}, ${item.amount}, deadline ${item.deadline}, tags: ${item.tags.join(', ')}). My profile: ${profileBits}. Score parts: ${(item.scoreParts || []).map((p) => `${p.label}+${p.points}`).join(', ')}. Penalties: ${(item.scorePenalties || []).map((p) => `${p.label}${p.points}`).join(', ') || 'none'}.
Explain fit honestly using only catalog facts. One concrete next step on the official site. If this is a weak match, say so.`,
                    )
                  }
                  onAddToCalendar={() =>
                    downloadIcs(
                      [
                        {
                          id: item.id,
                          name: item.name,
                          amount: item.amount,
                          deadline: item.deadline,
                          url: item.url,
                          score: item.score,
                          tags: item.tags,
                        },
                      ],
                      `${item.id}-deadline.ics`,
                    )
                  }
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
