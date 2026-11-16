-- SkillHive — Cue device sync
--
-- NON-DESTRUCTIVE: adds tables, columns, policies and RPCs. The one change to
-- existing behaviour is that reaggregate_tracker_time becomes a dispatcher:
-- the original body is kept as reaggregate_tracker_time_impl and still runs
-- for every user whose coding-time source is 'tracker' (the default).
--
-- Model:
--   1. cue_devices            — one row per linked Cue install; holds its public key
--   2. cue_links              — short-lived link codes (device flow)
--   3. cue_projects           — projects the user chose to name, per device
--   4. cue_project_days       — seconds per device, project and day
--   5. coding_time_settings   — which source feeds the profile: 'tracker' or 'cue'
--
-- What a device sends is daily totals only. The project key 'private' is the
-- single bucket for everything the user did not publish; it has no name.
--
-- Writes to cue_* tables happen through the cue-sync edge function (service
-- role) after it has verified the device signature, or through the RPCs below.

-- ---------------------------------------------------------------------------
-- 1. Devices
-- ---------------------------------------------------------------------------
create table if not exists public.cue_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  platform text not null default '',
  public_key text not null,          -- Ed25519, raw 32 bytes, base64
  created_at timestamptz not null default now(),
  last_seen_at timestamptz,
  revoked_at timestamptz
);

create index if not exists idx_cue_devices_user on public.cue_devices (user_id);

-- A device may sign at most N requests per window; the edge function calls
-- cue_device_allow after it has verified the signature, so an unsigned caller
-- cannot spend someone else's budget.
alter table public.cue_devices
  add column if not exists window_started_at timestamptz,
  add column if not exists window_count integer not null default 0;

alter table public.cue_devices enable row level security;

drop policy if exists "cue_devices owner read" on public.cue_devices;
create policy "cue_devices owner read" on public.cue_devices
  for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 2. Link codes — no policies: only the service role and definer RPCs touch it
-- ---------------------------------------------------------------------------
create table if not exists public.cue_links (
  id uuid primary key default gen_random_uuid(),
  user_code_hash text not null unique,   -- sha256 hex of the code shown to the user
  public_key text not null,
  device_name text not null,
  platform text not null default '',
  ip_hash text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  approved_by uuid references public.profiles (id) on delete cascade,
  approved_at timestamptz,
  device_id uuid references public.cue_devices (id) on delete set null
);

create index if not exists idx_cue_links_ip on public.cue_links (ip_hash, created_at);

alter table public.cue_links enable row level security;

-- ---------------------------------------------------------------------------
-- 3. Published projects
-- ---------------------------------------------------------------------------
create table if not exists public.cue_projects (
  user_id uuid not null references public.profiles (id) on delete cascade,
  device_id uuid not null references public.cue_devices (id) on delete cascade,
  project_key text not null check (project_key ~ '^p_[0-9a-f]{16}$'),
  name text not null,
  remote text,
  today_project_id uuid references public.today_projects (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (device_id, project_key)
);

create index if not exists idx_cue_projects_user on public.cue_projects (user_id);

alter table public.cue_projects enable row level security;

drop policy if exists "cue_projects owner read" on public.cue_projects;
create policy "cue_projects owner read" on public.cue_projects
  for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 4. Daily totals
-- ---------------------------------------------------------------------------
create table if not exists public.cue_project_days (
  user_id uuid not null references public.profiles (id) on delete cascade,
  device_id uuid not null references public.cue_devices (id) on delete cascade,
  project_key text not null check (project_key = 'private' or project_key ~ '^p_[0-9a-f]{16}$'),
  date date not null,
  seconds integer not null check (seconds between 0 and 86400),
  agent_seconds integer not null default 0 check (agent_seconds >= 0 and agent_seconds <= seconds),
  sources jsonb not null default '{}'::jsonb,     -- {shell, fs, agent, git} seconds
  languages jsonb not null default '[]'::jsonb,   -- [{name, seconds}]
  commits integer not null default 0 check (commits >= 0),
  updated_at timestamptz not null default now(),
  primary key (device_id, project_key, date)
);

create index if not exists idx_cue_days_user_date on public.cue_project_days (user_id, date);

alter table public.cue_project_days enable row level security;

drop policy if exists "cue_project_days owner read" on public.cue_project_days;
create policy "cue_project_days owner read" on public.cue_project_days
  for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 5. Which source feeds the profile
-- ---------------------------------------------------------------------------
create table if not exists public.coding_time_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  source text not null default 'tracker' check (source in ('tracker', 'cue')),
  updated_at timestamptz not null default now()
);

alter table public.coding_time_settings enable row level security;

drop policy if exists "coding_time_settings owner read" on public.coding_time_settings;
create policy "coding_time_settings owner read" on public.coding_time_settings
  for select using (auth.uid() = user_id);

-- Aggregates learn where they came from and how much involved an agent.
alter table public.user_coding_stats
  add column if not exists agent_seconds bigint not null default 0,
  add column if not exists source text not null default 'tracker',
  -- When the source is cue and older days were carried over from a tracker,
  -- the first day that comes from Cue. Null otherwise.
  add column if not exists cue_since date;

alter table public.project_coding_time
  add column if not exists agent_seconds bigint not null default 0,
  add column if not exists source text not null default 'tracker';

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.cue_code_hash(p_code text)
returns text
language sql
immutable
as $$
  select encode(sha256(convert_to(upper(trim(p_code)), 'UTF8')), 'hex');
$$;

create or replace function public.coding_time_source_of(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select s.source from public.coding_time_settings s where s.user_id = p_user_id),
    'tracker'
  );
$$;

-- ---------------------------------------------------------------------------
-- Linking — the signed-in user approves the code their terminal printed
-- ---------------------------------------------------------------------------
create or replace function public.peek_cue_link(p_code text)
returns table (device_name text, platform text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  return query
    select l.device_name, l.platform, l.expires_at
    from public.cue_links l
    where l.user_code_hash = public.cue_code_hash(p_code)
      and l.approved_at is null
      and l.expires_at > now();
end;
$$;

create or replace function public.approve_cue_link(p_code text)
returns table (device_id uuid, device_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_link public.cue_links%rowtype;
  v_device uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_link
  from public.cue_links l
  where l.user_code_hash = public.cue_code_hash(p_code)
  for update;

  if not found or v_link.expires_at <= now() then
    raise exception 'link_expired';
  end if;
  if v_link.approved_at is not null then
    raise exception 'link_used';
  end if;

  insert into public.cue_devices (user_id, name, platform, public_key)
  values (v_uid, v_link.device_name, v_link.platform, v_link.public_key)
  returning id into v_device;

  update public.cue_links
  set approved_by = v_uid, approved_at = now(), device_id = v_device
  where id = v_link.id;

  -- A user with no tracker connection starts on Cue; everyone else keeps
  -- their current source until they switch it themselves.
  insert into public.coding_time_settings (user_id, source)
  select v_uid,
         case when exists (select 1 from public.time_tracker_connections c where c.user_id = v_uid)
              then 'tracker' else 'cue' end
  on conflict (user_id) do nothing;

  return query select v_device, v_link.device_name;
end;
$$;

create or replace function public.get_my_cue_devices()
returns table (
  id uuid,
  name text,
  platform text,
  created_at timestamptz,
  last_seen_at timestamptz,
  revoked_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select d.id, d.name, d.platform, d.created_at, d.last_seen_at, d.revoked_at
  from public.cue_devices d
  where d.user_id = auth.uid()
  order by d.revoked_at nulls first, d.created_at desc;
$$;

-- ---------------------------------------------------------------------------
-- Aggregation from Cue days
-- ---------------------------------------------------------------------------
create or replace function public.reaggregate_cue_time(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is distinct from auth.uid() and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'forbidden';
  end if;

  -- ── Per-project aggregates (published Cue projects mapped to SkillHive projects) ──
  insert into public.project_coding_time
    (project_id, user_id, total_seconds, agent_seconds, language_breakdown, daily_breakdown,
     last_coded_at, source, updated_at)
  with mapped as (
    select cp.today_project_id as project_id, d.date, d.seconds, d.agent_seconds, d.languages
    from public.cue_projects cp
    join public.cue_project_days d
      on d.device_id = cp.device_id and d.project_key = cp.project_key
    where cp.user_id = p_user_id
      and cp.today_project_id is not null
  ),
  langs as (
    select m.project_id, e->>'name' as name, sum((e->>'seconds')::bigint) as seconds
    from mapped m, jsonb_array_elements(m.languages) e
    group by 1, 2
  ),
  days as (
    select m.project_id, m.date, sum(m.seconds)::bigint as seconds
    from mapped m
    group by 1, 2
  )
  select
    m.project_id,
    p_user_id,
    sum(m.seconds)::bigint,
    sum(m.agent_seconds)::bigint,
    coalesce((
      select jsonb_agg(jsonb_build_object('name', l.name, 'total_seconds', l.seconds) order by l.seconds desc)
      from langs l where l.project_id = m.project_id
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(jsonb_build_object('date', to_char(d.date, 'YYYY-MM-DD'), 'seconds', d.seconds) order by d.date)
      from days d where d.project_id = m.project_id
    ), '[]'::jsonb),
    max(m.date)::timestamptz,
    'cue',
    now()
  from mapped m
  group by m.project_id
  on conflict (project_id) do update set
    total_seconds = excluded.total_seconds,
    agent_seconds = excluded.agent_seconds,
    language_breakdown = excluded.language_breakdown,
    daily_breakdown = excluded.daily_breakdown,
    last_coded_at = excluded.last_coded_at,
    source = 'cue',
    updated_at = now();

  -- Projects with no Cue project mapped to them keep their row (and the
  -- owner's visibility choice) but lose the numbers.
  update public.project_coding_time ct
  set total_seconds = 0,
      agent_seconds = 0,
      language_breakdown = '[]'::jsonb,
      daily_breakdown = '[]'::jsonb,
      last_coded_at = null,
      source = 'cue',
      updated_at = now()
  where ct.user_id = p_user_id
    and not exists (
      select 1 from public.cue_projects cp
      where cp.user_id = p_user_id and cp.today_project_id = ct.project_id
    );

  -- ── User-level totals: every Cue day, the private bucket included ─────────
  -- Days before the first Cue day are carried over from the connected tracker,
  -- so switching to Cue does not empty the heatmap or reset the streak. From the
  -- first Cue day on, only Cue counts. Languages and agent share are Cue's only.
  insert into public.user_coding_stats
    (user_id, total_seconds, agent_seconds, language_breakdown, daily_breakdown,
     current_streak_days, longest_streak_days, last_coded_at, source, cue_since, updated_at, is_public)
  with all_days as (
    select d.date, d.seconds, d.agent_seconds, d.languages
    from public.cue_project_days d
    where d.user_id = p_user_id
  ),
  langs as (
    select e->>'name' as name, sum((e->>'seconds')::bigint) as seconds
    from all_days a, jsonb_array_elements(a.languages) e
    group by 1
  ),
  cue_days as (
    select a.date, least(sum(a.seconds), 86400)::bigint as seconds
    from all_days a
    group by 1
    having sum(a.seconds) > 0
  ),
  first_cue as (
    select min(c.date) as date from cue_days c
  ),
  tracker_days as (
    select (e->>'date')::date as date, least(sum((e->>'seconds')::bigint), 86400)::bigint as seconds
    from public.time_tracker_projects_raw r, jsonb_array_elements(r.daily) e
    where r.user_id = p_user_id
      and (e->>'date')::date < coalesce((select f.date from first_cue f), 'infinity'::date)
    group by 1
    having sum((e->>'seconds')::bigint) > 0
  ),
  days as (
    select c.date, c.seconds from cue_days c
    union all
    select t.date, t.seconds from tracker_days t
  ),
  runs as (
    select count(*) as run_len, max(g.date) as run_end
    from (
      select d.date, d.date - (row_number() over (order by d.date))::int as grp
      from days d
    ) g
    group by g.grp
  ),
  totals as (
    select
      coalesce((select sum(d.seconds) from days d), 0)::bigint as total_seconds,
      coalesce((select sum(a.agent_seconds) from all_days a), 0)::bigint as agent_seconds,
      coalesce((select r.run_len from runs r
                where r.run_end >= current_date - 1
                order by r.run_end desc limit 1), 0)::int as current_streak,
      coalesce((select max(r.run_len) from runs r), 0)::int as longest_streak,
      (select max(d.date) from days d)::timestamptz as last_coded_at,
      case when exists (select 1 from tracker_days)
           then coalesce((select f.date from first_cue f), current_date) end as cue_since
  )
  select
    p_user_id,
    t.total_seconds,
    least(t.agent_seconds, t.total_seconds),
    coalesce((
      select jsonb_agg(jsonb_build_object('name', l.name, 'total_seconds', l.seconds) order by l.seconds desc)
      from langs l
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(jsonb_build_object('date', to_char(d.date, 'YYYY-MM-DD'), 'seconds', d.seconds) order by d.date)
      from days d
    ), '[]'::jsonb),
    t.current_streak,
    t.longest_streak,
    t.last_coded_at,
    'cue',
    t.cue_since,
    now(),
    coalesce((select prev.is_public from public.user_coding_stats prev where prev.user_id = p_user_id), false)
  from totals t
  on conflict (user_id) do update set
    total_seconds = excluded.total_seconds,
    agent_seconds = excluded.agent_seconds,
    language_breakdown = excluded.language_breakdown,
    daily_breakdown = excluded.daily_breakdown,
    current_streak_days = excluded.current_streak_days,
    longest_streak_days = excluded.longest_streak_days,
    last_coded_at = excluded.last_coded_at,
    source = 'cue',
    cue_since = excluded.cue_since,
    updated_at = now();
end;
$$;

-- Keep the original tracker aggregation under a new name, then put a
-- dispatcher in its place so every existing caller picks the right source.
do $$
begin
  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'reaggregate_tracker_time_impl'
  ) then
    alter function public.reaggregate_tracker_time(uuid) rename to reaggregate_tracker_time_impl;
  end if;
end;
$$;

create or replace function public.reaggregate_tracker_time(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is distinct from auth.uid() and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'forbidden';
  end if;
  if public.coding_time_source_of(p_user_id) = 'cue' then
    perform public.reaggregate_cue_time(p_user_id);
  else
    perform public.reaggregate_tracker_time_impl(p_user_id);
    -- The original leaves the user row untouched when there is no tracker data;
    -- clear it so numbers from Cue are never shown under the tracker label.
    if not exists (select 1 from public.time_tracker_projects_raw r where r.user_id = p_user_id) then
      update public.user_coding_stats
      set total_seconds = 0, language_breakdown = '[]'::jsonb, daily_breakdown = '[]'::jsonb,
          current_streak_days = 0, longest_streak_days = 0, last_coded_at = null, updated_at = now()
      where user_id = p_user_id;
    end if;
    update public.user_coding_stats set source = 'tracker', agent_seconds = 0, cue_since = null where user_id = p_user_id;
    update public.project_coding_time set source = 'tracker', agent_seconds = 0 where user_id = p_user_id;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- After the edge function has written days for a device
-- ---------------------------------------------------------------------------
create or replace function public.cue_after_sync(p_user_id uuid, p_device_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'forbidden';
  end if;

  update public.cue_devices set last_seen_at = now() where id = p_device_id and user_id = p_user_id;

  -- A published project whose name matches one of the user's projects is mapped for them.
  update public.cue_projects cp
  set today_project_id = tp.id, updated_at = now()
  from public.today_projects tp
  where cp.user_id = p_user_id
    and cp.today_project_id is null
    and tp.user_id = p_user_id
    and lower(tp.name) = lower(cp.name);

  if public.coding_time_source_of(p_user_id) = 'cue' then
    perform public.reaggregate_cue_time(p_user_id);
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Owner RPCs
-- ---------------------------------------------------------------------------
create or replace function public.revoke_cue_device(p_device_id uuid, p_delete_data boolean default false)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  update public.cue_devices
  set revoked_at = coalesce(revoked_at, now())
  where id = p_device_id and user_id = v_uid;
  if not found then
    raise exception 'not_found';
  end if;
  if p_delete_data then
    delete from public.cue_project_days where device_id = p_device_id and user_id = v_uid;
    delete from public.cue_projects where device_id = p_device_id and user_id = v_uid;
    perform public.reaggregate_tracker_time(v_uid);
  end if;
end;
$$;

create or replace function public.get_my_cue_projects()
returns table (
  device_id uuid,
  project_key text,
  name text,
  remote text,
  today_project_id uuid,
  total_seconds bigint,
  last_date date
)
language sql
security definer
set search_path = public
as $$
  select cp.device_id, cp.project_key, cp.name, cp.remote, cp.today_project_id,
         coalesce(sum(d.seconds), 0)::bigint, max(d.date)
  from public.cue_projects cp
  left join public.cue_project_days d
    on d.device_id = cp.device_id and d.project_key = cp.project_key
  where cp.user_id = auth.uid()
  group by cp.device_id, cp.project_key, cp.name, cp.remote, cp.today_project_id
  order by max(d.date) desc nulls last, cp.name;
$$;

create or replace function public.map_cue_project(
  p_device_id uuid,
  p_project_key text,
  p_today_project_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if p_today_project_id is not null and not exists (
    select 1 from public.today_projects tp where tp.id = p_today_project_id and tp.user_id = v_uid
  ) then
    raise exception 'forbidden';
  end if;
  update public.cue_projects
  set today_project_id = p_today_project_id, updated_at = now()
  where device_id = p_device_id and project_key = p_project_key and user_id = v_uid;
  if not found then
    raise exception 'not_found';
  end if;
  perform public.reaggregate_tracker_time(v_uid);
end;
$$;

create or replace function public.get_my_coding_time_source()
returns text
language sql
security definer
set search_path = public
as $$
  select public.coding_time_source_of(auth.uid());
$$;

create or replace function public.set_coding_time_source(p_source text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if p_source not in ('tracker', 'cue') then
    raise exception 'invalid_source';
  end if;
  insert into public.coding_time_settings (user_id, source, updated_at)
  values (v_uid, p_source, now())
  on conflict (user_id) do update set source = excluded.source, updated_at = now();
  perform public.reaggregate_tracker_time(v_uid);
end;
$$;

-- Side by side for the last N days, so a user can check Cue against their tracker.
create or replace function public.get_my_coding_time_comparison(p_days integer default 7)
returns table (date date, cue_seconds bigint, tracker_seconds bigint)
language sql
security definer
set search_path = public
as $$
  with span as (
    select generate_series(
      current_date - (greatest(least(p_days, 60), 1) - 1), current_date, interval '1 day'
    )::date as date
  ),
  cue as (
    select d.date, least(sum(d.seconds), 86400)::bigint as seconds
    from public.cue_project_days d
    where d.user_id = auth.uid()
    group by d.date
  ),
  tracker as (
    select to_date(e->>'date', 'YYYY-MM-DD') as date, sum((e->>'seconds')::bigint)::bigint as seconds
    from public.time_tracker_projects_raw r, jsonb_array_elements(r.daily) e
    where r.user_id = auth.uid()
    group by 1
  )
  select s.date, coalesce(c.seconds, 0), coalesce(t.seconds, 0)
  from span s
  left join cue c on c.date = s.date
  left join tracker t on t.date = s.date
  order by s.date;
$$;

-- Where a profile's coding time came from, under the same visibility rule as the stats.
create or replace function public.get_user_coding_extras(p_user_id uuid)
returns table (source text, agent_seconds bigint, cue_since date)
language sql
security definer
set search_path = public
as $$
  select s.source, s.agent_seconds, s.cue_since
  from public.user_coding_stats s
  where s.user_id = p_user_id
    and (s.is_public or s.user_id = auth.uid());
$$;

create or replace function public.cue_device_allow(p_device_id uuid, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.cue_devices
  set window_count = case
        when window_started_at is null or window_started_at < now() - make_interval(secs => p_window_seconds) then 1
        else window_count + 1
      end,
      window_started_at = case
        when window_started_at is null or window_started_at < now() - make_interval(secs => p_window_seconds) then now()
        else window_started_at
      end
  where id = p_device_id
  returning window_count into v_count;
  return coalesce(v_count, 0) between 1 and p_limit;
end
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
revoke all on function public.cue_after_sync(uuid, uuid) from public, anon, authenticated;
revoke all on function public.cue_device_allow(uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.cue_device_allow(uuid, integer, integer) to service_role;
grant execute on function public.cue_after_sync(uuid, uuid) to service_role;

grant execute on function public.peek_cue_link(text) to authenticated;
grant execute on function public.approve_cue_link(text) to authenticated;
grant execute on function public.get_my_cue_devices() to authenticated;
grant execute on function public.revoke_cue_device(uuid, boolean) to authenticated;
grant execute on function public.get_my_cue_projects() to authenticated;
grant execute on function public.map_cue_project(uuid, text, uuid) to authenticated;
grant execute on function public.get_my_coding_time_source() to authenticated;
grant execute on function public.set_coding_time_source(text) to authenticated;
grant execute on function public.get_my_coding_time_comparison(integer) to authenticated;
grant execute on function public.get_user_coding_extras(uuid) to anon, authenticated;
grant execute on function public.reaggregate_tracker_time(uuid) to authenticated, service_role;
grant execute on function public.reaggregate_cue_time(uuid) to authenticated, service_role;
