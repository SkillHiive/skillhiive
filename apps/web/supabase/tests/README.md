# Database tests

`cue_sync.test.sql` exercises the Cue sync migration against a plain Postgres
database. It needs no Supabase stack: `stub.sql` creates the few things the
migrations expect from Supabase (the `auth.uid()` / `auth.role()` helpers, the
three API roles) and from earlier, unversioned schema (`profiles`,
`today_projects`, `focus_sessions`, `session_notes`).

```bash
createdb shtest
psql -d shtest -v ON_ERROR_STOP=1 -f supabase/tests/stub.sql
psql -d shtest -v ON_ERROR_STOP=1 -f supabase/migrations/20260823000000_time_trackers.sql
psql -d shtest -v ON_ERROR_STOP=1 -f supabase/migrations/20261115000000_cue_sync.sql
psql -d shtest -v ON_ERROR_STOP=1 -f supabase/migrations/20261117000000_cue_function_grants.sql
psql -d shtest -v ON_ERROR_STOP=1 -f supabase/migrations/20261117000100_cue_fk_indexes.sql
psql -d shtest -v ON_ERROR_STOP=1 -f supabase/migrations/20261117000200_cue_project_privacy.sql
psql -d shtest -v ON_ERROR_STOP=1 -f supabase/tests/cue_sync.test.sql
psql -d shtest -v ON_ERROR_STOP=1 -f supabase/tests/cue_project_privacy.test.sql
```

The test files print `cue_sync: all checks passed` and `cue_project_privacy: all checks passed`, or stop at the first failed check. The second reuses the users the first creates.
