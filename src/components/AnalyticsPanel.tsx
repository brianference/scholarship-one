import { useMemo, useState } from 'react'
import { getAnalyticsSummary } from '../lib/analytics'
import { CATALOG } from '../data/catalog'

/**
 * Privacy-light activity insights (stored only on this device).
 */
export function AnalyticsPanel({ defaultOpen = true }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const summary = useMemo(() => getAnalyticsSummary(), [open])

  const nameById = useMemo(() => {
    const m = new Map(CATALOG.map((c) => [c.id, c.name]))
    return m
  }, [])

  return (
    <section className="panel analytics-panel" id="activity" aria-labelledby="activity-heading">
      <div className="analytics-panel__head">
        <div>
          <h2 id="activity-heading" className="h2-section">
            Your activity
          </h2>
          <p className="lede">Private stats on this device only — searches, saves, and official-site clicks.</p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          {open ? 'Hide' : 'Show insights'}
        </button>
      </div>
      {open ? (
        <div className="analytics-grid">
          <div className="analytics-stat">
            <strong>{summary.searches}</strong>
            <span>Searches</span>
          </div>
          <div className="analytics-stat">
            <strong>{summary.saves}</strong>
            <span>Saves</span>
          </div>
          <div className="analytics-stat">
            <strong>{summary.officialClicks}</strong>
            <span>Official clicks</span>
          </div>
          <div className="analytics-stat">
            <strong>{summary.last7DaysEvents}</strong>
            <span>Events (7d)</span>
          </div>
          <div className="analytics-list">
            <h3>Top searches</h3>
            {summary.topQueries.length ? (
              <ul>
                {summary.topQueries.map((row) => (
                  <li key={row.q}>
                    {row.q} <span className="meta">×{row.n}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="meta">No searches yet</p>
            )}
          </div>
          <div className="analytics-list">
            <h3>Most saved</h3>
            {summary.topSavedIds.length ? (
              <ul>
                {summary.topSavedIds.map((row) => (
                  <li key={row.id}>
                    {nameById.get(row.id) || row.id} <span className="meta">×{row.n}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="meta">No saves yet</p>
            )}
          </div>
          <div className="analytics-list">
            <h3>Categories used</h3>
            {summary.topCategories.length ? (
              <ul>
                {summary.topCategories.map((row) => (
                  <li key={row.id}>
                    {row.id} <span className="meta">×{row.n}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="meta">No category filters yet</p>
            )}
          </div>
        </div>
      ) : null}
    </section>
  )
}
