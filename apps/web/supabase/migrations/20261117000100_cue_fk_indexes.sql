-- Indexes for the Cue foreign keys the database advisor flagged (unindexed_foreign_keys).
-- Without them, deleting a profile, a device or a project scans these tables.
create index if not exists idx_cue_links_approved_by on public.cue_links (approved_by);
create index if not exists idx_cue_links_device on public.cue_links (device_id);
create index if not exists idx_cue_projects_today_project on public.cue_projects (today_project_id);

-- cue_links has row-level security and, on purpose, no policies: link codes are reached
-- only through peek_cue_link / approve_cue_link and the service-role edge function.
comment on table public.cue_links is 'Pending Cue device links. RLS on with no policies by design: reached only through peek_cue_link, approve_cue_link and the cue-sync function.';
