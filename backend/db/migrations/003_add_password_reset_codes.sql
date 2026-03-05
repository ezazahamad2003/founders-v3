-- Persistent storage for password reset verification codes.
-- Replaces the previous in-memory dict so codes survive server restarts
-- and work correctly across multiple instances.

create table if not exists password_reset_codes (
  id          uuid        primary key default gen_random_uuid(),
  email       text        not null,
  code_hash   text        not null,
  user_id     uuid        not null references profiles(id) on delete cascade,
  attempts    int         not null default 0,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);

-- Lookup by email is the only query pattern needed
create index if not exists idx_password_reset_codes_email on password_reset_codes(email);

comment on table password_reset_codes is
  'Short-lived password reset verification codes. code_hash is SHA-256 of the 6-digit code. '
  'Rows are deleted after successful use or on next request for the same email.';
