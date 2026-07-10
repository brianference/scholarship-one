export type WorkspaceStripProps = {
  savedCount: number
  dueSoonCount: number
  inProgressCount: number
  submittedCount: number
  suggestionCount: number
  onShowSaved: () => void
  onShowDueSoon: () => void
  onShowSuggestions: () => void
  onShowAll: () => void
}

/**
 * At-a-glance path through the app: save → track → apply.
 */
export function WorkspaceStrip({
  savedCount,
  dueSoonCount,
  inProgressCount,
  submittedCount,
  suggestionCount,
  onShowSaved,
  onShowDueSoon,
  onShowSuggestions,
  onShowAll,
}: WorkspaceStripProps) {
  return (
    <section className="workspace-strip" id="my-list" aria-labelledby="workspace-heading">
      <div className="workspace-strip__head">
        <div>
          <h2 id="workspace-heading" className="h2-section">
            Your path
          </h2>
          <p className="lede workspace-strip__lede">
            Search and match, save programs, track applications, then open official sites when you are ready.
          </p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={onShowAll}>
          Browse all
        </button>
      </div>
      <ul className="workspace-stats">
        <li>
          <button type="button" className="workspace-stat" onClick={onShowSuggestions}>
            <strong>{suggestionCount}</strong>
            <span>Suggestions</span>
          </button>
        </li>
        <li>
          <button type="button" className="workspace-stat" onClick={onShowSaved}>
            <strong>{savedCount}</strong>
            <span>Saved</span>
          </button>
        </li>
        <li>
          <button type="button" className="workspace-stat" onClick={onShowDueSoon}>
            <strong>{dueSoonCount}</strong>
            <span>Due soon</span>
          </button>
        </li>
        <li>
          <div className="workspace-stat workspace-stat--static">
            <strong>{inProgressCount}</strong>
            <span>In progress</span>
          </div>
        </li>
        <li>
          <div className="workspace-stat workspace-stat--static">
            <strong>{submittedCount}</strong>
            <span>Submitted</span>
          </div>
        </li>
      </ul>
    </section>
  )
}
