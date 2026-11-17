-- Who may call the Cue functions.
--
-- Postgres grants EXECUTE on every new function to PUBLIC, and Supabase also
-- grants it to anon and authenticated by default. Most functions added by
-- 20261115000000_cue_sync.sql are SECURITY DEFINER, so that default made all of
-- them callable by anyone with the anon key. Each one checks the caller, except
-- coding_time_source_of, which told anyone whether a given user tracks with
-- Cue or a tracker. This narrows every one of them to the callers that use it.
--
-- Additive in effect: it only removes privileges nobody relies on.

-- Internal helpers. Only other functions call these (as their owner), never
-- the Data API.
revoke all on function public.coding_time_source_of(uuid) from public, anon, authenticated;
revoke all on function public.cue_code_hash(text) from public, anon, authenticated;
revoke all on function public.reaggregate_tracker_time_impl(uuid) from public, anon, authenticated;

-- Signed-in users only (the web app's Cue pages and settings).
revoke all on function public.peek_cue_link(text) from public, anon;
revoke all on function public.approve_cue_link(text) from public, anon;
revoke all on function public.get_my_cue_devices() from public, anon;
revoke all on function public.revoke_cue_device(uuid, boolean) from public, anon;
revoke all on function public.get_my_cue_projects() from public, anon;
revoke all on function public.map_cue_project(uuid, text, uuid) from public, anon;
revoke all on function public.get_my_coding_time_source() from public, anon;
revoke all on function public.set_coding_time_source(text) from public, anon;
revoke all on function public.get_my_coding_time_comparison(integer) from public, anon;

grant execute on function public.peek_cue_link(text) to authenticated;
grant execute on function public.approve_cue_link(text) to authenticated;
grant execute on function public.get_my_cue_devices() to authenticated;
grant execute on function public.revoke_cue_device(uuid, boolean) to authenticated;
grant execute on function public.get_my_cue_projects() to authenticated;
grant execute on function public.map_cue_project(uuid, text, uuid) to authenticated;
grant execute on function public.get_my_coding_time_source() to authenticated;
grant execute on function public.set_coding_time_source(text) to authenticated;
grant execute on function public.get_my_coding_time_comparison(integer) to authenticated;

-- Signed-in users (for themselves) and the service role (time-tracker-sync, cue-sync).
revoke all on function public.reaggregate_tracker_time(uuid) from public, anon;
revoke all on function public.reaggregate_cue_time(uuid) from public, anon;
grant execute on function public.reaggregate_tracker_time(uuid) to authenticated, service_role;
grant execute on function public.reaggregate_cue_time(uuid) to authenticated, service_role;

-- get_user_coding_extras stays callable by anon on purpose: public profiles use
-- it, and it returns a row only when the stats are public or the caller's own.
