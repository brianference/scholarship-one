import { useState, type FormEvent } from 'react'
import type { SiteConfig } from '../config/site'
import { CANNED_PROMPTS } from '../lib/cannedPrompts'

export type AiSearchHeroProps = {
  config: SiteConfig
  onAsk: (prompt: string) => void
}

/**
 * Hero with search — sends questions into the Scholarship match panel.
 */
export function AiSearchHero({ config, onAsk }: AiSearchHeroProps) {
  const [query, setQuery] = useState('')

  function submit(event: FormEvent) {
    event.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) return
    onAsk(trimmed)
  }

  return (
    <section className="hero hero--ai glass-panel">
      <p className="kicker">{config.kicker}</p>
      <h1>{config.tagline}</h1>
      <p className="lede">{config.lede}</p>

      <form className="ai-search" onSubmit={submit} role="search" aria-label="Scholarship search">
        <label htmlFor="ai-scholarship-search" className="sr-only">
          Describe who you are looking for scholarships for
        </label>
        <div className="ai-search__row">
          <input
            id="ai-scholarship-search"
            className="ai-search__input"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Example: Latina student, undergrad, interested in sports…"
            autoComplete="off"
            enterKeyHint="search"
          />
          <button type="submit" className="btn btn-primary ai-search__submit" disabled={!query.trim()}>
            Search
          </button>
        </div>
        <p className="ai-search__fine">
          Your message opens in the Scholarship match panel on the side. Review suggestions there, then save any you
          want to keep.
        </p>
      </form>

      <div className="canned" aria-label="Example searches">
        <p className="canned__label">Examples</p>
        <div className="canned__row">
          {CANNED_PROMPTS.map((item) => (
            <button key={item.label} type="button" className="canned__chip" onClick={() => onAsk(item.prompt)}>
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
