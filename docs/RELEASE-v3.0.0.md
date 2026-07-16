# Scholarship One v3.0.0 — "Linen Focus"

**Released:** 2026-07-16
**Live:** https://scholarship-one.pages.dev
**Prod build:** `index-Bp2G8H5Y.js`

A major release that adds a mobile-native design system on top of the modular
workspace architecture, and pays down type debt (18 → 0 strict errors) — which
surfaced and fixed a real Compare-panel bug.

## Highlights

### Linen Focus design
- **Bottom tab bar on mobile** — Match / Deadlines / Pipeline / Your path with crisp
  line icons. "Match" opens the AI assistant sheet; the rest route to `/digest`,
  `/tracker`, `/path`. The inline Match button + chat FAB are hidden on mobile so the
  primary action lives in one place. Desktop keeps its full nav + FAB (no tab bar).
- **Match-score ring cards** — each scholarship card leads with a category icon tile
  (auto-selected from the award's tags), title, accent amount, and a conic match-score
  ring. Every existing feature (notes, checklist, compare, status, calendar, official
  link) is preserved.
- **Segmented sort control** — Best fit / Deadline / A–Z, replacing the dropdown.
- Inline SVG favicon, light/dark `theme-color`, `viewport-fit=cover` with safe-area
  padding. Warm peach/linen palette preserved; verified in light and dark.

### Reconciliation note
The upstream "Linen Focus" patch was authored against the pre-rewrite single-page app
(hash anchors `#digest`/`#pipeline`/`#my-list`). It was reapplied by intent onto the
current routed architecture: tab targets became real routes, and the top nav is kept on
mobile so `/matches`, `/results`, and the More menu (which did not exist when the patch
was written) stay reachable.

### Fixes
- **Compare panel** was rendering "Urgency / Status / Checklist · undefined" because
  rows were cast to `ExportRow` instead of built as `CompareRow`. Fixed.
- Strict typecheck 18 → 0 and added to CI (widened `CatalogItem` id/tags, annotated
  id→item maps, dropped a dead Node `Buffer` branch).
- Copy: onboarding CTA "Show my matches"; Results "Your results" banner.

## Verification
- `npm run typecheck` → 0 errors
- `npm run qa:hard` → 0 failures
- `npm run qa:cases` → 147 passed / 0 failed
- `npm run qa:sim50` → 50 pass / 0 bugs · `npm run qa:audit100` → 92 pass / 0 fail
- Live prod (per-deploy URL): 4 tab-bar items, 209 match rings, segmented sort
  (Best fit/Deadline/A–Z), 0 console errors — mobile, desktop, and dark verified.
- GitHub Actions QA workflow: green on `57760a9`.

## Follow-up
- Live email digest needs `RESEND_API_KEY` set on the Cloudflare Pages project
  (`/api/health` currently reports `digestEmail:false`).
