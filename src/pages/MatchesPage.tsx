/**
 * Matches route `/matches` — profile-ranked “for you” list (not the full catalog).
 * Linen Focus layout: serif title + subtitle count, segmented sort, real-count stat
 * strip, a prominent "Save top 3" CTA, and compact Top-matches rows that expand to the
 * full action card. Ranking: score × urgency, demote irrelevant state grants.
 */
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageAiActions } from '../components/PageAiActions'
import { ComparePanel, type CompareRow } from '../components/ComparePanel'
import { ScholarshipCard } from '../features/matcher/ScholarshipCard'
import { RowActions } from '../features/matcher/RowActions'
import { findAward } from '../lib/awards'
import { useToast } from '../components/ui/Toast'
import { formatRemindOn } from '../lib/reminders'
import { iconForTags, MatchRing } from '../features/matcher/cardVisuals'
import { downloadIcs } from '../lib/exportTools'
import { selectTopMatches } from '../lib/matchRanking'
import type { RankedRow } from '../lib/catalogQuery'
import { FindNewPanel } from '../features/matcher/FindNewPanel'
import { urgency } from '../lib/urgency'
import { checklistProgress } from '../lib/checklist'
import { APPLY_STATUS_LABEL } from '../lib/applyStatus'
import { profileSummary } from '../lib/profile'
import { buildSharePack, buildShareUrl } from '../lib/sharePack'
import { useScholarship } from '../state/ScholarshipContext'
import { useConfirmedSave } from '../lib/useConfirmedSave'
import { useAccount } from '../state/account'
import { SignInModal } from '../components/SignInModal'
import { useMeta } from '../lib/seo'

type MatchesSort = 'match' | 'deadline' | 'amount'

/** Best-effort numeric rank for an award amount string (largest first). */
function amountRank(amount: string): number {
  const s = amount.toLowerCase()
  if (/full (ride|tuition)|last-dollar|full cost/.test(s)) return 1_000_000_000
  const k = s.match(/\$?\s*([\d,.]+)\s*k/)
  if (k) return parseFloat(k[1].replace(/,/g, '')) * 1000
  const d = s.match(/\$\s*([\d,]+)/)
  if (d) return parseFloat(d[1].replace(/,/g, ''))
  if (/annual|varies|federal max|per year|\/yr|stipend/.test(s)) return 500_000
  return 0
}

/** Short deadline label for a compact row. */
function dueShort(deadline: string): string {
  const u = urgency(deadline)
  if (u.kind === 'fixed' && u.daysLeft != null) {
    if (u.daysLeft < 0) return 'closed'
    if (u.daysLeft === 0) return 'due today'
    return `due in ${u.daysLeft}d`
  }
  if (u.kind === 'passed') return 'confirm if open'
  return 'rolling / confirm'
}

export function MatchesPage() {
  useMeta({
    title: 'My scholarship matches',
    description:
      'Scholarships ranked against your major, state, year, and background, with an explanation of why each one matched.',
    path: '/matches',
  })
  const s = useScholarship()
  const { requestToggle, dialog: unsaveDialog } = useConfirmedSave({ shortlist: s.shortlist, toggleSave: s.toggleSave })
  const [shareNote, setShareNote] = useState<string | null>(null)
  const [sort, setSort] = useState<MatchesSort>('match')
  const [openId, setOpenId] = useState<string | null>(null)
  /** A New row the student just opened stays in the New area until they close it, so it does not vanish mid-read. */
  const [lingerRow, setLingerRow] = useState<RankedRow | null>(null)
  const { notify } = useToast()
  const account = useAccount()
  const [signInOpen, setSignInOpen] = useState(false)

  // Once the opened row is closed (or another is opened) it is released from the New area.
  useEffect(() => {
    if (lingerRow && openId !== lingerRow.id) setLingerRow(null)
  }, [openId, lingerRow])

  /** Unseen new awards live in their own area, so they are left out of the main list. */
  const newIds = useMemo(() => {
    const ids = new Set(s.newRows.map((r) => r.id))
    // The row being read in the New area must not also appear in Top matches.
    if (lingerRow) ids.add(lingerRow.id)
    return ids
  }, [s.newRows, lingerRow])

  const baseMatches = useMemo(
    () => selectTopMatches(s.ranked, s.profile, 12).filter((r) => !newIds.has(r.id)),
    [s.ranked, s.profile, newIds],
  )

  const matches = useMemo(() => {
    const list = [...baseMatches]
    if (sort === 'match') {
      // Highest match score first (e.g. 90 then 78).
      list.sort((a, b) => b.score - a.score)
    } else if (sort === 'deadline') {
      list.sort((a, b) => {
        const ad = a.urg.kind === 'fixed' && a.urg.daysLeft != null ? a.urg.daysLeft : Number.MAX_SAFE_INTEGER
        const bd = b.urg.kind === 'fixed' && b.urg.daysLeft != null ? b.urg.daysLeft : Number.MAX_SAFE_INTEGER
        return ad - bd
      })
    } else if (sort === 'amount') {
      list.sort((a, b) => amountRank(b.amount) - amountRank(a.amount))
    }
    return list
  }, [baseMatches, sort])

  /** Real stat-strip counts from live workspace state (never fabricated). */
  const stats = useMemo(() => {
    const dueSoon = s.ranked.filter((r) => {
      const u = urgency(r.deadline)
      return u.kind === 'fixed' && u.daysLeft != null && u.daysLeft >= 0 && u.daysLeft <= 45
    }).length
    const applied = Object.values(s.applyMap).filter((v) => v === 'applied' || v === 'submitted').length
    return { ranked: s.ranked.length, saved: s.shortlist.length, dueSoon, applied }
  }, [s.ranked, s.applyMap, s.shortlist])

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

  function hideMatch(item: { id: string; name: string }) {
    s.hideScholarship(item.id)
    if (openId === item.id) setOpenId(null)
    notify(`Hidden ${item.name}.`, 'info', { label: 'Undo', onClick: () => s.unhideScholarship(item.id) })
  }

  function setMatchReminder(item: { id: string; name: string }, date: string | null) {
    s.setReminder(item.id, date)
    notify(
      date ? `Reminder set for ${formatRemindOn(date)}. ${item.name} is saved to your list.` : 'Reminder cleared.',
      'success',
    )
  }

  /** Hidden awards that still exist in the catalog, newest hidden first. */
  const hiddenItems = s.hidden
    .map((id) => findAward(id))
    .filter((c): c is NonNullable<ReturnType<typeof findAward>> => Boolean(c))

  function compareTop3() {
    s.setCompareSelection(matches.slice(0, 3).map((m) => m.id))
  }

  async function copyShareLink() {
    const pack = buildSharePack({ profile: s.profile, shortlist: s.shortlist, applyMap: s.applyMap })
    const url = buildShareUrl(pack)
    try {
      await navigator.clipboard.writeText(url)
      setShareNote('Share link copied — open on another device to restore saved awards + profile.')
    } catch {
      setShareNote(url)
    }
    window.setTimeout(() => setShareNote(null), 4000)
  }

  function icsRow(m: (typeof matches)[number]) {
    return { id: m.id, name: m.name, amount: m.amount, deadline: m.deadline, url: m.url, score: m.score, tags: m.tags }
  }

  function exportTopIcs() {
    downloadIcs(matches.filter((m) => m.urg.kind === 'fixed').slice(0, 8).map(icsRow), 'matches-deadlines.ics')
  }

  const SORTS: [MatchesSort, string][] = [
    ['match', 'Best fit'],
    ['deadline', 'Deadline'],
    ['amount', 'Amount'],
  ]

  /** The New area's rows: the unseen ones, plus the one that was just opened (now seen, shown without a badge). */
  const areaRows = useMemo(
    () => (lingerRow && !s.newRows.some((r) => r.id === lingerRow.id) ? [...s.newRows, lingerRow] : s.newRows),
    [s.newRows, lingerRow],
  )

  /** One match row: lead button, quick actions, and the expanded card. New rows get a badge and tint. */
  function renderRow(item: RankedRow, index: number, isNew: boolean) {
    const isOpen = openId === item.id
    return (
      <div key={item.id} className={`match-row${isOpen ? ' is-open' : ''}${item.pinned ? ' match-row--pinned' : ''}${isNew ? ' match-row--new' : ''}`}>
        <button
          type="button"
          className="match-row__lead"
          aria-expanded={isOpen}
          onClick={() => {
            if (!isOpen) {
              s.markSeen(item.id)
              if (isNew) setLingerRow(item)
            }
            setOpenId(isOpen ? null : item.id)
          }}
        >
          <span className="card-lead__tile" aria-hidden="true">
            {iconForTags(item.tags)}
          </span>
          <span className="match-row__body">
            <span className="match-row__name">
              {isNew ? <span className="match-row__new">New</span> : null}
              {item.pinned ? <span className="match-row__pin">Suggested</span> : null}
              {item.name}
            </span>
            <span className="match-row__sub">
              {item.amount} · {dueShort(item.deadline)}
              {item.id.startsWith('web-') ? ' · web find' : ''}
            </span>
          </span>
          <MatchRing score={item.score} />
          <span className={`match-row__chev${isOpen ? ' is-open' : ''}`} aria-hidden="true">
            ⌄
          </span>
        </button>

        <RowActions
          name={item.name}
          deadline={item.deadline}
          remindOn={s.remindMap[item.id] || ''}
          onSetReminder={(date) => setMatchReminder(item, date)}
          onHide={() => hideMatch(item)}
        />

        {isOpen ? (
          <div className="match-row__detail">
            {item.id.startsWith('web-') ? (
              <p className="meta web-find-note">
                Found on the web and checked against the text of its own page. Confirm the amount, deadline and
                eligibility on the official site before you apply.
              </p>
            ) : null}
            <ScholarshipCard
              item={item}
              hideLead
              saved={s.shortlist.includes(item.id)}
              onToggleSave={() => requestToggle({ id: item.id, name: item.name })}
              applyStatus={s.applyMap[item.id] || 'none'}
              onApplyStatusChange={(status) => s.setApplyStatus(item.id, status)}
              note={s.notes[item.id] || ''}
              onNoteChange={(value) => s.setNoteFor(item.id, value)}
              checklistDone={s.checklist[item.id] || []}
              onToggleChecklistStep={(stepId) => s.toggleChecklistStep(item.id, stepId)}
              compareSelected={s.compareIds.includes(item.id)}
              onToggleCompare={() => s.toggleCompare(item.id)}
              onOpenOfficial={() => s.markOfficialOpen(item.id)}
              onAddToCalendar={() => downloadIcs([icsRow(item)], `${item.id}-deadline.ics`)}
              onAskAi={() =>
                s.askAi(
                  `I am looking at match #${index + 1}: "${item.name}" (id ${item.id}, score ${item.score}, ${item.amount}, deadline ${item.deadline}, tags: ${item.tags.join(', ')}). My profile: ${profileBits}. Score parts: ${(item.scoreParts || []).map((p) => `${p.label}+${p.points}`).join(', ')}. Penalties: ${(item.scorePenalties || []).map((p) => `${p.label}${p.points}`).join(', ') || 'none'}.
Explain fit honestly using only catalog facts. One concrete next step on the official site. If this is a weak match, say so.`,
                )
              }
            />
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="page-stack">
      {unsaveDialog}
      {signInOpen ? <SignInModal onClose={() => setSignInOpen(false)} /> : null}
      <p className="meta page-crumb">
        <Link to="/results">Results</Link> · Matches for you
      </p>

      <FindNewPanel
        finding={s.finding}
        signedIn={account.status === 'signed-in'}
        accountsEnabled={account.enabled}
        checkedAt={s.findState.checkedAt}
        onFind={() => s.findNew({ searchWeb: account.status === 'signed-in' })}
        onSignIn={() => setSignInOpen(true)}
      />

      {areaRows.length > 0 ? (
        <section className="new-area" aria-labelledby="new-area-heading">
          <div className="new-area__head">
            <h2 id="new-area-heading" className="new-area__title">
              <span className="new-area__pill">New</span> For you ({s.newRows.length})
            </h2>
            <p className="meta new-area__hint">Added since you started checking and not opened yet. Open one and the badge goes away.</p>
          </div>
          <div className="match-list match-list--new">
            {areaRows.map((item, index) => renderRow(item, index, !lingerRow || item.id !== lingerRow.id))}
          </div>
        </section>
      ) : null}

      <section className="panel matches-hero" aria-labelledby="matches-heading">
        <div className="matches-hero__head">
          <div>
            <p className="kicker">For you</p>
            <h1 id="matches-heading" className="display-title">
              Matches
            </h1>
            <p className="matches-subcount">
              {stats.ranked} real program{stats.ranked === 1 ? '' : 's'} ranked for your profile
            </p>
          </div>
        </div>

        <div className="segmented segmented--wide" role="group" aria-label="Sort matches">
          {SORTS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`segmented__btn${sort === value ? ' is-on' : ''}`}
              aria-pressed={sort === value}
              onClick={() => setSort(value)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="stat-strip" role="group" aria-label="Your scholarship stats">
          <div className="stat stat--accent">
            <b>{stats.ranked}</b>
            <span>Matched</span>
          </div>
          <div className="stat stat--good">
            <b>{stats.saved}</b>
            <span>Saved</span>
          </div>
          <div className="stat stat--warn">
            <b>{stats.dueSoon}</b>
            <span>Due soon</span>
          </div>
          <div className="stat">
            <b>{stats.applied}</b>
            <span>Applied</span>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={() => saveTopN(3)}
          disabled={!matches.length}
        >
          Save top 3 to my list
        </button>

        <div className="matches-hero__actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => s.applyProfileSearch(s.profile, { to: '/matches' })}
          >
            Refresh from profile
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
          <div className="list-section__head">
            <h2 className="list-section__title">Top matches ({matches.length})</h2>
            <Link className="list-section__link" to="/results">
              See all
            </Link>
          </div>
          <div className="match-list">
            {matches.map((item, index) => renderRow(item, index, false))}
          </div>
        </section>
      )}

      {hiddenItems.length ? (
        <details className="hidden-panel">
          <summary>Hidden scholarships ({hiddenItems.length})</summary>
          <ul className="hidden-panel__list">
            {hiddenItems.map((c) => (
              <li key={c.id} className="hidden-panel__item">
                <span className="hidden-panel__name">{c.name}</span>
                <button type="button" className="btn btn-ghost" onClick={() => s.unhideScholarship(c.id)}>
                  Restore
                </button>
              </li>
            ))}
          </ul>
        </details>
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
    </div>
  )
}
