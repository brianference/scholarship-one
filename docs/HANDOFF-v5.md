# v5.0.0 handoff — state as of 2026-07-19

Design spec: `docs/superpowers/specs/2026-07-19-v5-fullstack-design.md`
Baseline: v4.0.1 · Target: v5.0.0 · Platform: Cloudflare Pages + Pages Functions + D1

## Done and verified

**Phase 1 backend** (commit `470448c`).

| File | Purpose |
|---|---|
| `migrations/0002_password_auth.sql` | password columns on `users`; `rate_limits`, `contact_messages`, `password_resets` |
| `functions/_lib/password.ts` | PBKDF2-SHA256, 210k iters, constant-time compare |
| `functions/_lib/validate.ts` | Zod schemas for every request body |
| `functions/_lib/ratelimit.ts` | fixed-window limiter in D1 |
| `functions/api/auth/register.ts` | create account, open session |
| `functions/api/auth/login.ts` | verify password, transparent rehash |
| `functions/api/auth/password/reset-request.ts` | email a one-time reset link |
| `functions/api/auth/password/reset.ts` | redeem link, drop all other sessions |
| `functions/api/contact.ts` | persist then notify, honeypot |
| `public/_headers` | HSTS, Permissions-Policy, COOP/CORP, frame-ancestors |

Verification: `npm run test:password` 13/13, `npm run test:auth` 30/30 against
`wrangler pages dev` + local D1. The auth suite needs the dev server running:

```
npm run build
npx wrangler d1 migrations apply scholarship-one-db --local
npx wrangler pages dev dist --port 8788 --local
npm run test:auth
```

Two bugs the tests caught and that are now fixed: the contact honeypot returned
400 (telling a bot what tripped it) instead of a silent success, and the per-IP
rate limit was tight enough that one student fumbling a password on a shared
school or library NAT would lock out everyone behind that address.

## Not started

- **Phase 1 UI** — no register, login, or reset-password screens exist yet. The
  endpoints are live-ready but unreachable from the interface.
- **Phase 2** — Tailwind v4 install and the port of ~35 components off the
  2,272-line `src/styles.css`; sticky header, logo, footer, `<Skeleton>`,
  toasts, `<ConfirmDialog>`.
- **Phase 3** — `/scholarship/:id` detail page (does not exist today),
  breadcrumbs (do not exist today), `/about`, `/terms`, `/privacy`, `/contact`,
  SVG category artwork.
- **Phase 4** — prerender, JSON-LD, sitemap, OG image, mobile audit, `qa:full`,
  release.

## Deployed

`0002` is applied to remote D1 and the app is live. Production verified by
matching asset hash (`index-Cl2WbgYR.js`) and a 7/7 auth smoke test against the
live database. Smoke-test rows were deleted afterwards.

### The production-only bug worth remembering

**The Workers runtime rejects PBKDF2 above 100,000 iterations.** `deriveBits`
throws, surfacing as a bare `error code: 1101`. `wrangler pages dev` accepts
210,000 without complaint, so this was invisible until the code ran on real
Cloudflare infrastructure — every local test passed. `WORKERS_PBKDF2_MAX` and a
unit test now pin the ceiling. If Cloudflare ever raises it, bump
`PBKDF2_ITERATIONS`; the per-row `password_iters` column upgrades every existing
account transparently on next sign-in.

Diagnosis path that worked: contact and reset-request both returned 200, and
they exercise Zod, rate limiting, and D1 — which narrowed the failure to the one
thing register does that they do not.

## Decisions locked with the user

- Full Tailwind v4 migration, not incremental
- Password auth added alongside magic-link, not replacing it
- Opaque session cookies, not JWTs — JWT would cost server-side revocation and
  save nothing, since the request already hits D1 for the user row
- Prerender static routes at build time rather than full SSR
- Abstract SVG artwork only; no photographs of people anywhere
- Operator: individual, US · governing law Arizona · contact to
  brianference@protonmail.com
- Terms age floor: 13+, under 18 with parent or guardian consent

## Notes for whoever picks this up

- `functions/` is outside the app `tsconfig.json`. Typecheck it separately:
  `npx tsc --noEmit --strict --skipLibCheck --module esnext --moduleResolution bundler --target es2022 --lib es2022,dom functions/**/*.ts`
- Pin byte arrays as `Uint8Array<ArrayBuffer>` in crypto code; the default
  `ArrayBufferLike` is not assignable to Web Crypto's `BufferSource`.
- Session cookie stays `SameSite=Lax`, not `Strict`. Strict would break the
  magic-link click-through from an email client.
- This is a Type B (direct upload) Cloudflare project. `git push` does not
  deploy. Deploy and push are separate steps, and prod must be verified by
  matching the built asset hash, not by a wrangler success message.
