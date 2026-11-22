-- Cue time: at most one day per person per date, however many devices report.
--
-- Plan: docs/cue-device-identity.md (G21), part 3. Machines that were removed and linked again,
-- or two machines tracking the same hours, used to add up past 24 hours in one day.
--
-- cue_scaled_days(user) returns the user's cue_project_days with each date scaled down in
-- proportion when that date's total across devices and projects is more than 86400 seconds,
-- so the per project figures still add up to the capped total. Dates at or under the cap
-- come back unchanged. reaggregate_cue_time reads every total from it.
--
-- Safe to run more than once. Nothing is recalculated until the next sync or the cleanup
-- migration (20261122000200), which calls reaggregate_cue_time for affected users.

create or replace function public.cue_scaled_days(p_user_id uuid)
returns table (
  device_id uuid,
  project_key text,
  date date,
  seconds integer,
  agent_seconds integer,
  languages jsonb,
  commits integer
)
language sql
stable
security definer
set search_path = public
as $$
  with k as (
    select d.date, least(1::numeric, 86400::numeric / nullif(sum(d.seconds), 0)) as k
    from public.cue_project_days d
    where d.user_id = p_user_id
    group by d.date
  )
  select
    d.device_id,
    d.project_key,
    d.date,
    floor(d.seconds * k.k)::int,
    least(floor(d.agent_seconds * k.k), floor(d.seconds * k.k))::int,
    case when k.k = 1 then d.languages else coalesce((
      select jsonb_agg(jsonb_build_object('name', e->>'name', 'seconds', floor((e->>'seconds')::numeric * k.k)::bigint))
      from jsonb_array_elements(d.languages) e
    ), '[]'::jsonb) end,
    d.commits
  from public.cue_project_days d
  join k on k.date = d.date
  where d.user_id = p_user_id;
$$;

-- Internal: only the definer functions below call it.
revoke all on function public.cue_scaled_days(uuid) from public, anon, authenticated;

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
    join public.cue_scaled_days(p_user_id) d
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
    from public.cue_scaled_days(p_user_id) d
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

grant execute on function public.reaggregate_cue_time(uuid) to authenticated, service_role;
