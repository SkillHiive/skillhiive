-- Cue: merge the devices that were doubled by removing and linking a machine again.
--
-- Plan: docs/cue-device-identity.md (G21), part 4. Apply after 20261122000000 and 20261122000100,
-- and after Cue ships machineId, so no new duplicates appear behind it.
--
-- For each user, devices with the same name and platform and no machine_id are one machine.
-- The one kept is an active device if there is one, then the most recently seen. Every other
-- one is merged into it:
--   * cue_project_days: for each (project_key, date) the row with the latest updated_at stays,
--     the rest are deleted, and the survivors move onto the kept device;
--   * cue_projects: one row per project_key on the kept device; a today_project_id found on any
--     of them is kept, and name and remote come from the latest updated one;
--   * the merged device rows are deleted (cue_links.device_id is set null by its own rule).
-- Then reaggregate_cue_time runs for each affected user. Counts before and after are printed as
-- notices so the numbers can be checked. Running it again changes nothing.

do $$
declare
  g record;
  v_keep uuid;
  v_others uuid[];
  v_users uuid[] := '{}';
  v_user uuid;
  v_devices_before bigint;
  v_devices_after bigint;
  v_rows_before bigint;
  v_rows_after bigint;
  v_secs_before bigint;
  v_secs_after bigint;
  v_merged int := 0;
begin
  for g in
    select d.user_id, d.name, d.platform
    from public.cue_devices d
    where d.machine_id is null
    group by d.user_id, d.name, d.platform
    having count(*) > 1
  loop
    select d.id into v_keep
    from public.cue_devices d
    where d.user_id = g.user_id and d.name = g.name and d.platform = g.platform and d.machine_id is null
    order by (d.revoked_at is null) desc, coalesce(d.last_seen_at, d.created_at) desc, d.created_at desc, d.id
    limit 1;

    select array_agg(d.id) into v_others
    from public.cue_devices d
    where d.user_id = g.user_id and d.name = g.name and d.platform = g.platform and d.machine_id is null
      and d.id <> v_keep;

    select count(*), coalesce(sum(seconds), 0) into v_rows_before, v_secs_before
    from public.cue_project_days where user_id = g.user_id and device_id = any (v_others || v_keep);

    -- Days: the latest row per (project_key, date) wins.
    delete from public.cue_project_days x
    using (
      select r.device_id, r.project_key, r.date
      from (
        select d.device_id, d.project_key, d.date,
               row_number() over (
                 partition by d.project_key, d.date
                 order by d.updated_at desc, (d.device_id = v_keep) desc, d.device_id
               ) as rn
        from public.cue_project_days d
        where d.user_id = g.user_id and d.device_id = any (v_others || v_keep)
      ) r
      where r.rn > 1
    ) lose
    where x.device_id = lose.device_id and x.project_key = lose.project_key and x.date = lose.date;

    update public.cue_project_days
    set device_id = v_keep
    where user_id = g.user_id and device_id = any (v_others);

    -- Projects: one row per key on the kept device, the mapping carried over.
    update public.cue_projects keep
    set today_project_id = coalesce(keep.today_project_id, (
          select o.today_project_id from public.cue_projects o
          where o.user_id = g.user_id and o.device_id = any (v_others) and o.project_key = keep.project_key
            and o.today_project_id is not null
          order by o.updated_at desc limit 1)),
        updated_at = now()
    where keep.user_id = g.user_id and keep.device_id = v_keep
      and keep.today_project_id is null
      and exists (
        select 1 from public.cue_projects o
        where o.user_id = g.user_id and o.device_id = any (v_others) and o.project_key = keep.project_key
          and o.today_project_id is not null);

    delete from public.cue_projects o
    where o.user_id = g.user_id and o.device_id = any (v_others)
      and exists (select 1 from public.cue_projects k
                  where k.device_id = v_keep and k.project_key = o.project_key);

    -- Keys the kept device never had: pick one row per key (latest), drop the others, move it over.
    delete from public.cue_projects o
    using public.cue_projects later
    where o.user_id = g.user_id and o.device_id = any (v_others)
      and later.user_id = g.user_id and later.device_id = any (v_others)
      and later.project_key = o.project_key
      and (later.updated_at, later.device_id) > (o.updated_at, o.device_id);

    update public.cue_projects
    set device_id = v_keep
    where user_id = g.user_id and device_id = any (v_others);

    delete from public.cue_devices where user_id = g.user_id and id = any (v_others);

    select count(*), coalesce(sum(seconds), 0) into v_rows_after, v_secs_after
    from public.cue_project_days where user_id = g.user_id and device_id = v_keep;

    raise notice 'user %: "%" (%): % devices into 1; day rows % to %, raw seconds % to %',
      g.user_id, g.name, g.platform, coalesce(array_length(v_others, 1), 0) + 1,
      v_rows_before, v_rows_after, v_secs_before, v_secs_after;

    v_merged := v_merged + coalesce(array_length(v_others, 1), 0);
    v_users := v_users || g.user_id;
  end loop;

  -- reaggregate_cue_time checks for the service role; this migration is that caller.
  perform set_config('request.jwt.claim.role', 'service_role', true);
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  foreach v_user in array v_users loop
    if public.coding_time_source_of(v_user) = 'cue' then
      perform public.reaggregate_cue_time(v_user);
    end if;
  end loop;

  select count(*) into v_devices_after from public.cue_devices;
  raise notice 'cue cleanup: % duplicate devices merged for % users; % devices remain',
    v_merged, coalesce(array_length(v_users, 1), 0), v_devices_after;
end;
$$;
