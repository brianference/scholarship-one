-- v5.3.0 -- server-side copy of the profile, a "not interested" list, and a
-- user-chosen remind-to-apply date. Additive only: nothing here alters or drops
-- existing rows, so the migration cannot lose data.

-- One row per account. previous_profile keeps the value that was replaced by the
-- latest write, so a bad overwrite can be recovered from D1 without a backup file.
create table if not exists user_profiles (
  user_id          text primary key references users(id) on delete cascade,
  profile          text not null,          -- JSON {major,state,level,identity,need}
  previous_profile text,
  updated_at       integer not null        -- epoch ms, set by the client edit time
);

-- Awards the student never wants to see in Matches or Results again.
create table if not exists hidden_scholarships (
  user_id        text not null references users(id) on delete cascade,
  scholarship_id text not null,
  hidden_at      integer not null,
  primary key (user_id, scholarship_id)
);

create index if not exists idx_hidden_user on hidden_scholarships(user_id);

-- Remind-to-apply: the date the student picked (YYYY-MM-DD, UTC day). remind_sent_on
-- records which remind_on value was already emailed, so changing the date re-arms it.
alter table saved_scholarships add column remind_on text;
alter table saved_scholarships add column remind_sent_on text;
