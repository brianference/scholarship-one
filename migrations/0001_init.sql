-- Scholarship One — accounts + saved scholarships (Cloudflare D1 / SQLite)
-- Access control is enforced server-side in Pages Functions (every query is
-- scoped to the session's user_id); the client never touches D1 directly.

create table if not exists users (
  id         text primary key,           -- uuid
  email      text unique not null,
  created_at integer not null            -- epoch ms
);

create table if not exists auth_tokens (  -- one-time magic-link tokens
  token_hash text primary key,            -- sha-256 hex of the emailed token
  user_id    text not null references users(id) on delete cascade,
  expires_at integer not null,            -- epoch ms (~15 min out)
  used_at    integer                      -- epoch ms once redeemed, else null
);

create table if not exists sessions (
  id         text primary key,            -- random id, stored in httpOnly cookie
  user_id    text not null references users(id) on delete cascade,
  created_at integer not null,
  expires_at integer not null
);

create table if not exists saved_scholarships (
  user_id        text not null references users(id) on delete cascade,
  scholarship_id text not null,           -- catalog id, e.g. 'pell'
  saved_at       integer not null,
  updated_at     integer not null,
  notes          text,
  checklist      text,                    -- JSON array of step ids
  apply_status   text not null default 'none',  -- none|interested|applied|submitted
  deadline       text,                    -- snapshot of catalog deadline string
  reminder_sent  text not null default '',      -- csv of marks, e.g. 'd7,d1'
  primary key (user_id, scholarship_id)
);

create index if not exists idx_sessions_user on sessions(user_id);
create index if not exists idx_saved_user on saved_scholarships(user_id);
