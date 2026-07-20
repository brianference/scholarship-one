# Changelog

## 5.0.0 — 2026-07-19 — "Full stack"

Major release. Password accounts, a scholarship detail page, the four required
legal and marketing pages, prerendered HTML for search engines, and a mobile
legibility fix reported from a real phone. Full notes: `docs/RELEASE-v5.0.0.md`.

### Added

- **Password accounts** — register and sign in with PBKDF2-SHA256 via Web Crypto
  (bcrypt and jsonwebtoken are native Node modules and cannot run on Workers).
  Magic-link sign-in is retained and doubles as the password-reset channel, so no
  existing account is locked out.
- **Scholarship detail page** at `/scholarship/:id` — eligibility, deadline,
  checklist, notes, official apply link, breadcrumbs, and JSON-LD. Did not exist
  before this release.
- **Breadcrumbs**, with schema.org `BreadcrumbList` markup.
- **About Us, Terms and Conditions, Privacy Policy, Contact Us** in plain
  language. 13+ age floor, guardian consent under 18, Arizona governing law.
- **Confirmation dialogs on every destructive action**, focused on Cancel so a
  stray Enter cannot destroy data. Toasts on save and remove. Skeletons during
  genuinely async work.
- **Generated SVG artwork** per award, derived from its tags. No photography:
  a photo beside a specific award implies a recipient we cannot stand behind.
- **Tailwind v4**, layered so components can be ported one at a time.
- **Sticky header with an SVG wordmark**, and a four-column footer.
- **Search-engine visibility** — prerendered HTML for the content routes,
  per-route metadata, a 217-URL sitemap generated from the catalog, robots.txt,
  an OG card, and a real 404 page.
- **Rate limiting** in D1, with a deliberately loose per-IP cap so shared school
  and library networks do not lock each other out.
- **Nine QA suites, 325 checks**, runnable against production with `BASE=`.

### Fixed

- **Passwords could not be created in production.** Workers rejects PBKDF2 above
  100,000 iterations; `wrangler pages dev` accepts more, so 210,000 passed every
  local test and returned a bare 1101 live.
- **Invisible text**, twice: `.btn-primary` lost to unlayered legacy CSS inside a
  cascade layer, and `text-[var(--font-size)]` was read by Tailwind as a *colour*,
  emitting invalid CSS and dropping the real text colour in 45 places.
- **Content read through the header and chat dock on mobile.** Both were 78%
  transparent and depended on `backdrop-filter`, which minification had stripped.
  Overlay surfaces are now opaque; legibility no longer depends on an effect that
  Brave disables and mobile browsers drop under reduced-transparency.
- **Scrolling janked on the results list** — all 209 cards carried a blur.
- **The onboarding modal covered the legal pages** on a first visit.
- **WCAG AA contrast failures** in the palette: the accent was 2.98:1 for white
  text on it and 3.98:1 as link text.
- **The health endpoint reported email as unconfigured** while it worked, probing
  a leftover key from a previous provider — and CI used it as a deploy check.
- **Successful sign-ins consumed rate-limit budget**, so signing in across
  several devices could lock you out of your own account.

### Upgrade notes

Apply `migrations/0002_password_auth.sql` before deploying; it is additive.
Deploy with `npm run build:prod` — the plain build does not generate the
sitemap, robots.txt, OG image, or prerendered HTML.

## 4.0.1 — 2026-07-18

### Fixed

- **Match ordering** — Matches now sort strictly by displayed match score (90 → 78 …).
  Previously ordered by a composite key (score + urgency/major boosts), so the shown
  numbers weren't monotonic. Results was already score-descending.
- **Sign-in modal** — was clipped at the top and semi-transparent because it rendered
  inside the backdrop-filtered top bar, which traps `position: fixed`. Now portaled to
  `document.body`: solid card, centered, full-screen dimmed backdrop. Reframed as
  "Create your account" (magic link creates or signs in) with a check-your-spam note.
- **Create-account prompt** — after saving a scholarship while signed out, a dismissible
  banner invites you to create a free account to sync and get reminders.

## 4.0.0 — 2026-07-18 — "Accounts milestone"

Major release. Promotes the email-accounts work (shipped as 3.2.0) to the 4.0
milestone: Scholarship One goes from a local-only tool to an optional-account product
with cross-device sync and deadline reminders, on a serverless Cloudflare stack.

Headline capabilities in 4.0:

- **Email magic-link accounts** — passwordless sign-in; single-use hashed tokens;
  httpOnly sessions; server-side access control.
- **Cross-device workspace sync** — saved scholarships + notes + checklist + status
  persist to Cloudflare D1; local saves merge up on first sign-in. Signed out is
  unchanged (localStorage only).
- **Deadline reminder emails** — daily GitHub Actions cron emails 7 days and 1 day
  before a saved award's fixed due date, idempotent per row.
- Built on the **Linen Focus** UI (3.0–3.1): serif Matches page, match-score rings,
  bottom tab bar, segmented sort.

Stack: Cloudflare D1 (no Supabase — it pauses) + custom auth in Pages Functions +
Brevo email. See docs/RELEASE-v4.0.0.md.

Verified in production: magic-link delivery, sign-in live, reminder dry-run selecting
7d/1d correctly, access control, single-use tokens, merge + mirror; typecheck 0,
qa:hard 0, qa:cases 147/0, 0 console errors, CI green.

## 3.2.0 — 2026-07-18 — "Email accounts + deadline reminders"

Optional email accounts so saved scholarships sync across devices and users get
reminder emails before due dates. Backend is **Cloudflare D1** (not Supabase — its
free tier pauses); email is **Brevo**.

### Added

- **Magic-link accounts** — sign in with email, no password. One-click link; single-use
  hashed tokens; httpOnly session cookie. `functions/api/auth/{request,verify,session,signout}`.
- **Workspace sync** — signed in, saved scholarships plus notes, checklist, and status
  mirror to D1 (debounced), merge local saves up on first sign-in, and hydrate on load.
  `functions/api/saves` (session-scoped; server-side access control). Signed out is
  unchanged (localStorage only).
- **Deadline reminders** — a daily GitHub Actions cron emails each user 7 days and 1 day
  before a saved award's fixed deadline (rolling/varies excluded), idempotent via
  per-row marks. `scripts/send-reminders.ts` + `reminderSelect.ts` (unit-tested).
- Sign-in modal + account menu in the top bar; `/auth` callback route.
- Feature flag: the account UI stays hidden until email delivery is configured, so the
  infra can ship before the email key.

### Infrastructure

- Cloudflare D1 database `scholarship-one-db` + `wrangler.toml` binding + migration.
- Brevo for transactional email (magic links + reminders); secrets set on Pages and
  mirrored to GitHub Actions.

### Verified

- Prod: magic-link email sends; sign-in button live; `/api/auth/session` enabled:true.
- Reminder dry-run against live D1 selected 7d + 1d awards correctly.
- Access control (401 without session), single-use tokens (replay 400), merge + mirror,
  reminder date math (9/9). typecheck 0, qa:hard 0, qa:cases 147/0, 0 console errors.

## 3.1.0 — 2026-07-16 — "Linen Focus: Matches"

Rebuilds the Matches page to match the Linen Focus mockup (the 3.0.0 release applied
the card/tab-bar patch but left the page scaffolding on the old verbose layout).

### Matches page

- **Serif display title** + subtitle count ("N real programs ranked for your profile").
- **Segmented sort** at the top — Best fit / Deadline / Amount (amount uses a
  best-effort numeric rank; "full ride"/varies handled).
- **4-up stat strip** with real counts: Matched (ranked) / Saved / Due soon (fixed
  deadline ≤45d) / Applied (started or submitted). No fabricated numbers.
- **Compact Top-matches rows** — icon tile + name + subtitle (amount · due) + match
  ring + chevron — that expand in place to the full action card (Save / Compare /
  Notes / Checklist / Status / Calendar / Official). Nothing hidden, one tap away.
- Prominent full-width "Save top 3 to my list" CTA.

### Fixed

- Horizontal overflow on narrow screens: `.page-stack` is a grid, and its `auto`
  column expanded to a `nowrap` child's max-content. Pinned the column to
  `minmax(0, 1fr)` so content clips/ellipses instead of widening the page.
- Extracted the icon glyph + match ring into `cardVisuals` (shared by the full card
  and the compact rows) to avoid duplication; `ScholarshipCard` gained a `hideLead`
  prop so the expanded card doesn't repeat the row's tile/title/ring.

Verified: typecheck 0, qa:hard 0 fail, qa:cases 147/0, no horizontal scroll at 390px,
mobile + desktop screenshots, 0 console errors.

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
