-- Scopic Legal database schema.
-- Run this file inside the Supabase SQL editor or via psql to provision the app tables.

create extension if not exists "pgcrypto";

------------------------------------------------------------
-- profiles
------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  company_name text,
  referral_source text,
  role text default 'client',
  accepted_tos_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_profiles_role on profiles(role);

------------------------------------------------------------
-- conversations
------------------------------------------------------------
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  assigned_lawyer_id uuid references profiles(id) on delete set null,
  title text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_conversations_user_id on conversations(user_id);
create index if not exists idx_conversations_assigned_lawyer_id on conversations(assigned_lawyer_id);
create index if not exists idx_conversations_updated_at on conversations(updated_at desc);

------------------------------------------------------------
-- messages
------------------------------------------------------------
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role text not null,
  content text not null,
  model text,
  metadata jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_messages_conversation_id_created_at
  on messages(conversation_id, created_at asc);

------------------------------------------------------------
-- files
------------------------------------------------------------
create table if not exists files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete cascade,  -- nullable for temp files
  supabase_path text not null,
  mime_type text,
  original_name text,
  created_at timestamptz default now()
);

create index if not exists idx_files_conversation_id on files(conversation_id);
create index if not exists idx_files_user_id on files(user_id);

------------------------------------------------------------
-- message_files
------------------------------------------------------------
create table if not exists message_files (
  message_id uuid references messages(id) on delete cascade,
  file_id uuid references files(id) on delete cascade,
  primary key (message_id, file_id)
);

