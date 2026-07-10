import type { FeatureItem } from '../config/site'

export type FeatureGridProps = { features: FeatureItem[] }

/** Feature cards — full list lives on Home only. */
export function FeatureGrid({ features }: FeatureGridProps) {
  return (
    <>
      {features.map((feature) => (
        <article key={feature.title} className="card">
          <h3>{feature.title}</h3>
          <p>{feature.description}</p>
        </article>
      ))}
    </>
  )
}
