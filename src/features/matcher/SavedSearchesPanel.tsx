import type { SavedSearch } from '../../lib/savedSearches'

export type SavedSearchesPanelProps = {
  searches: SavedSearch[]
  onRestore: (search: SavedSearch) => void
  onDelete: (id: string) => void
}

/** Named filter snapshots (localStorage). */
export function SavedSearchesPanel({ searches, onRestore, onDelete }: SavedSearchesPanelProps) {
  if (!searches.length) return null

  return (
    <section className="saved-searches" aria-label="Saved searches">
      <h3 className="h2-tight">Your saved searches</h3>
      <ul className="saved-searches__list">
        {searches.map((search) => (
          <li key={search.id} className="saved-searches__item">
            <button type="button" className="saved-searches__load" onClick={() => onRestore(search)}>
              <strong>{search.name}</strong>
              <span className="meta">
                {[search.query || null, search.tag !== 'all' ? search.tag : null, search.profile.major]
                  .filter(Boolean)
                  .join(' · ') || 'All filters'}
              </span>
            </button>
            <button
              type="button"
              className="btn btn-ghost saved-searches__del"
              onClick={() => onDelete(search.id)}
              aria-label={`Delete saved search ${search.name}`}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
