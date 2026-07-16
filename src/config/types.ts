/** Site-wide config types — keep marketing copy out of page components. */
export type NavItem = {
  to: string
  label: string
  end?: boolean
}

export type FeatureItem = {
  title: string
  description: string
}

export type SiteConfig = {
  productId: string
  productName: string
  kicker: string
  tagline: string
  lede: string
  githubUrl: string
  footerLine: string
  stackStrip: string
  finePrint?: string
  nav: NavItem[]
  /** Secondary nav under Shell “More” menu (Path, Activity, Import). */
  moreNav?: NavItem[]
  features: FeatureItem[]
  heroPoints: string[]
  ctaPrimary: { to: string; label: string }
  ctaSecondary?: { to: string; label: string }
}
