import { useState } from 'react'
import type { ApplyStatus } from '../../lib/applyStatus'
import { APPLY_STATUS_LABEL } from '../../lib/applyStatus'
import { DEFAULT_CHECKLIST, checklistProgress } from '../../lib/checklist'

/** Pick a warm category glyph from an award's tags. */
function iconForTags(tags: readonly string[]): string {
  const t = tags.join(' ').toLowerCase()
  if (/nurs|health|medic|nbna|aacn/.test(t)) return '🩺'
  if (/stem|engineer|math|science|swe|nsbe|shpe|tech|comput/.test(t)) return '🔬'
  if (/business|market|account|finance|mba|deloitte/.test(t)) return '📈'
  if (/sport|athlet|ncaa|track/.test(t)) return '🏅'
  if (/disab|accessib|lime|krause/.test(t)) return '♿'
  if (/women|latina|female|aauw/.test(t)) return '🌸'
  if (/state|regional|grant|cal|texas|florida|excelsior/.test(t)) return '📍'
  if (/art|design|music|creative/.test(t)) return '🎨'
  return '🎓'
}

/** Circular match-score indicator (conic ring). */
function MatchRing({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, Math.round(score)))
  return (
    <div
      className="match-ring"
      style={{ ['--p' as string]: `${pct}%` }}
      role="img"
      aria-label={`Match score ${pct} of 100`}
    >
      <i>{pct}</i>
    </div>
  )
}

export type RankedScholarship = {
  id: string
  name: string
  amount: string
  summary: string
  url: string
  tags: readonly string[]
  score: number
  urg: {
    label: string
    tone: string
    kind?: string
    confirmOfficial?: boolean
  }
  why?: string[]
  tips?: string[]
  scoreParts?: { label: string; points: number }[]
  scorePenalties?: { label: string; points: number }[]
}

export type ScholarshipCardProps = {
  item: RankedScholarship
  saved: boolean
  onToggleSave: () => void
  applyStatus?: ApplyStatus
  onApplyStatusChange?: (status: ApplyStatus) => void
  onAddToCalendar?: () => void
  note?: string
  onNoteChange?: (note: string) => void
  checklistDone?: string[]
  onToggleChecklistStep?: (stepId: string) => void
  compareSelected?: boolean
  onToggleCompare?: () => void
  onOpenOfficial?: () => void
  /** Opens Scholarship match with a grounded prompt about this award. */
  onAskAi?: () => void
}

/** Prefer readable level/field chips; de-emphasize raw high-school when undergrad is also tagged. */
function displayTags(tags: readonly string[]): string[] {
  const list = [...tags]
  // Put school-level tags in a clearer order for scanning
  const priority = ['undergrad', 'grad', 'community-college', 'high-school', 'all-majors']
  list.sort((a, b) => {
    const ai = priority.indexOf(a)
    const bi = priority.indexOf(b)
    if (ai === -1 && bi === -1) return 0
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })
  return list.slice(0, 3)
}

/** One ranked program row with notes, checklist, compare. */
export function ScholarshipCard({
  item,
  saved,
  onToggleSave,
  applyStatus = 'none',
  onApplyStatusChange,
  onAddToCalendar,
  note = '',
  onNoteChange,
  checklistDone = [],
  onToggleChecklistStep,
  compareSelected = false,
  onToggleCompare,
  onOpenOfficial,
  onAskAi,
}: ScholarshipCardProps) {
  const [open, setOpen] = useState(false)
  const progress = checklistProgress(checklistDone)

  return (
    <article className="card row-card">
      <div className="grow">
        <div className="card-lead">
          <span className="card-lead__tile" aria-hidden="true">
            {iconForTags(item.tags)}
          </span>
          <div className="card-lead__title">
            <h3>{item.name}</h3>
            <p className="card-lead__amt">{item.amount}</p>
          </div>
          <MatchRing score={item.score} />
        </div>
        <div className="chips">
          <span className={`chip ${item.urg.tone}`}>{item.urg.label}</span>
          {item.urg.kind === 'fixed' ? <span className="chip chip-ok">Fixed date</span> : null}
          {item.urg.confirmOfficial ? <span className="chip chip-muted">Confirm official</span> : null}
          {displayTags(item.tags).map((tag) => (
            <span key={tag} className="chip">
              {tag}
            </span>
          ))}
        </div>
        <p>{item.summary}</p>
        {item.urg.confirmOfficial ? (
          <p className="meta deadline-confirm">Deadline is rolling, cycle-based, or soft — confirm on the official site.</p>
        ) : null}
        {item.why && item.why.length > 0 ? (
          <ul className="why-list" aria-label="Why this matches">
            {item.why.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        ) : null}
        {item.tips && item.tips.length > 0 ? (
          <ul className="tip-list" aria-label="Ways to improve this match">
            {item.tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        ) : null}
        <p className="meta" aria-label={`Match score ${item.score} of 100`}>
          {item.amount} · Match <strong>{item.score}</strong>
          {applyStatus !== 'none' ? ` · ${APPLY_STATUS_LABEL[applyStatus]}` : ''}
          {progress.done > 0 ? ` · Checklist ${progress.percent}%` : ''}
          {note ? ' · Has note' : ''}
        </p>
        <div className="score-bar" aria-hidden="true">
          <span style={{ width: `${Math.min(100, Math.max(0, item.score))}%` }} />
        </div>

        {open ? (
          <div className="card-details">
            {item.scoreParts && item.scoreParts.length > 0 ? (
              <div className="score-breakdown" aria-label="Match score breakdown">
                <p className="meta">
                  <strong>Why this score ({item.score})</strong>
                </p>
                <ul className="score-breakdown__list">
                  {item.scoreParts.map((part) => (
                    <li key={part.label}>
                      <span>{part.label}</span>
                      <span className="score-breakdown__pts">+{part.points}</span>
                    </li>
                  ))}
                  {(item.scorePenalties || []).map((part) => (
                    <li key={part.label} className="score-breakdown__penalty">
                      <span>{part.label}</span>
                      <span className="score-breakdown__pts">{part.points}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {onNoteChange ? (
              <label className="field">
                <span>Your notes</span>
                <textarea
                  value={note}
                  onChange={(e) => onNoteChange(e.target.value)}
                  rows={3}
                  placeholder="Essay idea, recommender, portal login hint…"
                  aria-label={`Notes for ${item.name}`}
                />
              </label>
            ) : null}
            {onToggleChecklistStep ? (
              <fieldset className="checklist">
                <legend>Application checklist ({progress.done}/{progress.total})</legend>
                {DEFAULT_CHECKLIST.map((step) => (
                  <label key={step.id} className="check-inline checklist__row">
                    <input
                      type="checkbox"
                      checked={checklistDone.includes(step.id)}
                      onChange={() => onToggleChecklistStep(step.id)}
                    />
                    {step.label}
                  </label>
                ))}
              </fieldset>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="btn-col">
        <button type="button" className="btn btn-ghost" onClick={onToggleSave}>
          {saved ? '★ Saved' : '☆ Save'}
        </button>
        {onToggleCompare ? (
          <button
            type="button"
            className={`btn btn-ghost${compareSelected ? ' btn-ghost--on' : ''}`}
            onClick={onToggleCompare}
            aria-pressed={compareSelected}
          >
            {compareSelected ? '✓ Compare' : 'Compare'}
          </button>
        ) : null}
        <button type="button" className="btn btn-ghost" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          {open ? 'Hide details' : 'Notes & checklist'}
        </button>
        {onApplyStatusChange ? (
          <label className="field field-compact">
            <span className="sr-only">Application status</span>
            <select
              value={applyStatus}
              onChange={(e) => onApplyStatusChange(e.target.value as ApplyStatus)}
              aria-label={`Status for ${item.name}`}
            >
              {(Object.keys(APPLY_STATUS_LABEL) as ApplyStatus[]).map((key) => (
                <option key={key} value={key}>
                  {APPLY_STATUS_LABEL[key]}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {onAddToCalendar ? (
          <button type="button" className="btn btn-ghost" onClick={onAddToCalendar}>
            Add to calendar
          </button>
        ) : null}
        {onAskAi ? (
          <button type="button" className="btn btn-ghost" onClick={onAskAi}>
            Ask AI about this
          </button>
        ) : null}
        <a
          className="btn btn-primary"
          href={item.url}
          target="_blank"
          rel="noreferrer"
          aria-label={`${item.name} official website (opens in a new tab)`}
          onClick={() => onOpenOfficial?.()}
        >
          Official website
        </a>
      </div>
    </article>
  )
}
