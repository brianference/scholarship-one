import type { SiteConfig } from './types'
export type { SiteConfig, FeatureItem, NavItem } from './types'

/** Marketing + shell config for Scholarship One. */
export const siteConfig: SiteConfig = {
  productId: 'scholarship-one',
  productName: 'Scholarship One',
  kicker: 'Scholarship One · real programs, ranked for you',
  tagline: 'Find real scholarships. Match smart. Apply with a plan.',
  lede: 'Profile-aware ranking over a grounded catalog — deadlines, shortlist, and an assistant that cannot invent awards.',
  githubUrl: 'https://github.com/brianference/scholarship-one',
  footerLine: 'Scholarship One · grounded matching ·',
  stackStrip: 'Stack: TypeScript · React · Vite · Cloudflare Pages · OpenAI · GitHub',
  finePrint: 'No invented awards. Official links only.',
  nav: [
    { to: '/', label: 'Home', end: true },
    { to: '/app', label: 'App' },
    { to: '/features', label: 'Features' },
  ],
  features: [
    { title: 'Grounded catalog', description: 'Only real programs with public URLs — the AI cannot invent awards.' },
    { title: 'Profile-aware match', description: 'Major, state, and level re-rank the list with a transparent score.' },
    { title: 'Deadline urgency', description: 'See overdue, due soon, or rolling so you know what to apply next.' },
    { title: 'Shortlist', description: 'Save programs on-device — no account required.' },
    { title: 'Essay coach chat', description: 'Answers stay tied to the catalog, not invented opportunities.' },
    { title: 'Modular TypeScript app', description: 'Small files by feature; easy to extend without a monolith.' },
  ],
  heroPoints: ['Match scores', 'Urgency chips', 'Shortlist', 'Light & dark'],
  ctaPrimary: { to: '/app', label: 'Open matcher' },
  ctaSecondary: { to: '/features', label: 'Features' },
}
