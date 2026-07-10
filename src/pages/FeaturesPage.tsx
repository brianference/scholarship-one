import type { SiteConfig } from '../config/site'
import { Shell } from '../components/Shell'
import { FeatureGrid } from '../components/FeatureGrid'

export type FeaturesPageProps = { config: SiteConfig }

export function FeaturesPage({ config }: FeaturesPageProps) {
  return (
    <Shell config={config}>
      <section className="panel">
        <h1>Features</h1>
        <p className="lede">What this product ships and how it is engineered.</p>
        <div className="grid-2">
          <FeatureGrid features={config.features} />
        </div>
      </section>
    </Shell>
  )
}
