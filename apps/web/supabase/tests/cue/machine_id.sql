-- part 1: approve_cue_link reuses a device by machine id
insert into public.profiles (id, username) values ('00000000-0000-4000-8000-000000000001','rohan'), ('00000000-0000-4000-8000-000000000002','other');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001', false);
create temp table res (n text, v text);
do $$
declare m text := repeat('ab', 32); d1 uuid; d2 uuid; d3 uuid; n int;
begin
  insert into cue_links (user_code_hash, public_key, device_name, platform, machine_id, expires_at)
    values (cue_code_hash('AAAA-1111'), 'key1', 'air', 'darwin', m, now()+interval '10 min');
  select device_id into d1 from approve_cue_link('AAAA-1111');
  -- window used, then revoked
  update cue_devices set window_count = 9, window_started_at = now(), revoked_at = now() where id = d1;
  insert into cue_project_days (user_id, device_id, project_key, date, seconds) values ('00000000-0000-4000-8000-000000000001', d1, 'private', current_date, 3600);
  insert into cue_links (user_code_hash, public_key, device_name, platform, machine_id, expires_at)
    values (cue_code_hash('BBBB-2222'), 'key2', 'air2', 'darwin2', m, now()+interval '10 min');
  select device_id into d2 from approve_cue_link('BBBB-2222');
  assert d1 = d2, 'same machine reuses device';
  assert (select public_key from cue_devices where id=d1)='key2', 'new key';
  assert (select name from cue_devices where id=d1)='air2', 'new name';
  assert (select revoked_at from cue_devices where id=d1) is null, 'revoked cleared';
  assert (select window_count from cue_devices where id=d1)=0, 'window reset';
  assert (select count(*) from cue_project_days where device_id=d1)=1, 'days kept';
  assert (select device_id from cue_links where user_code_hash=cue_code_hash('BBBB-2222'))=d1, 'link points at device';
  -- no machine id: a new device each time
  insert into cue_links (user_code_hash, public_key, device_name, platform, expires_at) values (cue_code_hash('CCCC-3333'),'k3','old','darwin', now()+interval '10 min');
  insert into cue_links (user_code_hash, public_key, device_name, platform, expires_at) values (cue_code_hash('DDDD-4444'),'k4','old','darwin', now()+interval '10 min');
  select device_id into d3 from approve_cue_link('CCCC-3333'); assert d3 <> d1;
  assert (select device_id from approve_cue_link('DDDD-4444')) <> d3, 'old clients insert';
  -- another user with the same machine id gets their own device
  perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002', false);
  insert into cue_links (user_code_hash, public_key, device_name, platform, machine_id, expires_at) values (cue_code_hash('EEEE-5555'),'k5','x','y', m, now()+interval '10 min');
  assert (select device_id from approve_cue_link('EEEE-5555')) <> d1, 'other user separate';
  perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001', false);
  -- used / bad machine id
  begin
    update cue_links set machine_id='nothex' where user_code_hash=cue_code_hash('EEEE-5555'); assert false;
  exception when check_violation then null; end;
  raise notice 'part 1 ok';
end $$;
