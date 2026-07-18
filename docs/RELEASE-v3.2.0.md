# Scholarship One v3.2.0 — "Email accounts + deadline reminders"

**Released:** 2026-07-18
**Live:** https://scholarship-one.pages.dev

Optional email accounts: sign in with your email, and your saved scholarships (plus
notes, checklist, and application status) sync across devices and trigger email
reminders before due dates. Signed out, the app is exactly as before — local only.

## Stack

- **Cloudflare D1** for the database — never pauses, native to the Pages Functions the
  app already deploys. (Supabase was rejected because its free tier pauses after ~7 days.)
- **Custom magic-link auth** in Pages Functions — no passwords, no third-party auth
  service. Single-use hashed tokens, httpOnly session cookies, server-side access control.
- **Brevo** for transactional email (300/day free) — magic links and reminders.

## What shipped

- `functions/api/auth/{request,verify,session,signout}` and `functions/api/saves`
  (GET list / POST bulk-upsert for sync+merge / DELETE), all scoped to the session user.
- Client: `accountApi`, `AccountProvider`, `AccountSync` (merge-on-login + debounced
  mirror incl. deletions), `SignInModal`, `AccountButton`, `/auth` callback.
- Reminder cron: `scripts/send-reminders.ts` + `reminderSelect.ts` (7d/1d fixed
  deadlines, unit-tested) + `.github/workflows/reminders.yml` (daily 13:00 UTC).
- Feature flag: the sign-in UI is hidden until email delivery is configured server-side,
  so the D1 infrastructure could deploy before the email key landed.

## Verification (production)

- Real magic-link email delivered via Brevo from the live Function.
- `/api/auth/session` → `enabled:true`; "Sign in" button visible; 0 console errors.
- Reminder dry-run against live D1 correctly selected a 7-day and a 1-day award.
- Access control (401 without cookie), single-use tokens (replay → 400), local→account
  merge, debounced mirror — all confirmed. typecheck 0 · qa:hard 0 · qa:cases 147/0.

## Notes

- Free-tier reminder email carries a small "Sent with Brevo" footer.
- To use accounts, Brevo's IP restriction must stay off (serverless senders — Cloudflare
  edge + GitHub Actions — have no fixed IP to allowlist).
