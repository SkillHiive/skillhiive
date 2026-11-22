insert into profiles (id, username) values ('00000000-0000-4000-8000-000000000001','rohan'),('00000000-0000-4000-8000-000000000002','other');
do $$
declare u uuid := '00000000-0000-4000-8000-000000000001'; o uuid := '00000000-0000-4000-8000-000000000002';
  d1 uuid; d2 uuid; d3 uuid; d4 uuid; dm uuid; do1 uuid; tp uuid; k text := 'p_0000000000000001'; k2 text := 'p_0000000000000002'; k3 text := 'p_0000000000000003';
begin
  insert into cue_devices (user_id,name,platform,public_key,created_at,last_seen_at) values (u,'air','darwin','k1', now()-interval '30 d', now()-interval '20 d') returning id into d1;
  insert into cue_devices (user_id,name,platform,public_key,created_at,last_seen_at) values (u,'air','darwin','k2', now()-interval '20 d', now()-interval '10 d') returning id into d2;
  insert into cue_devices (user_id,name,platform,public_key,created_at,last_seen_at) values (u,'air','darwin','k3', now()-interval '5 d', now()-interval '1 d') returning id into d3;
  insert into cue_devices (user_id,name,platform,public_key,machine_id) values (u,'air','darwin','k4', repeat('c',64)) returning id into dm;
  insert into cue_devices (user_id,name,platform,public_key) values (u,'studio','linux','k5') returning id into d4;
  insert into cue_devices (user_id,name,platform,public_key) values (o,'air','darwin','k6') returning id into do1;
  insert into today_projects (user_id,name) values (u,'proj') returning id into tp;
  -- same 14 days resent under each link, plus a day only the oldest has, plus a later correction on d2
  insert into cue_project_days (user_id,device_id,project_key,date,seconds,updated_at) values
    (u,d1,k,'2026-11-10',3600,now()-interval '20 d'),(u,d2,k,'2026-11-10',3600,now()-interval '10 d'),(u,d3,k,'2026-11-10',3000,now()-interval '1 d'),
    (u,d1,k,'2026-11-09',1800,now()-interval '20 d'),
    (u,d2,k,'2026-11-08',900,now()-interval '10 d'),(u,d3,k,'2026-11-08',100,now()-interval '30 d'),
    (u,d1,'private','2026-11-10',600,now()-interval '20 d'),(u,d3,'private','2026-11-10',600,now()-interval '1 d'),
    (u,d4,k,'2026-11-10',7200,now()),(u,dm,k,'2026-11-10',50,now()),(o,do1,k,'2026-11-10',77,now());
  -- mappings: only the oldest has the today project; d3 has the key unmapped; k2 only on d2; k3 only on d1
  insert into cue_projects (user_id,device_id,project_key,name,today_project_id,updated_at) values
    (u,d1,k,'proj old',tp,now()-interval '20 d'),(u,d2,k,'proj',null,now()-interval '10 d'),(u,d3,k,'proj new',null,now()-interval '1 d'),
    (u,d2,k2,'two',null,now()),(u,d1,k3,'three',null,now()), (u,d4,k,'studio proj',null,now());
  insert into coding_time_settings (user_id, source) values (u,'cue');
  perform set_config('request.jwt.claim.role','service_role', true);
  perform reaggregate_cue_time(u);
  raise notice 'before: total %', (select total_seconds from user_coding_stats where user_id=u);
end $$;
