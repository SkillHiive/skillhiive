select set_config('request.jwt.claim.role','service_role', false);
do $$
declare u uuid := '00000000-0000-4000-8000-000000000002'; da uuid; db uuid; tp uuid; tot bigint; p1 bigint; ps text;
begin
  insert into cue_devices (user_id,name,platform,public_key) values (u,'a','x','k') returning id into da;
  insert into cue_devices (user_id,name,platform,public_key) values (u,'b','x','k') returning id into db;
  insert into today_projects (user_id,name) values (u,'proj') returning id into tp;
  insert into cue_projects (user_id,device_id,project_key,name,today_project_id) values (u,da,'p_0000000000000001','proj',tp),(u,db,'p_0000000000000001','proj',tp);
  -- one date at 120000 s across two devices; one normal date at 3600
  insert into cue_project_days (user_id,device_id,project_key,date,seconds,agent_seconds,languages) values
    (u,da,'p_0000000000000001','2026-11-10',60000,6000,'[{"name":"ts","seconds":60000}]'),
    (u,db,'p_0000000000000001','2026-11-10',60000,6000,'[{"name":"ts","seconds":60000}]'),
    (u,da,'p_0000000000000001','2026-11-11',3600,0,'[{"name":"ts","seconds":3600}]');
  insert into coding_time_settings (user_id, source) values (u,'cue') on conflict (user_id) do update set source='cue';
  perform reaggregate_cue_time(u);
  select total_seconds into tot from user_coding_stats where user_id=u;
  select total_seconds into p1 from project_coding_time where project_id=tp;
  raise notice 'user total %, project total %', tot, p1;
  assert tot = 86400 + 3600, 'user total capped per date';
  assert p1 <= 86400 + 3600 and p1 >= 86400 + 3600 - 2, 'project total scaled';
  assert (select sum(s) from (select (e->>'seconds')::int s from user_coding_stats, jsonb_array_elements(daily_breakdown) e where user_id=u and e->>'date'='2026-11-10') q) = 86400, 'daily 86400';
  assert (select sum((l->>'total_seconds')::bigint) from user_coding_stats, jsonb_array_elements(language_breakdown) l where user_id=u) <= tot, 'languages scaled';
  -- under the cap nothing changes
  assert (select seconds from cue_scaled_days(u) where date='2026-11-11')=3600;
  -- scaled never exceeds the cap even with awkward numbers
  insert into cue_project_days (user_id,device_id,project_key,date,seconds) values (u,da,'private','2026-11-12',86400),(u,db,'private','2026-11-12',86400),(u,db,'p_0000000000000001','2026-11-12',7);
  assert (select sum(seconds) from cue_scaled_days(u) where date='2026-11-12') <= 86400;
  raise notice 'part 2 ok';
end $$;
