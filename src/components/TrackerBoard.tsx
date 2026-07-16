import type { ApplyStatus } from '../lib/applyStatus'
import { APPLY_STATUS_LABEL } from '../lib/applyStatus'
import { urgency } from '../lib/urgency'

export type TrackerItem = {
  id: string
  name: string
  deadline: string
  amount: string
  url: string
  status: ApplyStatus
}

export type TrackerBoardProps = {
  items: TrackerItem[]
  onStatusChange: (id: string, status: ApplyStatus) => void
  onOpenOfficial: (id: string) => void
}

const COLUMNS: { status: ApplyStatus; title: string }[] = [
  { status: 'none', title: 'Saved' },
  { status: 'interested', title: 'Interested' },
  { status: 'applied', title: 'Started' },
  { status: 'submitted', title: 'Submitted' },
]

/**
 * Application tracker — move saved awards through apply stages.
 * (Replaces the old “pipeline” naming, which read as technical jargon.)
 */
export function TrackerBoard({ items, onStatusChange, onOpenOfficial }: TrackerBoardProps) {
  if (!items.length) {
    return (
      <section className="panel pipeline-board" id="tracker" aria-labelledby="tracker-heading">
        <h2 id="tracker-heading" className="h2-section">
          Application tracker
        </h2>
        <p className="lede empty-hint">
          Save scholarships from Matches or Results, then move them here: Saved → Interested → Started →
          Submitted.
        </p>
      </section>
    )
  }

  return (
    <section className="panel pipeline-board" id="tracker" aria-labelledby="tracker-heading">
      <div className="pipeline-board__head">
        <div>
          <p className="kicker">Where you are</p>
          <h2 id="tracker-heading" className="h2-section">
            Application tracker
          </h2>
          <p className="lede">
            Track progress on awards you saved. Due-soon chips help you pick what to work on next.
          </p>
        </div>
      </div>
      <div className="pipeline-cols">
        {COLUMNS.map((col) => {
          const colItems = items.filter((i) => (i.status || 'none') === col.status)
          return (
            <div key={col.status} className="pipeline-col">
              <h3>
                {col.title} <span className="pipeline-col__count">{colItems.length}</span>
              </h3>
              <ul className="pipeline-col__list">
                {colItems.map((item) => {
                  const urg = urgency(item.deadline)
                  return (
                    <li key={item.id} className="pipeline-card">
                      <strong>{item.name}</strong>
                      <p className="meta">
                        <span className={`chip ${urg.tone}`}>{urg.label}</span>
                      </p>
                      <p className="meta">{item.amount}</p>
                      {urg.confirmOfficial ? (
                        <p className="meta pipeline-card__confirm">Confirm date on official site</p>
                      ) : null}
                      <label className="field field-compact">
                        <span className="sr-only">Move {item.name}</span>
                        <select
                          value={item.status || 'none'}
                          onChange={(e) => onStatusChange(item.id, e.target.value as ApplyStatus)}
                          aria-label={`Status for ${item.name}`}
                        >
                          {(Object.keys(APPLY_STATUS_LABEL) as ApplyStatus[]).map((key) => (
                            <option key={key} value={key}>
                              {APPLY_STATUS_LABEL[key] === 'Not tracked' ? 'Saved' : APPLY_STATUS_LABEL[key]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <a
                        className="btn btn-ghost"
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => onOpenOfficial(item.id)}
                      >
                        Official site
                      </a>
                    </li>
                  )
                })}
                {!colItems.length ? <li className="pipeline-empty meta">None</li> : null}
              </ul>
            </div>
          )
        })}
      </div>
    </section>
  )
}
