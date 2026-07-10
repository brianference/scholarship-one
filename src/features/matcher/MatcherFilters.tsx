export type MatcherFiltersProps = {
  query: string
  onQueryChange: (value: string) => void
  tag: string
  onTagChange: (value: string) => void
  tags: string[]
  onlyShort: boolean
  onOnlyShortChange: (value: boolean) => void
  shortlistCount: number
}

export function MatcherFilters(props: MatcherFiltersProps) {
  const { query, onQueryChange, tag, onTagChange, tags, onlyShort, onOnlyShortChange, shortlistCount } = props
  return (
    <div className="filters">
      <input value={query} onChange={(e) => onQueryChange(e.target.value)} placeholder="Search programs…" aria-label="Search" />
      <select value={tag} onChange={(e) => onTagChange(e.target.value)} aria-label="Tag">
        {tags.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
      <label className="check-inline">
        <input type="checkbox" checked={onlyShort} onChange={(e) => onOnlyShortChange(e.target.checked)} />
        Shortlist only ({shortlistCount})
      </label>
    </div>
  )
}
