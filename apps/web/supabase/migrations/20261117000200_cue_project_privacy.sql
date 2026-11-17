-- Projects from Cue: private by default, public only by an explicit choice.
--
-- Cue now sends the name of every project the user has not kept on their
-- machine (Cue D110). Those names live in cue_projects, which only the owner can
-- read. This migration makes the rest of the path honour the same rule:
--
--   1. SkillHiive projects get their own visibility. Every existing project
--      stays public, so nothing changes for anyone today; projects created from
--      Cue start private.
--   2. Public readers (the table policy and the anon-callable functions) skip
--      private projects. Coding time can only be public on a public project.
--   3. One switch, set_project_visibility, makes a project and its coding time
--      public or private together. set_project_coding_visibility now works on a
--      project that has no coding-time row yet (it used to do nothing).
--   4. Copies of one repository on several machines share one link, by git
--      remote. Linking by matching name is no longer automatic: the website
--      suggests it, so linking never makes time public as a side effect.
--   5. create_project_from_cue: a private SkillHiive project from a Cue project,
--      linked in the same step.
--
-- Additive in effect: existing rows keep today's visibility.

-- ---------------------------------------------------------------------------
-- 1. Visibility on SkillHiive projects
-- ---------------------------------------------------------------------------
alter table public.today_projects
  add column if not exists is_public boolean not null default true;

comment on column public.today_projects.is_public is
  'Whether people other than the owner can see this project. Projects created from Cue start private.';

drop policy if exists "today_projects public read" on public.today_projects;
create policy "today_projects public read" on public.today_projects
  for select using (is_public or (select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- 2. Public readers skip private projects
-- ---------------------------------------------------------------------------
-- The return type gains is_public (the owner's projects card shows it), so the
-- function is dropped and created again; its grants go with it and are restored.
drop function if exists public.get_user_projects(uuid);
create function public.get_user_projects(p_user_id uuid)
returns table (
  id uuid,
  name text,
  description text,
  color text,
  created_at timestamptz,
  total_minutes bigint,
  total_sessions bigint,
  is_public boolean
)
language sql
security definer
set search_path = public
as $$
  select
    tp.id,
    tp.name,
    tp.description,
    tp.color,
    tp.created_at,
    coalesce(sum(fs.duration_seconds) / 60, 0)::bigint as total_minutes,
    count(fs.id) as total_sessions,
    tp.is_public
  from public.today_projects tp
  left join public.focus_sessions fs on fs.project_id = tp.id
  where tp.user_id = p_user_id
    and (tp.is_public or tp.user_id = auth.uid())
  group by tp.id
  order by tp.created_at desc;
$$;
grant execute on function public.get_user_projects(uuid) to anon, authenticated;

create or replace function public.get_project_summary(p_project_id uuid)
returns table (
  name text,
  description text,
  created_at timestamptz,
  owner_username text,
  owner_id uuid,
  total_minutes bigint,
  total_sessions bigint,
  shipped_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    tp.name,
    tp.description,
    tp.created_at,
    pf.username,
    tp.user_id,
    coalesce(sum(fs.duration_seconds) / 60, 0)::bigint,
    count(fs.id),
    count(sn.id)
  from public.today_projects tp
  left join public.profiles pf on pf.id = tp.user_id
  left join public.focus_sessions fs on fs.project_id = tp.id
  left join public.session_notes sn on sn.project_id = tp.id and sn.ritual_type = 'checkout'
  where tp.id = p_project_id
    and (tp.is_public or tp.user_id = auth.uid())
  group by tp.id, pf.username;
$$;

create or replace function public.get_project_coding_time(p_project_id uuid)
returns table (total_seconds bigint, language_breakdown jsonb, last_coded_at timestamptz, is_public boolean)
language sql
security definer
set search_path = public
as $$
  select ct.total_seconds, ct.language_breakdown, ct.last_coded_at, ct.is_public
  from public.project_coding_time ct
  join public.today_projects tp on tp.id = ct.project_id
  where ct.project_id = p_project_id
    and ((ct.is_public and tp.is_public) or ct.user_id = auth.uid());
$$;

drop policy if exists "pct read" on public.project_coding_time;
create policy "pct read" on public.project_coding_time
  for select using (
    (select auth.uid()) = user_id
    or (
      is_public
      and exists (select 1 from public.today_projects tp where tp.id = project_id and tp.is_public)
    )
  );

-- ---------------------------------------------------------------------------
-- 3. Switches
-- ---------------------------------------------------------------------------
-- The one switch the website shows: the project and its coding time together.
create or replace function public.set_project_visibility(p_project_id uuid, p_is_public boolean)
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
  update public.today_projects set is_public = p_is_public
  where id = p_project_id and user_id = v_uid;
  if not found then
    raise exception 'not_found';
  end if;
  insert into public.project_coding_time (project_id, user_id, is_public)
  values (p_project_id, v_uid, p_is_public)
  on conflict (project_id) do update set is_public = excluded.is_public, updated_at = now();
end;
$$;

-- The project page's coding-time switch. Showing coding time also shows the
-- project (time on a hidden project would be meaningless), and the switch now
-- works before the first sync has created the coding-time row.
create or replace function public.set_project_coding_visibility(p_project_id uuid, p_is_public boolean)
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
  if not exists (select 1 from public.today_projects tp where tp.id = p_project_id and tp.user_id = v_uid) then
    raise exception 'not_found';
  end if;
  if p_is_public then
    update public.today_projects set is_public = true where id = p_project_id;
  end if;
  insert into public.project_coding_time (project_id, user_id, is_public)
  values (p_project_id, v_uid, p_is_public)
  on conflict (project_id) do update set is_public = excluded.is_public, updated_at = now();
end;
$$;

revoke all on function public.set_project_visibility(uuid, boolean) from public, anon;
grant execute on function public.set_project_visibility(uuid, boolean) to authenticated;
revoke all on function public.set_project_coding_visibility(uuid, boolean) from public, anon;
grant execute on function public.set_project_coding_visibility(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. One link per repository
-- ---------------------------------------------------------------------------
create index if not exists idx_cue_projects_user_remote
  on public.cue_projects (user_id, remote) where remote is not null;

-- Link (or unlink) a Cue project and every copy of the same repository on the
-- user's other machines.
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
  v_remote text;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if p_today_project_id is not null and not exists (
    select 1 from public.today_projects tp where tp.id = p_today_project_id and tp.user_id = v_uid
  ) then
    raise exception 'forbidden';
  end if;
  select cp.remote into v_remote
  from public.cue_projects cp
  where cp.device_id = p_device_id and cp.project_key = p_project_key and cp.user_id = v_uid;
  if not found then
    raise exception 'not_found';
  end if;
  update public.cue_projects cp
  set today_project_id = p_today_project_id, updated_at = now()
  where cp.user_id = v_uid
    and (
      (cp.device_id = p_device_id and cp.project_key = p_project_key)
      or (v_remote is not null and cp.remote = v_remote)
    );
  perform public.reaggregate_tracker_time(v_uid);
end;
$$;

-- After a sync: a repository that is linked on one machine is linked on all of
-- them. Nothing is linked by name any more; the website suggests that instead.
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

  update public.cue_projects cp
  set today_project_id = (
        select sib.today_project_id
        from public.cue_projects sib
        where sib.user_id = p_user_id
          and sib.remote = cp.remote
          and sib.today_project_id is not null
        order by sib.updated_at desc
        limit 1
      ),
      updated_at = now()
  where cp.user_id = p_user_id
    and cp.today_project_id is null
    and cp.remote is not null
    and exists (
      select 1 from public.cue_projects sib
      where sib.user_id = p_user_id and sib.remote = cp.remote and sib.today_project_id is not null
    );

  if public.coding_time_source_of(p_user_id) = 'cue' then
    perform public.reaggregate_cue_time(p_user_id);
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. A private SkillHiive project from a Cue project
-- ---------------------------------------------------------------------------
create or replace function public.create_project_from_cue(p_device_id uuid, p_project_key text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_name text;
  v_project uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  select cp.name into v_name
  from public.cue_projects cp
  where cp.device_id = p_device_id and cp.project_key = p_project_key and cp.user_id = v_uid;
  if not found then
    raise exception 'not_found';
  end if;
  -- One name, one project: the website offers "add to" for an existing one.
  if exists (select 1 from public.today_projects tp where tp.user_id = v_uid and lower(tp.name) = lower(v_name)) then
    raise exception 'exists';
  end if;
  insert into public.today_projects (user_id, name, is_public)
  values (v_uid, v_name, false)
  returning id into v_project;
  perform public.map_cue_project(p_device_id, p_project_key, v_project);
  return v_project;
end;
$$;

revoke all on function public.create_project_from_cue(uuid, text) from public, anon;
grant execute on function public.create_project_from_cue(uuid, text) to authenticated;
