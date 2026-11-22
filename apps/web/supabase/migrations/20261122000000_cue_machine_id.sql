-- Cue: one device per machine per user.
--
-- Plan: docs/cue-device-identity.md (G21), part 2. Removing a machine and linking it again used to
-- create a second device, and the resent days were stored again under it.
--
-- Cue sends machineId, a hash of the machine's id (never the id), when it starts a link. The
-- function stores it on cue_links; approve_cue_link then reuses the user's device with that
-- machine_id instead of inserting: new key, name and platform, revoked_at cleared, request
-- window reset. The old key stops working at once, and the days Cue resends overwrite the same
-- rows. Old clients send no machineId and keep getting a new device each time.
--
-- Safe to run more than once. Apply this first; the cleanup (20261122000200) comes after Cue
-- ships machineId.

alter table public.cue_links
  add column if not exists machine_id text check (machine_id is null or machine_id ~ '^[0-9a-f]{64}$');

alter table public.cue_devices
  add column if not exists machine_id text check (machine_id is null or machine_id ~ '^[0-9a-f]{64}$');

create unique index if not exists cue_devices_user_machine_key
  on public.cue_devices (user_id, machine_id)
  where machine_id is not null;

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

  -- The same machine linking again takes over its device.
  if v_link.machine_id is not null then
    update public.cue_devices d
    set public_key = v_link.public_key,
        name = v_link.device_name,
        platform = v_link.platform,
        revoked_at = null,
        window_started_at = null,
        window_count = 0
    where d.user_id = v_uid and d.machine_id = v_link.machine_id
    returning d.id into v_device;
  end if;

  if v_device is null then
    insert into public.cue_devices (user_id, name, platform, public_key, machine_id)
    values (v_uid, v_link.device_name, v_link.platform, v_link.public_key, v_link.machine_id)
    returning id into v_device;
  end if;

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

grant execute on function public.approve_cue_link(text) to authenticated;
