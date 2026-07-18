# Scholarship One v4.0.0 — "Accounts milestone"

**Released:** 2026-07-18
**Live:** https://scholarship-one.pages.dev

Major release. Scholarship One goes from a local-only tool to an optional-account
product: sign in with your email and your saved scholarships (plus notes, checklist,
and status) sync across devices and trigger email reminders before due dates. Signed
out, the app behaves exactly as before.

## Highlights

- **Email magic-link accounts** — passwordless sign-in. Single-use hashed tokens,
  httpOnly session cookies, server-side access control.
- **Cross-device sync** — saved scholarships and their notes/checklist/status persist
  to Cloudflare D1; local saves merge up on first sign-in; hydrate on load.
- **Deadline reminders** — a daily job emails you 7 days and 1 day before a saved
  award's fixed due date (rolling/varies excluded), idempotent so it never repeats.
- On the **Linen Focus** UI from 3.0–3.1: serif Matches page, match-score ring cards,
  bottom tab bar, segmented sort, compact expandable rows.

## Stack

- **Cloudflare D1** database — never pauses, native to the Pages Functions the app
  already deploys. (Supabase was rejected: its free tier pauses after ~7 days.)
- **Custom magic-link auth** in Pages Functions — no third-party auth service.
- **Brevo** for transactional email (magic links + reminders).

## Verified in production

- Real magic-link email delivered from the live Function via Brevo.
- `/api/auth/session` → `enabled:true`; the "Sign in" control is live; 0 console errors.
- Reminder dry-run against live D1 correctly selected a 7-day and a 1-day award; the
  scheduled GitHub Actions workflow runs green.
- Access control (401 without session), single-use tokens (replay → 400), local→account
  merge, debounced mirror. typecheck 0 · qa:hard 0 · qa:cases 147/0.

## Operational notes

- Brevo's "Authorized IPs" must stay off — serverless senders (Cloudflare edge + GitHub
  Actions) have no fixed IP to allowlist.
- Free-tier reminder email carries a small "Sent with Brevo" footer.
- Version history: the same feature set shipped as 3.2.0 earlier the same day; 4.0.0 is
  the major-version cut of that milestone. No code changed between them.
