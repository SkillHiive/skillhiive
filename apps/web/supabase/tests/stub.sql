-- Minimal stand-ins for what Supabase and the unversioned base schema provide.
-- Roles belong to the whole server, so a second test database must not recreate them.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
create schema auth;
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create function auth.role() returns text language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.role', true), '') $$;
grant usage on schema auth to anon, authenticated, service_role;

create table public.profiles (id uuid primary key, username text unique);
create table public.today_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  description text,
  color text,
  created_at timestamptz not null default now()
);
create table public.focus_sessions (id uuid primary key default gen_random_uuid(), project_id uuid, duration_seconds int);
create table public.session_notes (id uuid primary key default gen_random_uuid(), project_id uuid, ritual_type text);

-- Supabase grants table access to the API roles and leaves filtering to RLS.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
