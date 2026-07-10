export type CompareRow = {
  id: string
  name: string
  amount: string
  deadline: string
  score: number
  urgLabel: string
  tags: readonly string[]
  status: string
  note?: string
  checklistPercent: number
  url: string
}

export type ComparePanelProps = {
  rows: CompareRow[]
  onClose: () => void
  onRemove: (id: string) => void
}

/**
 * Side-by-side compare for 2–4 shortlisted awards.
 */
export function ComparePanel({ rows, onClose, onRemove }: ComparePanelProps) {
  if (rows.length < 2) return null

  return (
    <section className="panel compare-panel" id="compare" aria-labelledby="compare-heading">
      <div className="compare-panel__head">
        <h2 id="compare-heading" className="h2-section">
          Compare saved awards
        </h2>
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Close compare
        </button>
      </div>
      <div className="compare-grid" style={{ gridTemplateColumns: `repeat(${Math.min(rows.length, 4)}, minmax(0, 1fr))` }}>
        {rows.slice(0, 4).map((row) => (
          <article key={row.id} className="compare-card card">
            <h3>{row.name}</h3>
            <p className="meta">{row.amount}</p>
            <p className="meta">Deadline · {row.deadline}</p>
            <p className="meta">Urgency · {row.urgLabel}</p>
            <p className="meta">
              Match · <strong>{row.score}</strong>
            </p>
            <p className="meta">Status · {row.status}</p>
            <p className="meta">Checklist · {row.checklistPercent}%</p>
            <p className="meta">Tags · {row.tags.slice(0, 4).join(', ')}</p>
            {row.note ? <p className="compare-note">{row.note}</p> : <p className="meta">No note yet</p>}
            <div className="compare-card__actions">
              <a className="btn btn-primary" href={row.url} target="_blank" rel="noreferrer">
                Official site
              </a>
              <button type="button" className="btn btn-ghost" onClick={() => onRemove(row.id)}>
                Remove
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
