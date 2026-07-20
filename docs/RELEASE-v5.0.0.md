# Scholarship One v5.0.0

Released 2026-07-19 · https://scholarship-one.pages.dev

A full-stack release: password accounts, a scholarship detail page, the four
required legal and marketing pages, search-engine-visible HTML, and a
mobile-legibility fix reported from a real phone.

Everything runs on Cloudflare Pages Functions and D1. `bcrypt` and
`jsonwebtoken` are native Node modules and cannot load in the Workers runtime,
so authentication is built on Web Crypto instead.

## Accounts

Password register and sign-in using PBKDF2-SHA256 with a random per-account
salt and a per-row iteration count, so the cost can be raised later without
invalidating existing hashes.

Magic-link sign-in is retained rather than replaced. It now serves two jobs —
passwordless sign-in, and the password-reset delivery channel — so no v4 account
is locked out, and an existing passwordless account can adopt a password.

Sessions stay as opaque, httpOnly, SameSite=Lax cookies rather than JWTs. A JWT
would remove server-side revocation and save nothing, because the request
already reads the user row from D1. `SameSite=Strict` would break magic-link
click-through from an email client.

Login failures return one generic message, so the endpoint cannot be used to
discover which email addresses have accounts.

## Scholarship detail page

`/scholarship/:id` did not exist before this release. It carries full
eligibility, the deadline with an urgency tone, the application checklist,
private notes, the official apply link, and a breadcrumb trail. Unknown or stale
ids render an explanation with a route out rather than crashing, because people
bookmark and share links to awards that later get removed.

Breadcrumbs are also new, with schema.org `BreadcrumbList` markup.

## Interface

Tailwind v4, introduced alongside the existing stylesheet through an explicit
cascade layer order (`legacy < components < utilities`) so components can be
converted one at a time. Sticky scroll-aware header with an SVG wordmark, and a
four-column footer that collapses to one on phones.

Every destructive action is now gated by a confirmation dialog — unsaving,
clearing a note, restoring a backup — with focus starting on Cancel so a stray
Enter cannot destroy data. Toasts confirm saves and removals. Skeletons hold
layout during genuinely async work.

Card and detail artwork is generated SVG derived from each award's tags, not
photography. A photograph beside a specific award implies a recipient or an
endorsement that cannot be stood behind.

## Pages

About Us, Terms and Conditions, Privacy Policy, and Contact Us, in plain
language. Terms cover eligibility (13+, under 18 with guardian consent),
acceptable use, content removal, a liability cap, and how changes are announced.
Privacy covers what is collected, what is not, cookies, retention, and deletion.
Operated by an individual in the United States; governing law Arizona.

## Search engines

Build-time prerendering gives `/`, `/about`, `/terms`, `/privacy` and `/contact`
real HTML, so crawlers that do not execute JavaScript still see content. Every
route has a unique title, description and canonical. `sitemap.xml` is generated
from the catalog (217 URLs) so it cannot go stale. Per-user and auth routes are
`noindex`. Dead URLs now serve a real 404 instead of redirecting to the
homepage, which had made every one a soft 404.

## Accessibility

The palette failed WCAG AA before this release. The accent was 2.98:1 for white
text on it and 3.98:1 as link text; it is now 4.91 and 4.57 at the same hue. A
new `--accent-on` token carries a readable foreground per theme, because in dark
mode the accent is light enough that white on it fails.

## Security

Rate limiting in D1: five attempts per account per 15 minutes, sixty per IP. The
per-IP limit is deliberately loose — students share NAT on school and library
networks, and a tight cap would let one person lock out everyone behind the same
address. A successful sign-in clears the counter, so signing in across several
devices never counts toward a lockout.

Zod validation on every request body, a honeypot on the contact form that
accepts and discards rather than rejecting, and HSTS, CSP with
`frame-ancestors 'none'`, Permissions-Policy, COOP and CORP headers.

## Fixed

**Passwords could not be created in production.** The Workers runtime rejects
PBKDF2 above 100,000 iterations; `wrangler pages dev` accepts more, so a
210,000-iteration setting passed every local test and returned a bare 1101 in
production.

**Text was invisible in two places.** `.btn-primary` moved into a cascade layer
where unlayered legacy CSS overrode it, and separately
`text-[var(--font-size)]` was read by Tailwind as a *colour* — emitting invalid
CSS and silently dropping the real text colour in 45 places across 15 files.

**Content read through the header and chat dock on mobile.** Both surfaces were
78% transparent and depended on `backdrop-filter` to hide what was behind them;
minification had dropped the unprefixed property. Overlay surfaces are now
opaque, because legibility must not depend on an effect that Brave disables
under fingerprinting protection and that mobile browsers drop under
reduced-transparency mode.

**Scrolling janked on the results list.** Each of the 209 cards carried a
`backdrop-filter` blur.

**The onboarding modal covered the legal pages**, so a first-time visitor
clicking "Privacy Policy" got a matching wizard on top of the policy.

**The health endpoint reported email as unconfigured** while it was working; it
probed a leftover key from a previous provider, and CI treated it as a
post-deploy check.

## Verification

325 checks across nine suites, run against production as well as locally:
password 16, auth E2E 32, auth UI 23, pages 39, chrome 29, detail 35, SEO 85,
contrast 40, overlay 26.

Run them with `npm run qa:v5` against `wrangler pages dev`, or set
`BASE=https://scholarship-one.pages.dev` to run against production.

## Upgrade notes

Apply migration `0002_password_auth.sql` before deploying. It is additive —
new columns and three new tables, no drops.

Deploy with `npm run build:prod`, not `npm run build`. The plain build does not
generate the sitemap, robots.txt, OG image, or prerendered HTML.
