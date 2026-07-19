# Scholarship One v5.0.0 — Full-stack upgrade design

Date: 2026-07-19
Status: Approved
Baseline: v4.0.1 (Cloudflare Pages Type B, D1, magic-link auth, hand-written CSS)

## Goal

Take Scholarship One from a client-heavy SPA with magic-link sign-in to a full-stack
application with password accounts, a real scholarship detail page, a premium Tailwind v4
interface, the four required legal/marketing pages, and search-engine-visible HTML.

## Stack decisions and why

| Requested | Runs on Workers? | Decision |
|---|---|---|
| Node.js + Express | No — Workers has no Node HTTP server | Cloudflare Pages Functions (already in place) |
| SQLite + better-sqlite3 | No — native module | Cloudflare D1 (already in place) |
| bcrypt | No — native module | PBKDF2-SHA256 via Web Crypto, 210k iterations |
| jsonwebtoken | No — Node-only | HMAC-SHA256 via Web Crypto, for reset/CSRF tokens only |

### D1 versus better-sqlite3

D1 costs roughly 5–10ms per query round trip where better-sqlite3 is synchronous and
in-process, offers no FTS extension, and caps at 100MB. In exchange it needs no ops, has no
cold start, binds directly into Pages Functions, and never pauses. The workload here is
read-mostly against a static catalog, so the latency does not matter and the operational
properties do.

### Sessions, not JWTs

Sessions remain opaque random ids in httpOnly, SameSite=Strict cookies, looked up in D1.
A JWT would remove server-side revocation and save nothing, because the request already
touches D1 for the user row. Web Crypto HMAC-SHA256 is still used, to sign password-reset
tokens and CSRF double-submit tokens.

### Auth model

Password register/login is added alongside the existing magic-link flow rather than
replacing it. Magic-link then serves two jobs: passwordless sign-in, and the password-reset
delivery channel. No existing account is locked out by the upgrade.

## Operator and legal facts

- Operated by an individual in the United States
- Governing law: Arizona
- Contact destination: contact form -> Brevo -> brianference@protonmail.com
- Age floor: 13+; under 18 requires parent or guardian consent

## Imagery policy

No photographs of people anywhere in the product. Card and detail artwork is a deterministic
SVG gradient plus geometric motif derived from the award's tags, alongside an illustrated
icon set replacing the current emoji glyphs. Real sponsor logos appear only where a public
logo exists. This keeps the no-fabricated-context rule intact: nothing visual implies a
recipient, an endorsement, or an outcome.

## Phase 1 — Auth, API, security

Migration `0002` adds `password_hash`, `password_salt`, `password_iters`, `email_verified`,
and `updated_at` to `users`, and creates `rate_limits` (endpoint + ip window counters) and
`contact_messages`.

`functions/_lib/password.ts` implements PBKDF2-SHA256 at 210,000 iterations with a 16-byte
random salt and constant-time comparison. The iteration count is stored per row so it can be
raised later without invalidating existing hashes.

New endpoints, all Zod-validated: `POST /api/auth/register`, `POST /api/auth/login`,
`POST /api/auth/password/reset-request`, `POST /api/auth/password/reset`. Existing
`/session`, `/signout`, and `/verify` are retained.

Security work: rate limiting on all auth endpoints at 5 attempts per 15 minutes per IP and
per email; double-submit CSRF tokens on state-changing routes; CSP, HSTS, X-Frame-Options,
X-Content-Type-Options, and Referrer-Policy in `public/_headers`; and deliberately generic
login failure text so the endpoint cannot be used to enumerate accounts.

## Phase 2 — Tailwind v4 and design system

Install `@tailwindcss/vite` with a CSS-first `@theme` configuration seeded from the existing
`theme.ts` tokens. Port all components; `styles.css` shrinks from 2,272 lines to a thin
`@theme` block plus a few `@layer` primitives.

The header becomes sticky and scroll-aware, condensing past 80px, carrying an SVG wordmark
logo, with search inline on desktop and collapsing to a sheet on mobile. The footer becomes
four columns — Product, Legal, About, Contact — stacking to one column below 640px.

New shared primitives: `<Skeleton>` for loading states, a toast system for success and error
messaging, and `<ConfirmDialog>` gating every destructive action (unsave, delete note, clear
tracker, delete account). Dialogs portal to `document.body`, because the header's
`backdrop-filter` would otherwise become the containing block for `position: fixed`.

## Phase 3 — Pages, detail view, imagery

New routes: `/scholarship/:id`, `/about`, `/terms`, `/privacy`, `/contact`.

The detail page is new — it does not exist in v4.0.1. It carries full eligibility, deadline,
checklist, notes, the official apply link, and a breadcrumb trail. Breadcrumbs are likewise
new, rendered as Home > Results > award name with schema.org `BreadcrumbList` markup.

Legal pages use plain language and the shared app layout. Privacy covers what is collected
(email, profile answers, saved awards), what is not (no sale of data, no ad networks),
cookies, retention, and deletion rights. Terms cover eligibility, acceptable use, the
no-guarantee-of-award disclaimer, content removal rights, a simple liability cap, and how
changes are announced.

## Phase 4 — SEO, mobile, QA, release

A build-time prerender step using Playwright writes real HTML for `/`, `/about`, `/terms`,
`/privacy`, and `/contact`. Every route gets meta, OG, and Twitter tags; detail pages get
JSON-LD `EducationalOccupationalProgram` and the site gets `Organization`. `sitemap.xml` is
generated from the catalog so every award has an indexable URL, alongside `robots.txt` and
canonical tags. The OG image is produced by screenshotting an HTML card over localhost.

Mobile verification runs at 320, 375, and 768 px, checking text overlap, tap target sizes,
breadcrumb wrapping, and the sidebar. Then the existing `qa:full` suite runs, followed by a
simulated-user pass, fixes, deploy, and the v5.0.0 release with notes.

## Out of scope

Full server-side rendering of every route, payment or premium tiers, admin tooling, and
scholarship data ingestion changes. The catalog stays a static TypeScript module.

## Verification

Each phase is deployed and verified in production before the next begins. Production proof
means the built asset hash on the live origin matching local `dist/`, a real backend
endpoint returning success, and a clean browser console.
