-- v5.0.0 — password accounts, rate limiting, contact messages.
-- Passwords use PBKDF2-SHA256 via Web Crypto (bcrypt is a native Node module and
-- cannot run in the Workers runtime). The iteration count is stored per row so it
-- can be raised later without invalidating existing hashes.

alter table users add column password_hash text;        -- base64 PBKDF2 output, null = passwordless account
alter table users add column password_salt text;        -- base64, 16 random bytes
alter table users add column password_iters integer;    -- PBKDF2 iterations used for this row
alter table users add column email_verified integer not null default 0;
alter table users add column updated_at integer;

-- Fixed-window rate limiting for auth endpoints. Keyed by endpoint + a hashed
-- identifier (IP or email) so no raw address or address-email pair is stored.
create table if not exists rate_limits (
  bucket       text primary key,        -- sha-256 of endpoint|salt|identifier
  window_start integer not null,        -- epoch ms of the current window
  count        integer not null default 0
);

create index if not exists idx_rate_limits_window on rate_limits(window_start);

-- Contact Us submissions. Retained so a Brevo delivery failure never loses a message.
create table if not exists contact_messages (
  id         text primary key,
  name       text not null,
  email      text not null,
  subject    text not null,
  message    text not null,
  user_id    text references users(id) on delete set null,
  created_at integer not null,
  delivered  integer not null default 0
);

create index if not exists idx_contact_created on contact_messages(created_at);

-- Password reset tokens are one-time and separate from magic-link sign-in tokens,
-- so a leaked sign-in link can never be replayed as a password change.
create table if not exists password_resets (
  token_hash text primary key,
  user_id    text not null references users(id) on delete cascade,
  expires_at integer not null,
  used_at    integer
);
