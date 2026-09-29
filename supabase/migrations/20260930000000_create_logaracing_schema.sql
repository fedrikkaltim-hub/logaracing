-- LOGARACING game data model.
-- The private credentials table is never exposed through the Data API.
create schema if not exists private;
create extension if not exists pgcrypto with schema extensions;

create table if not exists private.logaracing_teacher_credentials (
  username text primary key,
  password_hash text not null,
  created_at timestamptz not null default now()
);

revoke all on schema private from public, anon, authenticated;
revoke all on private.logaracing_teacher_credentials from public, anon, authenticated;

create table if not exists public.logaracing_sessions (
  id text primary key,
  status text not null default 'lobby' check (status in ('lobby', 'racing', 'finished')),
  started_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.logaracing_players (
  session_id text not null references public.logaracing_sessions(id) on delete cascade,
  player_id text not null,
  name text not null check (char_length(name) between 2 and 22),
  color text not null,
  score integer not null default 0 check (score between 0 and 10),
  answered integer not null default 0 check (answered >= 0),
  ready boolean not null default false,
  finished boolean not null default false,
  last_seen timestamptz not null default now(),
  primary key (session_id, player_id)
);

create index if not exists logaracing_players_last_seen_idx
  on public.logaracing_players (session_id, last_seen desc);

alter table public.logaracing_sessions enable row level security;
alter table public.logaracing_players enable row level security;

-- No anon/authenticated table policies are granted. The Edge Function below is
-- the only writer and uses the service role on the server, so clients cannot
-- forge scores or mutate shared game state through the Data API.

create or replace function public.logaracing_verify_teacher(p_username text, p_password text)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from private.logaracing_teacher_credentials
    where username = p_username
      and password_hash = encode(extensions.digest(p_password, 'sha256'), 'hex')
  );
$$;

revoke execute on function public.logaracing_verify_teacher(text, text) from public;
grant execute on function public.logaracing_verify_teacher(text, text) to anon, authenticated;
