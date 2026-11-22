do $$
declare u uuid := '00000000-0000-4000-8000-000000000001'; keep uuid; tp uuid;
begin
  select id into keep from cue_devices where user_id=u and public_key='k3';
  assert keep is not null, 'newest kept';
  assert not exists (select 1 from cue_devices where public_key in ('k1','k2')), 'old merged away';
  assert (select count(*) from cue_devices)=4;
  assert (select sum(seconds) from cue_project_days where device_id=keep)=6300, 'days merged';
  assert (select seconds from cue_project_days where device_id=keep and project_key='p_0000000000000001' and date='2026-11-10')=3000, 'latest wins';
  assert (select seconds from cue_project_days where device_id=keep and project_key='p_0000000000000001' and date='2026-11-08')=900, 'kept moved row';
  select id into tp from today_projects where user_id=u;
  assert (select today_project_id from cue_projects where device_id=keep and project_key='p_0000000000000001')=tp, 'mapping carried';
  assert (select name from cue_projects where device_id=keep and project_key='p_0000000000000001')='proj new', 'name from kept';
  assert (select count(*) from cue_projects where device_id=keep)=3, 'keys moved over';
  assert (select count(*) from cue_project_days where user_id=u and device_id in (select id from cue_devices where machine_id is not null))=1, 'machine id device untouched';
  assert (select total_seconds from user_coding_stats where user_id=u)=13550, 'reaggregated';
  assert (select total_seconds from project_coding_time where project_id=tp)=5700, 'project total';
  assert (select count(*) from cue_project_days where user_id='00000000-0000-4000-8000-000000000002')=1, 'other user untouched';
  raise notice 'part 3 ok';
end $$;
