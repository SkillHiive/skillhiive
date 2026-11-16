-- Behaviour checks for 20261115000000_cue_sync.sql. See README.md.
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

insert into public.profiles (id, username) values
  ('00000000-0000-0000-0000-0000000000a1', 'rohan'),
  ('00000000-0000-0000-0000-0000000000b2', 'other');
insert into public.today_projects (id, user_id, name) values
  ('00000000-0000-0000-0000-00000000c001', '00000000-0000-0000-0000-0000000000a1', 'herebyinvite');

-- ── Linking ────────────────────────────────────────────────────────────────
insert into public.cue_links (id, user_code_hash, public_key, device_name, platform, expires_at) values
  ('00000000-0000-0000-0000-00000000d001', public.cue_code_hash('ABCD-2345'), 'cHVibGljLWtleQ==', 'rohans-air', 'darwin-arm64', now() + interval '10 minutes'),
  ('00000000-0000-0000-0000-00000000d002', public.cue_code_hash('DEAD-9999'), 'b2xkLWtleQ==', 'old-mac', 'darwin-x64', now() - interval '1 minute');

select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select pg_temp.check((select device_name from public.peek_cue_link(' abcd-2345 ')) = 'rohans-air', 'peek finds a live code, ignoring case and spaces');
select pg_temp.check((select count(*) from public.peek_cue_link('DEAD-9999')) = 0, 'peek hides an expired code');
select pg_temp.check((select device_name from public.approve_cue_link('ABCD-2345')) = 'rohans-air', 'approve returns the device');
select pg_temp.check((select count(*) from public.get_my_cue_devices()) = 1, 'the approved device is listed');
select pg_temp.check(public.get_my_coding_time_source() = 'cue', 'a user with no tracker starts on cue');

do $$ begin
  begin
    perform public.approve_cue_link('ABCD-2345');
    raise exception 'check failed: a used code was accepted';
  exception when others then
    if sqlerrm <> 'link_used' then raise; end if;
  end;
  begin
    perform public.approve_cue_link('DEAD-9999');
    raise exception 'check failed: an expired code was accepted';
  exception when others then
    if sqlerrm <> 'link_expired' then raise; end if;
  end;
end $$;

-- ── A device syncs three days ending today ─────────────────────────────────
select pg_temp.as_user(null);
select id as device_id from public.cue_devices limit 1 \gset
insert into public.cue_projects (user_id, device_id, project_key, name, remote) values
  ('00000000-0000-0000-0000-0000000000a1', :'device_id', 'p_0123456789abcdef', 'HerebyInvite', 'github.com/me/herebyinvite');
insert into public.cue_project_days (user_id, device_id, project_key, date, seconds, agent_seconds, sources, languages, commits) values
  ('00000000-0000-0000-0000-0000000000a1', :'device_id', 'p_0123456789abcdef', current_date - 2, 3600, 600, '{"fs":3000,"agent":600}', '[{"name":"TypeScript","seconds":3000}]', 2),
  ('00000000-0000-0000-0000-0000000000a1', :'device_id', 'p_0123456789abcdef', current_date - 1, 1800, 0, '{"fs":1800}', '[{"name":"TypeScript","seconds":1000},{"name":"SQL","seconds":800}]', 1),
  ('00000000-0000-0000-0000-0000000000a1', :'device_id', 'p_0123456789abcdef', current_date, 900, 900, '{"agent":900}', '[]', 0),
  ('00000000-0000-0000-0000-0000000000a1', :'device_id', 'private', current_date, 1200, 0, '{"shell":1200}', '[]', 0);
select public.cue_after_sync('00000000-0000-0000-0000-0000000000a1', :'device_id');

select pg_temp.check((select today_project_id from public.cue_projects) = '00000000-0000-0000-0000-00000000c001', 'a matching project name is mapped automatically');
select pg_temp.check((select total_seconds from public.project_coding_time where project_id = '00000000-0000-0000-0000-00000000c001') = 6300, 'the project total is the sum of its named days');
select pg_temp.check((select agent_seconds from public.project_coding_time where project_id = '00000000-0000-0000-0000-00000000c001') = 1500, 'the project agent share is summed');
select pg_temp.check((select total_seconds from public.user_coding_stats where user_id = '00000000-0000-0000-0000-0000000000a1') = 7500, 'the user total includes the private bucket');
select pg_temp.check((select current_streak_days from public.user_coding_stats where user_id = '00000000-0000-0000-0000-0000000000a1') = 3, 'three consecutive days are a streak of three');
select pg_temp.check((select source from public.user_coding_stats where user_id = '00000000-0000-0000-0000-0000000000a1') = 'cue', 'the stats are labelled cue');
select pg_temp.check((select language_breakdown->0->>'name' from public.user_coding_stats where user_id = '00000000-0000-0000-0000-0000000000a1') = 'TypeScript', 'languages are ranked');
select pg_temp.check((select jsonb_array_length(daily_breakdown) from public.user_coding_stats where user_id = '00000000-0000-0000-0000-0000000000a1') = 3, 'one heatmap entry per active day');
select pg_temp.check((select is_public from public.user_coding_stats where user_id = '00000000-0000-0000-0000-0000000000a1') = false, 'stats stay private by default');
select pg_temp.check((select last_seen_at is not null from public.cue_devices where id = :'device_id'), 'a sync marks the device as seen');

-- ── Per-device request budget ──────────────────────────────────────────────
select pg_temp.check(public.cue_device_allow(:'device_id', 3, 600), 'request 1 of 3 is allowed');
select pg_temp.check(public.cue_device_allow(:'device_id', 3, 600), 'request 2 of 3 is allowed');
select pg_temp.check(public.cue_device_allow(:'device_id', 3, 600), 'request 3 of 3 is allowed');
select pg_temp.check(not public.cue_device_allow(:'device_id', 3, 600), 'request 4 of 3 is refused');
update public.cue_devices set window_started_at = now() - interval '11 minutes' where id = :'device_id';
select pg_temp.check(public.cue_device_allow(:'device_id', 3, 600), 'the counter resets after the window');
select pg_temp.check((select window_count from public.cue_devices where id = :'device_id') = 1, 'and starts again at one');
select pg_temp.check(not public.cue_device_allow('00000000-0000-4000-8000-00000000dead', 3, 600), 'an unknown device is never allowed');
select pg_temp.check(not has_function_privilege('authenticated', 'public.cue_device_allow(uuid, integer, integer)', 'execute'), 'signed-in users cannot spend a device budget');

-- ── Row level security and visibility ──────────────────────────────────────
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b2');
set role authenticated;
select pg_temp.check((select count(*) from public.cue_project_days) = 0, 'another user cannot read day rows');
select pg_temp.check((select count(*) from public.cue_projects) = 0, 'another user cannot read project names');
select pg_temp.check((select count(*) from public.cue_devices) = 0, 'another user cannot read devices');
select pg_temp.check((select count(*) from public.cue_links) = 0, 'link codes are not readable');
select pg_temp.check((select count(*) from public.get_user_coding_extras('00000000-0000-0000-0000-0000000000a1')) = 0, 'private stats expose no source or agent share');
do $$ begin
  begin
    perform public.cue_after_sync('00000000-0000-0000-0000-0000000000a1', gen_random_uuid());
    raise exception 'check failed: a signed-in user ran the service-only hook';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.reaggregate_cue_time('00000000-0000-0000-0000-0000000000a1');
    raise exception 'check failed: a user reaggregated someone else';
  exception when others then
    if sqlerrm <> 'forbidden' then raise; end if;
  end;
  begin
    insert into public.cue_project_days (user_id, device_id, project_key, date, seconds)
    values ('00000000-0000-0000-0000-0000000000b2', gen_random_uuid(), 'private', current_date, 10);
    raise exception 'check failed: a user wrote a day row directly';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
set role authenticated;
select pg_temp.check((select count(*) from public.cue_project_days) = 4, 'the owner reads their own rows');
select pg_temp.check((select count(*) from public.get_my_cue_projects()) = 1, 'the owner lists their published projects');
select pg_temp.check((select count(*) from public.get_my_coding_time_comparison(7)) = 7, 'the comparison covers each requested day');
select pg_temp.check((select cue_seconds from public.get_my_coding_time_comparison(7) order by date desc limit 1) = 2100, 'today''s cue total adds named and private time');
select pg_temp.check((select agent_seconds from public.get_user_coding_extras('00000000-0000-0000-0000-0000000000a1')) = 1500, 'the owner sees the agent share');

-- ── Switching source and removing a device ─────────────────────────────────
select public.set_coding_time_source('tracker');
select pg_temp.check((select total_seconds from public.user_coding_stats where user_id = '00000000-0000-0000-0000-0000000000a1') = 0, 'with no tracker data, switching to tracker shows no cue numbers');
select pg_temp.check((select source from public.user_coding_stats where user_id = '00000000-0000-0000-0000-0000000000a1') = 'tracker', 'the label follows the source');
select public.set_coding_time_source('cue');
select pg_temp.check((select total_seconds from public.user_coding_stats where user_id = '00000000-0000-0000-0000-0000000000a1') = 7500, 'switching back restores the cue totals');

-- ── History from a tracker is kept for days before the first Cue day ───────
reset role;
insert into public.time_tracker_connections (user_id, provider, api_key) values
  ('00000000-0000-0000-0000-0000000000a1', 'hackatime', 'test-key');
insert into public.time_tracker_projects_raw (user_id, connection_id, tracker_project_id, name, total_seconds, daily) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 't1', 'old-work', 13599,
   jsonb_build_array(
     jsonb_build_object('date', to_char(current_date - 10, 'YYYY-MM-DD'), 'seconds', 3000),
     jsonb_build_object('date', to_char(current_date - 3, 'YYYY-MM-DD'), 'seconds', 600),
     jsonb_build_object('date', to_char(current_date, 'YYYY-MM-DD'), 'seconds', 9999)));
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select public.reaggregate_tracker_time('00000000-0000-0000-0000-0000000000a1');
select pg_temp.check((select total_seconds from public.user_coding_stats where user_id = '00000000-0000-0000-0000-0000000000a1') = 7500 + 3600, 'tracker days before the first cue day are kept, later ones are not added');
select pg_temp.check((select jsonb_array_length(daily_breakdown) from public.user_coding_stats where user_id = '00000000-0000-0000-0000-0000000000a1') = 5, 'the heatmap keeps the older tracker days');
select pg_temp.check((select current_streak_days from public.user_coding_stats where user_id = '00000000-0000-0000-0000-0000000000a1') = 4, 'a streak runs across the switch');
select pg_temp.check((select cue_since from public.get_user_coding_extras('00000000-0000-0000-0000-0000000000a1')) = current_date - 2, 'the first cue day is reported');
select pg_temp.check((select agent_seconds from public.user_coding_stats where user_id = '00000000-0000-0000-0000-0000000000a1') = 1500, 'agent share is cue only');
select public.set_coding_time_source('tracker');
select pg_temp.check((select cue_since from public.user_coding_stats where user_id = '00000000-0000-0000-0000-0000000000a1') is null, 'the tracker source carries no cue date');
select public.set_coding_time_source('cue');
reset role;
delete from public.time_tracker_connections where user_id = '00000000-0000-0000-0000-0000000000a1';
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select public.reaggregate_tracker_time('00000000-0000-0000-0000-0000000000a1');
select pg_temp.check((select total_seconds from public.user_coding_stats where user_id = '00000000-0000-0000-0000-0000000000a1') = 7500, 'disconnecting the tracker removes its carried days');
select pg_temp.check((select cue_since from public.user_coding_stats where user_id = '00000000-0000-0000-0000-0000000000a1') is null, 'and the cue date with them');

select public.map_cue_project(:'device_id', 'p_0123456789abcdef', null);
select pg_temp.check((select total_seconds from public.project_coding_time where project_id = '00000000-0000-0000-0000-00000000c001') = 0, 'unmapping clears the project total');
select pg_temp.check((select total_seconds from public.user_coding_stats where user_id = '00000000-0000-0000-0000-0000000000a1') = 7500, 'unmapping leaves the user total alone');

select public.revoke_cue_device(:'device_id', true);
select pg_temp.check((select revoked_at is not null from public.get_my_cue_devices()), 'the device is marked revoked');
select pg_temp.check((select count(*) from public.cue_project_days) = 0, 'removing a device with its data deletes its rows');
select pg_temp.check((select total_seconds from public.user_coding_stats where user_id = '00000000-0000-0000-0000-0000000000a1') = 0, 'the totals follow');
reset role;

\echo cue_sync: all checks passed
