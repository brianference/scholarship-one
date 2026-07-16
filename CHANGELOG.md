# Changelog

## 3.0.0 — 2026-07-16 — "Linen Focus"

Major release: mobile-native design system on the modular workspace architecture,
plus a strict-typecheck cleanup that fixed a real bug.

### Design — Linen Focus

- **Bottom tab bar (mobile):** Match / Deadlines / Pipeline / Your path with line
  icons. Match opens the AI assistant sheet; the others route to `/digest`,
  `/tracker`, `/path`. The inline Match button and chat FAB are hidden on mobile so
  the primary action lives in one place. Desktop chrome is unchanged (no tab bar).
- **Scholarship cards:** new lead row — category icon tile (auto-picked from tags) +
  title + accent amount + a conic **match-score ring**. All existing card features
  (chips, why/tips, notes, checklist, compare, status, calendar, official link) kept.
- **Segmented sort control** replaces the sort dropdown (Best fit / Deadline / A–Z).
- Inline SVG favicon, light/dark `theme-color`, `viewport-fit=cover` + safe-area.
- Theme-aware in light and dark; warm peach/linen palette preserved.

### Fixed

- **Compare panel** rendered "Urgency / Status / Checklist · undefined" — rows were
  cast to the wrong type. Now builds proper `CompareRow` values.
- Strict typecheck brought from 18 errors to **0** and wired into CI: widened
  `CatalogItem` id/tags off the `as const` literals, annotated id→item maps, and
  removed a dead Node `Buffer` branch in the share-link encoder.
- Onboarding finish CTA reads "Show my matches"; Results shows a "Your results" banner.

### Engineering

- Modular architecture committed to version control (was live but uncommitted):
  React context + routed pages, matchRanking / pinFilter / sharePack / digestActivity.
- CI now runs strict `typecheck` + the 120-case matrix in addition to the hard QA gate.
- QA green: typecheck 0, qa:hard 0 fail, qa:cases 147/0, sim-50 0 bugs, audit-100 0 fail.

### Known follow-up

- Live email digest still needs `RESEND_API_KEY` on Cloudflare (`digestEmail:false`).

## 1.0.0 — 2026-07-10

### Added

- Public product launch for **Scholarship One**
- Marketing homepage with sales-ready copy
- App workspace with grounded data
- Features page with recruiter-facing engineering signals
- Light/dark theme toggle (persisted)
- Grounded AI chat dock (`/api/chat`) + health endpoint
- Cloudflare Pages headers (CSP, frame deny)
- MIT license, README, release notes

### Product principle

AI answers are constrained to on-page structured context — degrade gracefully when the model or key is unavailable.
