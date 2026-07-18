# Email accounts + deadline reminders — design

**Date:** 2026-07-17
**Project:** scholarship-one
**Status:** approved (decisions confirmed), pending spec review

## Goal

Let a user sign in with their email, save scholarships to an account backed by
Supabase, and receive email reminders before each saved award's due date. Today the
app is localStorage-only with no accounts; the existing `digest-send.ts` sends
deadline email but is manual (client supplies email + items each time) and stores
nothing.

## Confirmed decisions

1. **Auth:** magic link (passwordless email OTP). No passwords.
2. **Access model:** optional. Signed out, the app works exactly as today (local
   only). Signing in backs the workspace up to the account, enables reminders, and
   merges existing local saves up (union) on first sign-in.
3. **Sync scope:** full workspace — saved scholarships plus notes, checklist, and
   apply status.
4. **Reminders:** per saved award with a real fixed due date, email 7 days before and
   1 day before. Rolling / cycle / "varies" deadlines are excluded (no real date).
5. **Infra:** reuse the existing Supabase project (`SUPABASE_URL`,
   `SUPABASE_ANON_KEY` for the client; `SUPABASE_SERVICE_ROLE_KEY_TPUSA` for the
   server-side cron). Data is isolated in a new `saved_scholarships` table with RLS.
   The reminder job runs as a daily GitHub Actions cron and sends via Resend.

## Non-goals

- No password auth, no social login.
- No server-side copy of the scholarship catalog — it stays in the app (static, real,
  versioned). Supabase stores only the user's saves.
- No reminders for rolling/varies deadlines (they have no fixed date to count down to).
- No migration of other apps sharing the Supabase project; scholarship-one only adds
  its own table.

## Architecture

```
Browser (React SPA)
  signed out → localStorage only (unchanged behavior)
  signed in  → ScholarshipContext mirrors saves/notes/checklist/status to Supabase
               (debounced writes, hydrate on load, local→account merge on first login)
        │  supabase-js with SUPABASE_ANON_KEY (RLS enforces per-user access)
        ▼
Supabase
  • Auth: magic-link email OTP (email is the identity)
  • Postgres table saved_scholarships, RLS: user_id = auth.uid()
        ▲
        │  service-role key (bypasses RLS), server-side only
GitHub Actions cron (daily, e.g. 13:00 UTC)
  • query rows whose fixed deadline is 7 or 1 days out and not yet reminded at that mark
  • send each user one email via Resend, then append the mark to reminder_sent
```

Three independently testable units:

- **Data layer** — the Supabase schema, RLS policies, and a migration. Testable with
  the anon key (RLS) and service key (cron) directly.
- **Client auth + sync** — a small auth module and the `ScholarshipContext`
  integration. Testable signed-out (unchanged) and signed-in (writes/hydrates/merges).
- **Reminder cron** — a standalone Node script plus a workflow. Testable by running the
  script against seed rows with a dry-run flag.

## Data model

Supabase Auth manages `auth.users` (email is the identity). One new table:

```sql
create table public.saved_scholarships (
  user_id        uuid not null references auth.users (id) on delete cascade,
  scholarship_id text not null,            -- catalog id, e.g. 'pell'
  saved_at       timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  notes          text,
  checklist      text[] not null default '{}',
  apply_status   text not null default 'none',   -- none|interested|applied|submitted
  deadline       text,                    -- snapshot of the catalog deadline string
  reminder_sent  text[] not null default '{}',   -- {'d7','d1'} marks already emailed
  primary key (user_id, scholarship_id)
);

alter table public.saved_scholarships enable row level security;

create policy "own rows" on public.saved_scholarships
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

Notes:

- The catalog `deadline` is snapshotted on save so the cron can compute days-left
  without the client. The cron re-parses it with the same urgency logic the app uses
  (fixed dates only).
- `reminder_sent` makes the cron idempotent: a mark (`d7`, `d1`) is appended after a
  successful send so re-runs never double-email.
- Migration is applied via the Supabase Management API / CLI using
  `SUPABASE_ACCESS_TOKEN`, checked into the repo as `supabase/migrations/`.

## Auth flow (magic link)

- A sign-in entry point in the header/More menu and on the digest/reminders surface:
  "Save to your account" → email field → `supabase.auth.signInWithOtp({ email })`.
- UI shows "Check your inbox". The email link returns to the app; supabase-js
  `detectSessionInUrl` (default on) consumes the token from the URL and establishes the
  session — no custom callback route needed.
- Session persists via supabase-js. A signed-in indicator shows the email + sign out.
- Only the public anon key ships to the client. RLS is the security boundary.

## Client sync

- New `src/lib/supabaseClient.ts` (createClient with url + anon key from Vite env).
- New `src/state/account.ts` (or extend `ScholarshipContext`): tracks session; when
  signed in, wraps the existing save/note/checklist/status mutations to also upsert the
  row, and hydrates the table into context on load.
- **Merge on first sign-in:** union local shortlist/notes/checklist/status with any
  existing account rows (account wins on conflict for a field only if newer by
  `updated_at`; otherwise local fills gaps). Local storage remains as an offline cache.
- Writes are debounced and best-effort: a failed sync never blocks the UI (the app
  still works locally), and surfaces a subtle "not synced" note.

## Reminder cron

- `scripts/send-reminders.mjs` (Node, runs on Actions): uses supabase-js with the
  service-role key to select rows where the fixed deadline is exactly 7 or 1 days out
  and the matching mark is absent from `reminder_sent`. Joins each row to the catalog
  (bundled) for name/amount/url. Groups by user, sends one Resend email per user, then
  appends the mark.
- `.github/workflows/reminders.yml`: `schedule: cron` daily; secrets
  `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `DIGEST_FROM_EMAIL`
  from repo secrets. The local `SUPABASE_SERVICE_ROLE_KEY_TPUSA` value is mirrored into
  the repo secret `SUPABASE_SERVICE_ROLE_KEY` (clean name; same key, same project). Per the project rule, no heredocs in `run:` — the workflow calls
  the script file. Supports `--dry-run` (log, no send, no mark) for verification.
- Idempotent by construction (the `reminder_sent` marks), so a missed or double run is
  safe.

## Security

- RLS is the boundary: the client only ever holds the anon key; every row read/write
  is constrained to `auth.uid()`.
- The service-role key lives only in GitHub Actions secrets and is used only by the
  cron. It is never shipped to the client or committed.
- All secrets are mirrored to GitHub repo secrets (PyNaCl + GitHub API) so Actions can
  read them; nothing secret is added to the repo, Pages build, or client bundle.
- Email addresses are stored by Supabase Auth; `saved_scholarships` holds no PII beyond
  the `user_id` foreign key.

## Prerequisites (operational)

1. Apply the migration to the shared Supabase project (via `SUPABASE_ACCESS_TOKEN`).
2. Confirm the anon key ↔ `SUPABASE_URL` pairing with a functional REST/auth probe
   before building (no secret values printed).
3. Enable email OTP / magic-link in the Supabase project's Auth settings and set the
   site URL / redirect allowlist to include `https://scholarship-one.pages.dev`.
4. Set `RESEND_API_KEY` and a verified `DIGEST_FROM_EMAIL` sender domain.

## Testing

- **Data layer:** insert as user A via anon key, confirm user B cannot read A's rows
  (RLS). Confirm service key can read across users.
- **Client:** signed-out flows unchanged (existing qa:hard / qa:cases stay green);
  signed-in save writes a row; reload hydrates; first sign-in merges local saves.
- **Cron:** seed rows at deadlines 7 and 1 days out; `--dry-run` lists exactly those;
  a real run emails once and sets the mark; a second run sends nothing.

## Rollout (phased)

1. Data layer: migration + RLS + verify pairing.
2. Client auth + sync (behind the existing UI; signed-out unaffected).
3. Reminder cron + workflow, dry-run verified, then live.
4. Deploy, verify prod, release notes, memory.

## Open items

- Sender domain for Resend (needed for deliverability; `onboarding@resend.dev` works
  for testing only).
- Reminder send hour (UTC) — default 13:00 UTC unless specified.
