export type RankedScholarship = {
  id: string
  name: string
  amount: string
  summary: string
  url: string
  tags: readonly string[]
  score: number
  urg: { label: string; tone: string }
}

export type ScholarshipCardProps = {
  item: RankedScholarship
  saved: boolean
  onToggleSave: () => void
}

/** One ranked program row — pure presentation. */
export function ScholarshipCard({ item, saved, onToggleSave }: ScholarshipCardProps) {
  return (
    <article className="card row-card">
      <div className="grow">
        <div className="chips">
          <span className={`chip ${item.urg.tone}`}>{item.urg.label}</span>
          {item.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="chip">
              {tag}
            </span>
          ))}
        </div>
        <h3>{item.name}</h3>
        <p>{item.summary}</p>
        <p className="meta">
          {item.amount} · Match <strong>{item.score}</strong>
        </p>
        <div className="score-bar" aria-hidden="true">
          <span style={{ width: `${item.score}%` }} />
        </div>
      </div>
      <div className="btn-col">
        <button type="button" className="btn btn-ghost" onClick={onToggleSave}>
          {saved ? '★ Saved' : '☆ Shortlist'}
        </button>
        <a className="btn btn-primary" href={item.url} target="_blank" rel="noreferrer">
          Official site
        </a>
      </div>
    </article>
  )
}
