import type { SiteConfig } from './types'
export type { SiteConfig, FeatureItem, NavItem } from './types'

/** Product copy for Scholarship One. */
export const siteConfig: SiteConfig = {
  productId: 'scholarship-one',
  productName: 'Scholarship One',
  kicker: 'Scholarship One',
  tagline: 'Find scholarships that actually fit you.',
  lede: 'Search by major, background, and need. Save programs you care about, track where you are in each application, and open the official site when you are ready to apply. We only list real awards with public links.',
  githubUrl: 'https://github.com/brianference/scholarship-one',
  footerLine: 'Scholarship One ·',
  stackStrip: 'Built with TypeScript, React, Vite, and Cloudflare Pages.',
  finePrint: 'Every award links to an official page. We do not invent scholarships.',
  /** Primary nav — keep ≤4 for mobile single-row (Path/Activity live under More). */
  nav: [
    { to: '/matches', label: 'Matches', end: true },
    { to: '/results', label: 'Results' },
    { to: '/digest', label: 'Deadlines' },
    { to: '/tracker', label: 'Tracker' },
  ],
  /** Secondary destinations — Shell "More" menu */
  moreNav: [
    { to: '/path', label: 'Path' },
    { to: '/activity', label: 'Activity' },
    { to: '/import', label: 'Import share link' },
  ],
  features: [
    {
      title: 'One search, full workspace',
      description:
        'A single search updates your profile, ranks the list, suggests programs, and opens the match panel together.',
    },
    {
      title: 'State and regional awards',
      description: 'Cal Grant, TEXAS Grant, Bright Futures, Excelsior, MAP, and more — ranked when you set your state.',
    },
    {
      title: 'Weekly deadline digest',
      description: 'See what is due this week, copy a digest, email it to yourself, or export a calendar file.',
    },
    {
      title: 'Notes, checklist, compare',
      description: 'Add notes, track application steps, and compare saved awards side by side.',
    },
    {
      title: 'Backup and restore',
      description: 'Download a JSON backup of your list, notes, and profile — restore anytime on this device.',
    },
    {
      title: 'Official apply step',
      description: 'Every card links to a public official URL. We never invent scholarships or deadlines.',
    },
  ],
  heroPoints: ['Real awards', 'Instant local match', 'Save and track', 'Official links'],
  ctaPrimary: { to: '/matches', label: 'See my matches' },
  ctaSecondary: { to: '/results', label: 'Browse catalog' },
}
