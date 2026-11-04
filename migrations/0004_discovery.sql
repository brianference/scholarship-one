-- v5.4.0 -- "Find new scholarships": web finds that passed verification, what each
-- student has already looked at, and when they last tapped the button. Additive only.

-- Awards found on the web. Global (not per user): the same verified award is offered to
-- everyone whose profile fits. Nothing lands here unless its amount, deadline and a
-- description quote were found verbatim on the official page (functions/_lib/finder).
create table if not exists discovered_scholarships (
  id          text primary key,           -- 'web-' + short hash of the normalized official URL
  url         text not null unique,       -- the official page that was read
  name        text not null,
  amount      text not null,
  deadline    text not null,
  summary     text not null,              -- a verbatim quote from the page
  tags        text not null,              -- JSON array, restricted to the catalog tag vocabulary
  added_at    text not null,              -- YYYY-MM-DD, drives "new since your last check"
  verified_at integer not null,           -- epoch ms of the fetch that was checked
  provider    text not null               -- which search provider surfaced it
);

create index if not exists idx_discovered_added on discovered_scholarships(added_at);

-- When the student last tapped "Find new scholarships". Synced so it follows them.
create table if not exists user_find_state (
  user_id          text primary key references users(id) on delete cascade,
  first_checked_at integer not null,      -- epoch ms of the first tap: awards found after this can be New
  checked_at       integer not null       -- epoch ms of the latest tap
);

-- Awards the student has opened, saved or hidden: these lose their New badge.
create table if not exists seen_scholarships (
  user_id        text not null references users(id) on delete cascade,
  scholarship_id text not null,
  seen_at        integer not null,
  primary key (user_id, scholarship_id)
);

create index if not exists idx_seen_user on seen_scholarships(user_id);
