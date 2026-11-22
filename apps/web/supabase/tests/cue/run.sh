#!/bin/bash
# Runs the Cue device identity migrations (G21) against a throwaway local Postgres and checks them.
# Needs Postgres on PATH (initdb, pg_ctl, psql). Touches nothing outside a temp directory.
#   bash apps/web/supabase/tests/cue/run.sh
set -euo pipefail
export LC_ALL=en_US.UTF-8
HERE="$(cd "$(dirname "$0")" && pwd)"
MIG="$HERE/../../migrations"
TMP="$(mktemp -d)"
PORT=55433
trap 'pg_ctl -D "$TMP/data" stop -m immediate >/dev/null 2>&1 || true; rm -rf "$TMP"' EXIT
initdb -D "$TMP/data" -U postgres -A trust --locale=en_US.UTF-8 >/dev/null
pg_ctl -D "$TMP/data" -o "-p $PORT -k $TMP" -l "$TMP/log" -w start >/dev/null
P() { psql -h "$TMP" -p $PORT -U postgres -v ON_ERROR_STOP=1 -q -d t "$@"; }
psql -h "$TMP" -p $PORT -U postgres -q -c "create database t" >/dev/null
P -f "$HERE/stub.sql"
# Stand-in for the rest of the app's schema these functions touch.
P -c "create table public.today_projects (id uuid primary key default gen_random_uuid(), user_id uuid references public.profiles(id), name text, is_public boolean default true);"
# The tracker migration's later statements need tables that are not in this repo; its early ones are enough.
P -f "$MIG/20260823000000_time_trackers.sql" >/dev/null 2>&1 || true
for f in 20261115000000_cue_sync 20261117000000_cue_function_grants 20261117000100_cue_fk_indexes 20261122000000_cue_machine_id 20261122000100_cue_day_cap; do
  P -f "$MIG/$f.sql" 2>&1 | grep -v NOTICE || true
done
P -f "$HERE/machine_id.sql" >/dev/null
P -f "$HERE/day_cap.sql" >/dev/null
# Cleanup runs on its own data, in a second database.
psql -h "$TMP" -p $PORT -U postgres -q -c "drop database t" -c "create database t" >/dev/null
P -f "$HERE/stub.sql" 2>&1 | grep -v "already exists" || true
P -c "create table public.today_projects (id uuid primary key default gen_random_uuid(), user_id uuid references public.profiles(id), name text, is_public boolean default true);"
P -f "$MIG/20260823000000_time_trackers.sql" >/dev/null 2>&1 || true
for f in 20261115000000_cue_sync 20261117000000_cue_function_grants 20261117000100_cue_fk_indexes 20261122000000_cue_machine_id 20261122000100_cue_day_cap; do P -f "$MIG/$f.sql" >/dev/null 2>&1; done
P -f "$HERE/cleanup_setup.sql" >/dev/null
P -f "$MIG/20261122000200_cue_device_cleanup.sql"
P -f "$HERE/cleanup_check.sql"
P -f "$MIG/20261122000200_cue_device_cleanup.sql"   # a second run changes nothing
P -f "$HERE/cleanup_check.sql"
echo "cue device identity: all checks passed"
