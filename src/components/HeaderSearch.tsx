import { useEffect, useState, type FormEvent } from 'react'

export type HeaderSearchProps = {
  /** Controlled value from parent (optional). */
  value?: string
  onSearch: (query: string) => void
  placeholder?: string
  /** Compact mobile / expanded desktop handled via CSS. */
  autoFocus?: boolean
}

/**
 * Global keyword / plain-language search for the top bar.
 * Renders as one combined control (icon + field + Search).
 */
export function HeaderSearch({
  value = '',
  onSearch,
  placeholder = 'Search by major, state, or situation…',
  autoFocus = false,
}: HeaderSearchProps) {
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    setDraft(value)
  }, [value])

  function submit(event: FormEvent) {
    event.preventDefault()
    const trimmed = draft.trim()
    if (!trimmed) return
    onSearch(trimmed)
  }

  return (
    <form className="header-search" onSubmit={submit} role="search" aria-label="Search scholarships">
      <span className="header-search__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
      </span>
      <label htmlFor="header-scholarship-search" className="sr-only">
        Search scholarships by keyword or situation
      </label>
      <input
        id="header-scholarship-search"
        className="header-search__input"
        type="search"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        enterKeyHint="search"
        autoFocus={autoFocus}
      />
      <button type="submit" className="btn btn-primary header-search__btn" disabled={!draft.trim()}>
        Search
      </button>
    </form>
  )
}
