import { BROWSE_CATEGORIES } from '../lib/categories'

export type CategoryBrowseProps = {
  activeId: string
  onSelect: (categoryId: string) => void
  counts?: Record<string, number>
}

/**
 * First-class browse categories (not raw tag soup).
 */
export function CategoryBrowse({ activeId, onSelect, counts }: CategoryBrowseProps) {
  return (
    <div className="category-browse" role="toolbar" aria-label="Browse by category">
      {BROWSE_CATEGORIES.map((cat) => {
        const count = counts?.[cat.id]
        const on = activeId === cat.id
        return (
          <button
            key={cat.id}
            type="button"
            className={`category-browse__chip${on ? ' category-browse__chip--on' : ''}`}
            aria-pressed={on}
            title={cat.description}
            onClick={() => onSelect(cat.id)}
          >
            {cat.label}
            {typeof count === 'number' ? <span className="category-browse__count">{count}</span> : null}
          </button>
        )
      })}
    </div>
  )
}
