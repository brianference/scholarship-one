import { BROWSE_CATEGORIES } from '../../lib/categories'
import type { AmountBucket } from '../../lib/amountFilter'

export type SortMode = 'match' | 'deadline' | 'name'
export type UrgencyFilter = 'all' | 'soon' | 'rolling' | 'passed'
export type EssayFilter = 'all' | 'no-essay'

export type MatcherFiltersProps = {
  /** Optional list-name filter (main search lives in the header). */
  query: string
  onQueryChange: (value: string) => void
  categoryId: string
  onCategoryChange: (value: string) => void
  urgencyFilter: UrgencyFilter
  onUrgencyChange: (value: UrgencyFilter) => void
  sort: SortMode
  onSortChange: (value: SortMode) => void
  amountBucket: AmountBucket
  onAmountBucketChange: (value: AmountBucket) => void
  essayFilter: EssayFilter
  onEssayFilterChange: (value: EssayFilter) => void
  onlyShort: boolean
  onOnlyShortChange: (value: boolean) => void
  shortlistCount: number
  resultCount: number
  onClear: () => void
  onSaveSearch: () => void
}

/** Filters for the results list (keyword search is in the top header). */
export function MatcherFilters(props: MatcherFiltersProps) {
  const {
    query,
    onQueryChange,
    categoryId,
    onCategoryChange,
    urgencyFilter,
    onUrgencyChange,
    sort,
    onSortChange,
    amountBucket,
    onAmountBucketChange,
    essayFilter,
    onEssayFilterChange,
    onlyShort,
    onOnlyShortChange,
    shortlistCount,
    resultCount,
    onClear,
    onSaveSearch,
  } = props

  return (
    <div className="filters-block">
      <div className="filters">
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Filter list by name…"
          aria-label="Filter list by scholarship name"
          className="filters__search"
        />
        <select value={categoryId} onChange={(e) => onCategoryChange(e.target.value)} aria-label="Category">
          {BROWSE_CATEGORIES.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.id === 'all' ? 'All categories' : cat.label}
            </option>
          ))}
        </select>
        <select
          value={amountBucket}
          onChange={(e) => onAmountBucketChange(e.target.value as AmountBucket)}
          aria-label="Award amount"
        >
          <option value="all">Any amount</option>
          <option value="under-5k">Under $5,000</option>
          <option value="5k-20k">$5,000–$20,000</option>
          <option value="20k-plus">$20,000+</option>
          <option value="full-tuition">Full tuition / last-dollar</option>
        </select>
        <select
          value={essayFilter}
          onChange={(e) => onEssayFilterChange(e.target.value as EssayFilter)}
          aria-label="Essay requirement"
        >
          <option value="all">Any essay requirement</option>
          <option value="no-essay">No-essay preferred</option>
        </select>
        <select
          value={urgencyFilter}
          onChange={(e) => onUrgencyChange(e.target.value as UrgencyFilter)}
          aria-label="Deadline"
        >
          <option value="all">Any deadline</option>
          <option value="soon">Due within 45 days</option>
          <option value="rolling">Rolling deadline</option>
          <option value="passed">Deadline passed</option>
        </select>
        <select value={sort} onChange={(e) => onSortChange(e.target.value as SortMode)} aria-label="Sort by">
          <option value="match">Best fit first</option>
          <option value="deadline">Soonest deadline</option>
          <option value="name">Name A–Z</option>
        </select>
        <label className="check-inline">
          <input type="checkbox" checked={onlyShort} onChange={(e) => onOnlyShortChange(e.target.checked)} />
          Saved only ({shortlistCount})
        </label>
      </div>
      <div className="filters-actions">
        <p className="filters-count" aria-live="polite">
          {resultCount} scholarship{resultCount === 1 ? '' : 's'}
        </p>
        <button type="button" className="btn btn-ghost" onClick={onSaveSearch}>
          Save this search
        </button>
        <button type="button" className="btn btn-ghost" onClick={onClear}>
          Clear filters
        </button>
      </div>
    </div>
  )
}
