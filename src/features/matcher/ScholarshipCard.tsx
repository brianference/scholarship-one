import { useState } from 'react'
import type { ApplyStatus } from '../../lib/applyStatus'
import { APPLY_STATUS_LABEL } from '../../lib/applyStatus'
import { DEFAULT_CHECKLIST, checklistProgress } from '../../lib/checklist'

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
}: ScholarshipCardProps) {
  const [open, setOpen] = useState(false)
  const progress = checklistProgress(checklistDone)

  return (
    <article className="card row-card">
      <div className="grow">
        <div className="chips">
          <span className={`chip ${item.urg.tone}`}>{item.urg.label}</span>
          {item.urg.kind === 'fixed' ? <span className="chip chip-ok">Fixed date</span> : null}
          {item.urg.confirmOfficial ? <span className="chip chip-muted">Confirm official</span> : null}
          {item.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="chip">
              {tag}
            </span>
          ))}
        </div>
        <h3>{item.name}</h3>
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
