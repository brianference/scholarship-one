import { Link } from 'react-router-dom'
import type { SiteConfig } from '../config/site'

export type HeroProps = { config: SiteConfig }

/** Landing hero — copy comes from SiteConfig only. */
export function Hero({ config }: HeroProps) {
  return (
    <section className="hero">
      <p className="kicker">{config.kicker}</p>
      <h1>{config.tagline}</h1>
      <p className="lede">{config.lede}</p>
      <div className="cta-row">
        <Link className="btn btn-primary" to={config.ctaPrimary.to}>
          {config.ctaPrimary.label}
        </Link>
        {config.ctaSecondary ? (
          <Link className="btn btn-ghost" to={config.ctaSecondary.to}>
            {config.ctaSecondary.label}
          </Link>
        ) : null}
      </div>
      <ul className="hero-points">
        {config.heroPoints.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
    </section>
  )
}
