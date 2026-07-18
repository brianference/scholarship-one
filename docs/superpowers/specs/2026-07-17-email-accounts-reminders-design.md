# Email accounts + deadline reminders — design

**Date:** 2026-07-17
**Project:** scholarship-one
**Status:** approved direction (Cloudflare D1 stack), pending spec review

## Goal

Let a user sign in with their email, save scholarships to an account, and receive
email reminders before each saved award's due date. Today the app is localStorage-only
with no accounts.

## Stack decision — Cloudflare D1 (not Supabase)

Supabase free tier pauses projects after ~7 days of inactivity (the env's `swordtruth`
project was found paused). A new Supabase project would do the same. So the backend
moves to **Cloudflare D1**, which the app's existing Cloudflare Pages deployment
supports natively:

- **D1** (edge SQLite) never pauses; free tier is 5M row-reads/day, 100k writes/day,
  5GB — far beyond a portfolio app's needs. It binds directly to Pages Functions.
- **Auth** is a custom magic-link flow implemented in Pages Functions + D1 (no
  third-party auth service, nothing that can pause).
- **Email** (the only external dependency) is sent via **Brevo** (300/day free, no card,
  no domain — verify a single sender address). Resend is a drop-in alternative if a
  domain is added later; the send call is isolated behind one module.

## Confirmed decisions

1. **Auth:** magic link (passwordless), custom, in Pages Functions. Email is the identity.
2. **Access model:** optional. Signed out, the app works exactly as today (local only).
   Signing in backs the workspace up, enables reminders, and merges local saves up on
   first sign-in.
3. **Sync scope:** full workspace — saved scholarships plus notes, checklist, apply status.
4. **Reminders:** per saved award with a real fixed due date, email 7 days before and
   1 day before. Rolling / cycle / "varies" deadlines are excluded.
5. **Infra:** Cloudflare D1 (database) + Pages Functions (auth + API) + Brevo (email) +
   a daily GitHub Actions cron for reminders.

## Non-goals

- No passwords, no social login.
- No server-side copy of the scholarship catalog — it stays in the app (static, real,
  versioned). D1 stores only the user's saves.
- No reminders for rolling/varies deadlines (no fixed date).
- No Supabase.

## Architecture

```
Browser (React SPA, localStorage as today)
  signed out → local only (unchanged)
  signed in  → calls /api/* Functions with a session cookie; mirrors saves/notes/
               checklist/status; hydrates on load; merges local saves on first login
        │  fetch() to same-origin Pages Functions
        ▼
Cloudflare Pages Functions  (functions/api/*)
  • auth/request  → create user if new, mint one-time token, email magic link (Brevo)
  • auth/verify   → validate token, set httpOnly session cookie
  • auth/session, auth/signout
  • saves (GET/PUT/DELETE) → read/write the signed-in user's rows
        │  D1 binding (env.DB)
        ▼
Cloudflare D1 (SQLite): users, auth_tokens, sessions, saved_scholarships
        ▲
        │  D1 HTTP API (account id + D1 token), server-side only
GitHub Actions cron (daily)
  • query saves whose fixed deadline is 7 or 1 days out and not yet reminded
  • send one Brevo email per user, then record the mark
```

Three independently testable units: **data + Functions API** (auth and saves), **client
auth + sync**, and **the reminder cron**.

## Data model (D1 / SQLite)

```sql
create table users (
  id         text primary key,          -- uuid
  email      text unique not null,
  created_at integer not null           -- epoch ms
);

create table auth_tokens (               -- one-time magic-link tokens
  token_hash text primary key,           -- sha-256 of the emailed token
  user_id    text not null references users(id) on delete cascade,
  expires_at integer not null,           -- ~15 min
  used_at    integer
);

create table sessions (
  id         text primary key,           -- random; stored in httpOnly cookie
  user_id    text not null references users(id) on delete cascade,
  expires_at integer not null
);

create table saved_scholarships (
  user_id        text not null references users(id) on delete cascade,
  scholarship_id text not null,          -- catalog id, e.g. 'pell'
  saved_at       integer not null,
  updated_at     integer not null,
  notes          text,
  checklist      text,                   -- JSON array of step ids
  apply_status   text not null default 'none',
  deadline       text,                   -- snapshot of catalog deadline string
  reminder_sent  text not null default '',  -- csv of marks: 'd7,d1'
  primary key (user_id, scholarship_id)
);
```

Access control is enforced **server-side in Functions** (every query is scoped to the
session's `user_id`) — the SQLite equivalent of Supabase RLS, but in our code. The
client never talks to D1 directly and holds no database credential.

The catalog `deadline` is snapshotted per row so the cron computes days-left without the
client. `reminder_sent` marks (`d7`, `d1`) make the cron idempotent.

## Auth flow (custom magic link)

1. `POST /api/auth/request { email }` → upsert user, generate a random token, store its
   sha-256 hash with a ~15-minute expiry, email the link
   `https://scholarship-one.pages.dev/auth?token=…` via Brevo. Always responds 200
   ("check your inbox") so it can't be used to probe which emails exist.
2. The app's `/auth` route calls `POST /api/auth/verify { token }` → if the hash matches
   an unused, unexpired token, mark it used, create a session, set an httpOnly, Secure,
   SameSite=Lax cookie, and redirect to `/matches`.
3. `GET /api/auth/session` returns the current email (or null); `POST /api/auth/signout`
   clears the session. Rate-limit `auth/request` per email + IP (reuse the existing
   `RATE_LIMIT_SALT` pattern).

## Client sync

- `src/lib/api.ts` — thin fetch wrapper for the `/api/*` endpoints (credentials: include).
- `src/state/account.ts` — tracks session (email); on sign-in, hydrates saves from
  `GET /api/saves` and, going forward, mirrors each save/note/checklist/status mutation
  from `ScholarshipContext` via debounced `PUT /api/saves`. Signed out, behavior is
  exactly as today (localStorage only).
- **Merge on first sign-in:** union local shortlist/notes/checklist/status with any
  account rows; newer `updated_at` wins per field, otherwise local fills gaps. Local
  storage stays as an offline cache.
- Failures never block the UI; a subtle "not synced" note appears and it retries.

## Reminder cron

- `scripts/send-reminders.mjs` (Node, on Actions): queries D1 over its HTTP API (account
  id + a D1 API token) for saves whose snapshotted fixed deadline is exactly 7 or 1 days
  out and whose `reminder_sent` lacks that mark. Joins to the bundled catalog for
  name/amount/url, groups by user (email from `users`), sends one Brevo email per user,
  then appends the mark. `--dry-run` logs without sending or marking.
- `.github/workflows/reminders.yml`: `schedule: cron` daily; secrets `CF_ACCOUNT_ID`,
  `D1_DATABASE_ID`, `CLOUDFLARE_API_TOKEN` (D1 read/write), `BREVO_API_KEY`,
  `DIGEST_FROM_EMAIL`. No heredocs in `run:` — it calls the script file.
- Idempotent by the `reminder_sent` marks; a missed or double run is safe.

## Security

- Sessions are httpOnly + Secure + SameSite=Lax cookies; tokens are single-use, hashed
  at rest, short-lived. Every data query is scoped to the session's `user_id` in Function
  code — the client cannot reach another user's rows.
- The client bundle holds no secrets. D1 is reachable only through Functions (server) and
  the cron (server). The D1/CF and Brevo credentials live only in Pages/Actions env +
  GitHub repo secrets, mirrored via PyNaCl.
- `saved_scholarships` holds no PII beyond the `user_id` link; `users` holds the email.

## Prerequisites

**The one thing needed from you:** a **Brevo** API key (free account, verify one sender
email — no card, no domain) plus the sender address for `DIGEST_FROM_EMAIL`. This gates
actual email delivery (magic links + reminders) only.

Everything else I provision myself with the existing Cloudflare token: create the D1
database, apply the schema, bind it to Pages, deploy the Functions, and add the cron.
Until the Brevo key lands, email is stubbed (dev logs the magic link; reminders dry-run),
so the whole feature can be built and tested first.

## Testing

- **Auth/data:** request → verify sets a session; a second use of the same token fails;
  a user cannot read another user's saves (server scope check).
- **Client:** signed-out flows unchanged (qa:hard / qa:cases stay green); signed-in save
  persists; reload hydrates; first sign-in merges local saves.
- **Cron:** seed rows at 7 and 1 days out; `--dry-run` lists exactly those; a real run
  emails once and sets the mark; a re-run sends nothing.

## Rollout (phased)

1. D1 database + schema + binding; Functions for auth + saves; stubbed email.
2. Client auth + sync (signed-out unaffected).
3. Reminder cron + workflow, dry-run verified.
4. Add Brevo key → turn on real email → verify end to end → deploy, release, memory.

## Open items

- Brevo API key + verified sender address (only blocker to live email).
- Daily reminder send hour (UTC); default 13:00 UTC.
