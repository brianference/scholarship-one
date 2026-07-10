import type { SiteConfig } from '../config/site'
import { Shell } from '../components/Shell'
import { FeatureGrid } from '../components/FeatureGrid'
import { Hero } from '../components/Hero'

export type HomePageProps = { config: SiteConfig }

export function HomePage({ config }: HomePageProps) {
  return (
    <Shell config={config}>
      <Hero config={config} />
      <section className="grid-3" aria-label="Highlights">
        <FeatureGrid features={config.features.slice(0, 3)} />
      </section>
    </Shell>
  )
}
