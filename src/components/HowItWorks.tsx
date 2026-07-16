import { Link } from 'react-router-dom'
import type { SiteConfig } from '../config/site'
import { FeatureGrid } from './FeatureGrid'
import { CANNED_PROMPTS } from '../lib/cannedPrompts'

export type HowItWorksProps = {
  config: SiteConfig
  onExample?: (prompt: string) => void
  /** Compact variant for landing before any search. */
  showExamples?: boolean
}

/**
 * Product explainer — shown on the landing view before the user starts searching.
 */
export function HowItWorks({ config, onExample, showExamples = true }: HowItWorksProps) {
  return (
    <section className="panel how-it-works-top" id="how-it-works" aria-labelledby="how-heading">
      <p className="kicker">{config.kicker}</p>
      <h1 id="how-heading" className="how-it-works-top__title">
        {config.tagline}
      </h1>
      <p className="lede">{config.lede}</p>

      <div className="how-it-works-top__ctas">
        <Link className="btn btn-primary" to={config.ctaPrimary.to}>
          {config.ctaPrimary.label}
        </Link>
        {config.ctaSecondary ? (
          <Link className="btn btn-ghost" to={config.ctaSecondary.to}>
            {config.ctaSecondary.label}
          </Link>
        ) : null}
      </div>

      <ol className="how-steps">
        <li>
          <strong>Search</strong> — use the bar at the top (major, state, background, or plain language).
        </li>
        <li>
          <strong>Review Matches</strong> — ranked for-you list plus the Scholarship match panel.
        </li>
        <li>
          <strong>Save, track, apply</strong> — notes, checklist, application tracker, then open the official site.
        </li>
      </ol>

      {showExamples && onExample ? (
        <div className="canned" aria-label="Example searches">
          <p className="canned__label">Try an example (opens Matches)</p>
          <div className="canned__row">
            {CANNED_PROMPTS.slice(0, 8).map((item) => (
              <button key={item.label} type="button" className="canned__chip" onClick={() => onExample(item.prompt)}>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <h2 className="h2-section how-it-works-top__sub">What you can do here</h2>
      <div className="grid-2 feature-grid">
        <FeatureGrid features={config.features} />
      </div>
    </section>
  )
}
