# Scholarship One v3.1.0 — "Linen Focus: Matches"

**Released:** 2026-07-16
**Live:** https://scholarship-one.pages.dev

v3.0.0 applied the Linen Focus card + tab-bar patch, but the Matches page itself was
still the old verbose layout. This release rebuilds it to match the mockup.

## Matches page

- **Serif display title** and a subtitle count — "N real programs ranked for your profile".
- **Segmented sort** at the top: Best fit / Deadline / Amount. Amount uses a best-effort
  numeric rank ("full ride" and "varies" handled gracefully).
- **4-up stat strip** with real, live counts — Matched (ranked total) / Saved / Due soon
  (fixed deadline within 45 days) / Applied (started or submitted). Nothing fabricated.
- **Compact Top-matches rows** — icon tile + name + subtitle (amount · due) + conic match
  ring + chevron. Tapping a row expands the full action card in place (Save, Compare,
  Notes, Checklist, Status, Calendar, Official). No feature is hidden, just one tap away.
- Prominent full-width "Save top 3 to my list" CTA.

## Fixed

- **Horizontal overflow** at narrow widths: `.page-stack` is a CSS grid, and its `auto`
  column grew to a `white-space: nowrap` child's max-content, pushing the page wider than
  the viewport. Pinned the column to `minmax(0, 1fr)` so content clips/ellipses instead.
  (Fixes every page-stack page, not just Matches.)
- Extracted the category glyph + match ring into `cardVisuals` (shared by the full card
  and the compact rows); `ScholarshipCard` gained a `hideLead` prop so the expanded card
  doesn't repeat the row's lead.

## Verification

- `npm run typecheck` → 0 · `npm run qa:hard` → 0 failures · `npm run qa:cases` → 147/0
- No horizontal scroll at 390px (`scrollWidth == clientWidth == 390`)
- Mobile (collapsed + expanded) and desktop screenshots; 0 console errors

## Follow-up

- Live email digest still needs `RESEND_API_KEY` on the Cloudflare Pages project
  (`/api/health` reports `digestEmail:false`).
