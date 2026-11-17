-- Behaviour checks for 20261117000200_cue_project_privacy.sql. See README.md.
-- Runs after cue_sync.test.sql in the same database (it reuses the two users).
\set ON_ERROR_STOP on
\set QUIET on

create or replace function pg_temp.check(p_ok boolean, p_what text) returns void language plpgsql as $$
begin
  if p_ok is not true then raise exception 'check failed: %', p_what; end if;
end $$;

create or replace function pg_temp.as_user(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_user::text, ''), false);
  perform set_config('request.jwt.claim.role', case when p_user is null then 'service_role' else 'authenticated' end, false);
end $$;

-- Expect a call to fail with one message.
create or replace function pg_temp.refuses(p_sql text, p_message text, p_what text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if sqlerrm = p_message then return; end if;
    raise exception 'check failed: % (got %)', p_what, sqlerrm;
  end;
  raise exception 'check failed: % (it succeeded)', p_what;
end $$;

\set me '''00000000-0000-0000-0000-0000000000a1'''
\set them '''00000000-0000-0000-0000-0000000000b2'''

reset role;
select pg_temp.check((select is_public from public.today_projects where id = '00000000-0000-0000-0000-00000000c001'), 'existing projects stay public');
select pg_temp.as_user(:me);
select public.set_coding_time_source('cue');

-- Two machines with the same repository, and one project with no remote.
insert into public.cue_devices (id, user_id, name, public_key) values
  ('00000000-0000-0000-0000-0000000000e1', :me, 'air', 'a2V5LTE='),
  ('00000000-0000-0000-0000-0000000000e2', :me, 'studio', 'a2V5LTI=');
insert into public.cue_projects (user_id, device_id, project_key, name, remote) values
  (:me, '00000000-0000-0000-0000-0000000000e1', 'p_aaaaaaaaaaaaaaaa', 'stager-1', 'github.com/me/stager-1'),
  (:me, '00000000-0000-0000-0000-0000000000e2', 'p_bbbbbbbbbbbbbbbb', 'stager-1', 'github.com/me/stager-1'),
  (:me, '00000000-0000-0000-0000-0000000000e1', 'p_cccccccccccccccc', 'client-x', null);
insert into public.cue_project_days (user_id, device_id, project_key, date, seconds, languages) values
  (:me, '00000000-0000-0000-0000-0000000000e1', 'p_aaaaaaaaaaaaaaaa', current_date, 1000, '[{"name":"Rust","seconds":1000}]'),
  (:me, '00000000-0000-0000-0000-0000000000e2', 'p_bbbbbbbbbbbbbbbb', current_date, 500, '[]'),
  (:me, '00000000-0000-0000-0000-0000000000e1', 'p_cccccccccccccccc', current_date, 700, '[]');

-- ── Create from Cue: private, and linked on both machines ──────────────────
select pg_temp.as_user(:me);
set role authenticated;
select public.create_project_from_cue('00000000-0000-0000-0000-0000000000e1', 'p_aaaaaaaaaaaaaaaa') as stager_id \gset
reset role;
select pg_temp.check((select not is_public from public.today_projects where id = :'stager_id'), 'a project created from Cue starts private');
select pg_temp.check((select count(*) from public.cue_projects where today_project_id = :'stager_id') = 2, 'both copies of the repository are linked');
select pg_temp.check((select total_seconds from public.project_coding_time where project_id = :'stager_id') = 1500, 'its coding time counts both machines');

set role authenticated;
select pg_temp.check((select count(*) from public.get_user_projects(:me) where id = :'stager_id' and not is_public) = 1, 'the owner sees it, marked private');
select pg_temp.refuses($$select public.create_project_from_cue('00000000-0000-0000-0000-0000000000e2', 'p_bbbbbbbbbbbbbbbb')$$, 'exists', 'a second project with the same name is refused');
reset role;

-- ── Nobody else sees a private project ─────────────────────────────────────
select pg_temp.as_user(:them);
set role authenticated;
select pg_temp.check((select count(*) from public.today_projects where id = :'stager_id') = 0, 'another user cannot read a private project');
select pg_temp.check((select count(*) from public.get_user_projects(:me) where id = :'stager_id') = 0, 'nor list it');
select pg_temp.check((select count(*) from public.get_project_summary(:'stager_id')) = 0, 'nor open its page');
select pg_temp.check((select count(*) from public.get_project_coding_time(:'stager_id')) = 0, 'nor read its coding time');
select pg_temp.check((select count(*) from public.get_user_projects(:me) where id = '00000000-0000-0000-0000-00000000c001') = 1, 'public projects are still listed');
select pg_temp.refuses(format('select public.set_project_visibility(%L, true)', :'stager_id'), 'not_found', 'another user cannot change its visibility');
reset role;

-- ── One switch makes it public, and private again ──────────────────────────
select pg_temp.as_user(:me);
set role authenticated;
select public.set_project_visibility(:'stager_id', true);
reset role;
select pg_temp.as_user(:them);
set role authenticated;
select pg_temp.check((select count(*) from public.get_project_summary(:'stager_id')) = 1, 'a public project opens for others');
select pg_temp.check((select total_seconds from public.get_project_coding_time(:'stager_id')) = 1500, 'with its coding time');
reset role;
select pg_temp.as_user(:me);
set role authenticated;
select public.set_project_visibility(:'stager_id', false);
reset role;
select pg_temp.as_user(:them);
set role authenticated;
select pg_temp.check((select count(*) from public.get_project_summary(:'stager_id')) = 0, 'making it private hides it again');
select pg_temp.check((select count(*) from public.project_coding_time where project_id = :'stager_id') = 0, 'and its coding-time row');
reset role;

-- Coding time marked public on a private project stays hidden.
update public.project_coding_time set is_public = true where project_id = :'stager_id';
select pg_temp.as_user(:them);
set role authenticated;
select pg_temp.check((select count(*) from public.project_coding_time where project_id = :'stager_id') = 0, 'public coding time on a private project is not readable');
select pg_temp.check((select count(*) from public.get_project_coding_time(:'stager_id')) = 0, 'nor through the function');
reset role;
update public.project_coding_time set is_public = false where project_id = :'stager_id';

-- ── The project page switch works before any coding time exists ────────────
insert into public.today_projects (id, user_id, name, is_public) values
  ('00000000-0000-0000-0000-00000000c002', :me, 'notes-app', false);
select pg_temp.as_user(:me);
set role authenticated;
select public.set_project_coding_visibility('00000000-0000-0000-0000-00000000c002', true);
reset role;
select pg_temp.check((select is_public from public.project_coding_time where project_id = '00000000-0000-0000-0000-00000000c002'), 'the switch creates the coding-time row');
select pg_temp.check((select is_public from public.today_projects where id = '00000000-0000-0000-0000-00000000c002'), 'and showing coding time shows the project');

-- ── A new machine with a linked repository is linked at its first sync ─────
insert into public.cue_devices (id, user_id, name, public_key) values
  ('00000000-0000-0000-0000-0000000000e3', :me, 'linux-box', 'a2V5LTM=');
insert into public.cue_projects (user_id, device_id, project_key, name, remote) values
  (:me, '00000000-0000-0000-0000-0000000000e3', 'p_dddddddddddddddd', 'stager', 'github.com/me/stager-1');
select pg_temp.as_user(null);
select public.cue_after_sync(:me, '00000000-0000-0000-0000-0000000000e3');
select pg_temp.check((select today_project_id from public.cue_projects where project_key = 'p_dddddddddddddddd') = :'stager_id', 'a third machine joins the link by remote');
select pg_temp.check((select today_project_id from public.cue_projects where project_key = 'p_cccccccccccccccc') is null, 'a project with no remote is left alone');

-- Unlinking one copy unlinks the repository everywhere.
select pg_temp.as_user(:me);
set role authenticated;
select public.map_cue_project('00000000-0000-0000-0000-0000000000e2', 'p_bbbbbbbbbbbbbbbb', null);
reset role;
select pg_temp.check((select count(*) from public.cue_projects where today_project_id = :'stager_id') = 0, 'unlinking one copy unlinks all of them');

-- ── Who may call what ──────────────────────────────────────────────────────
select pg_temp.check(not has_function_privilege('anon', 'public.create_project_from_cue(uuid, text)', 'execute'), 'anon cannot create projects from Cue');
select pg_temp.check(not has_function_privilege('anon', 'public.set_project_visibility(uuid, boolean)', 'execute'), 'anon cannot change visibility');
select pg_temp.check(not has_function_privilege('anon', 'public.set_project_coding_visibility(uuid, boolean)', 'execute'), 'nor coding visibility');
select pg_temp.check(has_function_privilege('authenticated', 'public.set_project_visibility(uuid, boolean)', 'execute'), 'signed-in users can');
select pg_temp.check(has_function_privilege('anon', 'public.get_user_projects(uuid)', 'execute'), 'public profiles can still list projects');

\echo cue_project_privacy: all checks passed
