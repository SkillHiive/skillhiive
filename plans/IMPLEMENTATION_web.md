# SkillHive Web — Implementation Plan

**Project:** `web` (React + Vite + Tailwind + Supabase + LiveKit)
**Role:** Social/Community Layer — companion to Stager (primary product)
**Strategy:** Support Stager's unified loop; provide verified proof display, ally network, fixed-time rooms
**Constraint:** No monetization until 1000 DAU; EdTech narrative deferred post-funding

---

## PHASE 1: CRITICAL FIXES (Week 1) — "Stop the Bleeding"

*These block production use. Must ship before any beta.*

### 1.1 vercel.json Permissions-Policy Fix (30 min)
**File:** `vercel.json`
**Issue:** `camera=(), microphone=()` blocks **own** video in production
**Fix:** Change to `camera=(self), microphone=(self)`
**Philosophy Layer:** 1 (Atmosphere) — Video in rooms is core to presence
**Risk:** Zero. One-line change. Test in Vercel preview deploy.

### 1.2 AuthGate → Single Auth Provider (2 hrs)
**Files:** `src/components/AuthGate.tsx`, `src/main.tsx`, `src/App.tsx`
**Issue:** Re-checks session on every route → blank flicker
**Fix:** 
- Create `AuthProvider` at root (`src/providers/AuthProvider.tsx`)
- Single `onAuthStateChange` listener
- Expose `user`, `session`, `loading` via context
- Remove `AuthGate` wrapper from routes
**Philosophy Layer:** 1 (Atmosphere) — Friction-free entry
**Risk:** Medium. Touch all protected routes. Test: refresh on `/room/x`, `/profile`, `/settings`.

### 1.3 Lenis Smooth-Scroll Memory Leak (1 hr)
**File:** `src/components/AnimatedRoutes.tsx` (or wherever Lenis init lives)
**Issue:** `new Lenis({autoRaf: true})` on every render → accumulating animation loops
**Fix:** Move to `useEffect` with cleanup:
```tsx
useEffect(() => {
  const lenis = new Lenis({ autoRaf: true })
  return () => lenis.destroy()
}, [])
```
**Philosophy Layer:** 1 (Atmosphere) — Performance = respect
**Risk:** Low. Isolated component.

### 1.4 Token Server: Ignore Client `username=` Param (30 min)
**File:** `/tmp/skillhiive-backend/server.js` (deployed at `api.skillhivelabs.com`)
**Issue:** Client sends `username=` query param; server should derive from JWT only
**Fix:** Verify `profile.username` from JWT matches param; if not, reject. Never trust client param.
**Philosophy Layer:** 3 (Structured Focus) — Identity integrity for rooms
**Risk:** Low. Backend-only change.

### 1.5 Terms & Privacy Pages (2 hrs)
**Files:** New `src/pages/Terms.tsx`, `Privacy.tsx` + routes
**Issue:** Registration links to non-existent pages; legal exposure
**Fix:** Minimal, honest versions:
- Terms: "No spam, no data selling, you own your work, we can ban bad actors"
- Privacy: "We store: email, username, avatar, coding stats (opt-in), room presence. Supabase + LiveKit process video. No tracking pixels."
**Philosophy Layer:** 1 (Atmosphere) — Trust foundation
**Risk:** Zero. Content only.

---

## PHASE 2: CORE LOOP INTEGRITY (Week 2) — "Make the Philosophy Work"

*These fix the broken promises in the code: room cap, shared rhythm, cubicle privacy.*

### 2.1 Room Cap Enforcement — Server-Side (4 hrs)
**Files:** 
- Supabase migration: `room_cap.sql`
- RPC: `can_join_room(room_name, user_id)` → returns `{ allowed: boolean, reason?: string }`
- `Room.tsx`: Call RPC before `fetchToken()`; show "Room full" if denied
- LiveKit: Set `max_participants: 12` on room creation (token server)

**Logic:**
```sql
-- Atomic check under lock
SELECT COUNT(*) FROM room_participants 
WHERE room_name = $1 AND left_at IS NULL
FOR UPDATE;
-- If < 12, insert participant row, return allowed=true
```

**Philosophy Layer:** 3 (Structured Focus) — "10-12 cap" is non-negotiable
**Risk:** Medium. Requires `room_participants` table (missing from migrations). Race condition possible — use `FOR UPDATE`.

### 2.2 Shared Rhythm: Server Time Offset + Server-Enforced Mic Lock (6 hrs)
**Files:**
- `src/hooks/useRoomSession.ts` + `sessionPhase.ts`
- `src/pages/Room.tsx` (mic lock logic)
- Token server: return `server_time` in token response
- LiveKit: Use metadata or data channel for phase sync

**Fix:**
1. **Token server** includes `server_time: Date.now()` in JWT or response
2. **Client** computes `timeOffset = server_time - Date.now()` at join
3. **`computePhase`** uses `now = Date.now() + timeOffset` (not raw `Date.now()`)
4. **Mic lock**: Move to LiveKit room metadata — server publishes phase state; clients subscribe and enforce locally (but source of truth = server)
5. **Phase display**: All clients render from same server-synced clock

**Philosophy Layer:** 3 (Structured Focus) — "Shared rhythm" is the differentiator
**Risk:** High. Clock sync is subtle. Test: 2 laptops, different system times, verify same phase + mic lock/unlock simultaneously.

### 2.3 Cubicle Privacy: Private LiveKit Channels (4 hrs)
**Files:**
- `src/pages/Room.tsx` (signaling logic)
- Token server: new endpoint `/getCubicleToken` with participant validation
- Supabase: Remove public broadcast signaling; use LiveKit's built-in room separation

**Fix:**
1. **Cubicle = separate LiveKit room** (already implemented)
2. **Token server** validates: only the two invited users get tokens for that cubicle room
3. **Signaling**: Use LiveKit data channels or Supabase Realtime **private channels** (not broadcast)
4. **Client**: `cubicleRoomName` never exposed to non-participants

**Philosophy Layer:** 3 (Structured Focus) — Private pair programming = trust
**Risk:** Medium. LiveKit private rooms need token auth. Test: 3rd user tries to join cubicle → denied.

### 2.4 Cue ↔ Web Sync: Replace Wakatime/Hackatime (6 hrs)
**Files:**
- Supabase migration: `cue_sync_schema.sql` — new tables: `cue_events`, `cue_sessions`, `cue_projects` (replaces `time_tracker_*`)
- Backend: New endpoint `/cue/push` — receives Cue PushBody (outbox sync) from Cue CLI
- Frontend: `src/hooks/useCueSync.ts` — polls/websockets for real-time heatmap/streak updates
- `SettingsTrackers.tsx`: Replace "Connect Wakatime/Hackatime" with "Connect Cue" (shows Cue version, last sync, projects from Cue threads)
- Deprecate: `time_tracker_connections`, `time_tracker_projects_raw`, `time_tracker_project_mappings`, `project_coding_time`, `user_coding_stats` → archive or migrate

**Cue PushBody Schema (from `packages/store/src/outbox.ts` — what Cue actually sends):**
```typescript
// Cue's outbox push body — source of truth for sync
interface PushBody {
  deviceId: string;
  threads: Thread[];                    // {id, name, status, tier, root, origin, created_at, updated_at, last_active_at}
  threadKeys: ThreadKey[];              // {thread_id, kind, value}
  events: Event[];                      // {t, k:'run'|'cd'|'start', d, c?, x?, ms?, h, p}
  captures: Capture[];                  // {id, at, thread_id, text, source}
  ops: Op[];                            // {id, at, actor, kind, thread_id, before, after, undone_at}
  saveStates: SaveState[];              // Full SaveState: threadId, version, at, trigger, tier, by, line, fields, refs, factHash, baseVersion, device
  sessions: Session[];                  // OpenCode sessions: {id, source, parent_id, thread_id, directory, title, model, additions, deletions, files, files_list, created_at, updated_at, excerpt_hash, distilled_hash}
  excerpts: Excerpt[];                  // {sessionId, threadId, tier, excerpt, files, created_at}
  jobs: Job[];                          // {id, kind, key, payload, status, priority, attempts, run_after, last_error, created_at, updated_at}
}
```

**Web Schema Design (maps Cue PushBody → Web tables):**
```sql
-- Full-context work events from Cue (maps to Cue's events + sessions + saveStates)
create table cue_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  cue_device_id text not null,          -- Cue's deviceId
  event_type text not null,             -- 'shell' | 'editor' | 'git' | 'browser' | 'ai_session' | 'cd'
  project_path text,                    -- repo root (from event.d)
  project_name text,                    -- derived or user-mapped
  metadata jsonb not null,              -- Cue Event: {file, language, lines_changed, command, exit_code, duration_ms, host, shell_pid}
  started_at timestamptz not null,      -- event.t
  ended_at timestamptz,
  duration_ms int,                      -- event.ms
  synced_at timestamptz default now()
);

-- Aggregated sessions (maps to Cue's sessions + threads + saveStates)
create table cue_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  cue_thread_id text not null,          -- Cue's thread.id (ThreadId format: ^[a-z0-9][a-z0-9-]{0,47}$)
  cue_device_id text not null,
  project_id uuid references today_projects(id),  -- user-mapped SkillHive project
  status text,                          -- Cue thread status: 'spotlight'|'push'|'dormant'|'frozen'
  tier text,                            -- 'open'|'local'
  total_ms bigint,                      -- aggregated duration
  event_counts jsonb,                   -- {shell: 47, editor: 12, git: 3, browser: 5, ai_session: 2}
  languages jsonb,                      -- {typescript: 120000, rust: 45000, ...}
  refs jsonb,                           -- Cue Refs: branch, head, dirty, topFiles, lastFail, recentCmds, minutesToday
  fields jsonb,                         -- Latest SaveState.fields (doing, next, open, confidence)
  fact_hash text,                       -- SaveState.factHash
  version int,                          -- SaveState.version
  started_at timestamptz,
  ended_at timestamptz,
  last_active_at timestamptz,           -- thread.last_active_at
  synced_at timestamptz default now()
);

-- Project mapping (Cue thread → SkillHive today_project)
create table cue_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  cue_thread_id text not null unique,   -- Cue thread.id
  today_project_id uuid references today_projects(id),
  remote_url text,                      -- git remote
  created_at timestamptz default now()
);
```

**Sync Flow:**
1. Cue CLI runs `cue sync push` → POST `/cue/push` with PushBody (Bearer token = Cue device token)
2. Backend validates token → maps `deviceId` → `user_id` (via Supabase auth)
3. Backend upserts `cue_events`, `cue_sessions`, `cue_projects`
4. Web `useCueSync` hook polls Supabase Realtime on `cue_sessions` → updates heatmap/streaks in real-time

**Philosophy Layer:** 2 (Personal Work System) — **Cue = full-context verified work (shell + editor + git + browser + AI), not just editor time**
**Risk:** Medium. Schema migration + new sync protocol. Coordinate with Cue CLI `cue sync push` implementation.
**Note:** Cue PushBody is defined in `packages/store/src/outbox.ts:10-21`. Backstage `/v1/push` already exists — Web needs `/cue/push` that translates.

---

### 2.5 Wakatime/Hackatime: Deprecate & Archive (2 hrs)
**Files:**
- Remove `useTimeTracker.ts`, `WakatimeConnectCard.tsx`, `TrackerProjectPickerModal.tsx`
- Backend: Comment out `timeTrackerSync.js` cron; keep code for reference
- Supabase: Archive `time_tracker_*` tables (rename to `archived_time_tracker_*`)
- Settings: Remove tracker connections UI

**Philosophy Layer:** 2 — Clean break; no dual-tracking confusion
**Risk:** Low. Removal only.

---

## PHASE 3: BETA READINESS (Week 3) — "Fixed-Time Rooms + Cold Start"

*The cold start problem: 10 users = 5 rooms of 2. Fixed-time rooms solve this.*

### 3.1 Fixed-Time Room Infrastructure (4 hrs)
**Files:**
- Supabase: `fixed_rooms` table (name, schedule_cron, timezone, max_participants)
- Backend: Cron job → creates LiveKit rooms at scheduled times
- Frontend: `src/components/FixedRoomSchedule.tsx` — shows "Next: 9:00 AM (starts in 12m)"
- Notification: Supabase Realtime → "Room 'Morning Focus' starts in 10 minutes"

**Schedule (IST):**
| Room | Time | Purpose |
|------|------|---------|
| `morning-deep-work` | 9:00 AM | Primary builder session |
| `afternoon-push` | 2:00 PM | Second wind |
| `night-owls` | 9:00 PM | Late shift |

**Philosophy Layer:** 3 (Structured Focus) — Concurrency of humans > features
**Risk:** Low. Operational, not complex.

### 3.2 "Starts in 10min" Notifications (2 hrs)
**Files:** `src/hooks/useRoomNotifications.ts` + Supabase Realtime
**Fix:** Subscribe to `fixed_rooms` changes; push local notification (browser + in-app) at T-10min
**Philosophy Layer:** 1 (Atmosphere) — Gentle reminders, no spam

### 3.3 Beta Onboarding Flow (3 hrs)
**Files:** `src/pages/Register.tsx` → `src/pages/Onboarding.tsx` (new)
**Flow:**
1. Register → **Install Cue CLI** (one-liner: `curl -fsSL cue.skillhiive.com/install.sh | bash`) → `cue auth login` (opens web, links device)
2. Create first project (name + description)
3. Pick ally suggestions (from Hack Club / contacts)
4. Show fixed-time schedule → "Join 9am tomorrow?"
5. Land in Home (Today) with project pre-selected

**Philosophy Layer:** 2 (Personal Work System) — Day 1 value = retention; Cue install = commitment signal

### 3.4 Mobile Parity: Room Join + Today (6 hrs)
**Files:** `skillhiive/mobile/app/rooms/[roomName].tsx`, `app/main/index.tsx`
**Scope:** 
- Room join flow (lobby → video → phases)
- Today view (intent → focus → capture)
- Push notifications for fixed-time rooms
**Philosophy Layer:** 1 (Atmosphere) — Mobile = companion, not second-class
**Decision:** Expo parity confirmed. Invest here.

---

## PHASE 4: BETA EXECUTION (Week 4) — "The 7-Day Test"

*No code. Pure operation. Measure or die.*

### 4.1 Recruitment (Day 1-2)
- **Target:** 15 Hack Club members (already use Hackatime) → **migrate to Cue** during onboarding
- **Channel:** Hack Club Slack, Twitter, personal outreach
- **Incentive:** Early access + "Founding Member" badge + direct line to founder + **Cue CLI install support**
- **Exclude:** Friends who'll be nice. Strangers who'll be honest.
- **Migration support:** Dedicated Discord channel for Cue install help; 1-click install script

### 4.2 Beta Protocol (Day 3-9)
| Day | Action |
|-----|--------|
| 1 | Onboard cohort → join 9am room together |
| 2 | Observe: who returns unprompted? |
| 3 | **Measure Day-3 organic return** (primary metric) |
| 4 | Survey: "What made you come back?" / "What annoyed you?" |
| 5 | Fix critical bugs only (no features) |
| 6 | Measure captures/user, ally connections |
| 7 | **Measure Day-7 return** |
| 8 | NPS survey + 15-min calls with 5 users |
| 9 | **Go/No-Go decision** |

### 4.3 Success Criteria (Non-Negotiable)
| Metric | Threshold | Action if Missed |
|--------|-----------|------------------|
| Day-3 organic return | ≥40% (≥6/15) | **Kill web rooms. Pivot expression.** |
| Avg mins/room/session | ≥35 | Fix room UX / phase clarity |
| Captures/user/day | ≥1 | Simplify capture flow |
| Ally connections/user | ≥2 | Improve ally discovery |
| NPS | ≥8/10 | Deep dive on detractors |

**Philosophy Layer:** All — This validates the entire philosophy stack.

---

## PHASE 5: POST-SIGNAL ROADMAP (Month 2-6) — "Scale What Works"

*Only if Phase 4 passes. Priority order reflects Stager-primary strategy.*

### 5.1 Stager ↔ Web Integration (Month 2) — **Highest Leverage**
**Files:** Stager (Tauri IPC) + Web (Supabase RPCs)
**Tasks:**
- Stager `cue stop` → overnight brief → writes to Supabase (`posts`, `project_updates`, `ally_signals`)
- Web reads overnight results → shows in Stager "Projects" + Web "Feed" + Project page
- Stager "Today" surface reads actual Cue thread state (via IPC `cue go --json`)
- Web heatmap/streaks reflect Stager focus sessions (unified `focus_sessions` table)

**Philosophy Layer:** 2+4 (Unified Loop) — The killer feature

### 5.2 Premium Workroom Tiers (Month 3-4, **after 1000 DAU**)
**Files:** `src/components/PremiumUpgrade.tsx`, Supabase `subscriptions` table, Stripe integration
**Tiers:**
| Feature | Free | Premium (₹199/mo) |
|---------|------|-------------------|
| Public rooms | ✅ | ✅ |
| Private rooms (create) | ❌ | ✅ |
| Advanced analytics | 7-day | 365-day + insights |
| Custom themes | ❌ | ✅ |
| Priority entry (full rooms) | ❌ | ✅ |
| Cubicle history | ❌ | ✅ |

**Philosophy Layer:** 3 (Monetize workroom, not courses)
**Constraint:** Not before 1000 DAU per your call.

### 5.3 Institution Rooms / Teams (Month 3-4)
**Files:** `skillhiive/teams` (already built) → unify with web backend
**Tasks:**
- Shared LiveKit + Supabase (same infra)
- TeamOffice: private rooms, shared rhythm, calendar, announcements
- Admin dashboard: aggregate focus hours (privacy-preserving)
- Billing: ₹50k-2L/yr per org

**Philosophy Layer:** 5 (B2B recurring, independent of courses)

### 5.4 Verified Portfolios for Employers (Month 5-6)
**Files:** `src/pages/EmployerView.tsx`, Supabase `employer_access` table
**Features:**
- Employer searches by skill/tech/project type
- Sees: heatmap, shipped notes, code snippets, ally endorsements
- "Request intro" → ally-mediated (not cold email)
- Revenue: ₹10k-50k per hire / subscription

**Philosophy Layer:** 5 (Trust economy)

### 5.5 Theme Marketplace Architecture (Month 6, **ready not built**)
**Files:** `src/theme/marketplace/` (stub), Supabase `themes` table
**Design:**
- Creators submit theme JSON (CSS variables + metadata)
- Platform reviews → publishes → 70/30 split
- Users preview + one-click install
- **Not built yet** — but theme system already supports it (CSS variables)

**Philosophy Layer:** 5 (Zero marginal cost, community-built)

---

## TECHNICAL DEBT: ACCEPTED (Not Blocking)

| Item | Reason | Revisit |
|------|--------|---------|
| `Room.tsx` 3058 lines | Works; refactor post-signal | Month 3 |
| 58 lint errors | Cleanup sprint | Month 2 |
| Bundle 1.49MB JS | Lazy-load Room/3D post-signal | Month 3 |
| Three icon libraries | Standardize on `lucide-react` | Month 2 |
| `framer-motion` not in deps | Add to `package.json` | Week 1 |
| Groote font (demo license) | Delete from repo | Week 1 |

---

## RISK MITIGATION

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Clock sync fails in production | Medium | High (breaks core loop) | Test with 5 devices, different timezones; fallback to NTP |
| LiveKit self-hosted scale limits | Low | High | Load test 500 concurrent before beta; have Cloud fallback plan |
| Supabase RLS bugs on new tables | Medium | Medium | Write integration tests for every policy; `pgTAP` |
| Beta recruitment fails | Low | High | Pre-recruit 20 Hack Club contacts; have backup list |
| Stager IPC integration complex | High | High | Define JSON schema first; build minimal `cue go --json` in Week 1 |
| Mobile parity slips | Medium | Medium | Scope: Room + Today only; defer Feed/Profile to Month 3 |
| **Cue sync schema mismatch** | **High** | **High (breaks heatmaps)** | **Define Cue event schema *before* Phase 2.4; contract test CLI ↔ Web** |
| **Cue install friction for beta users** | **Medium** | **High (low onboarding)** | **One-line installer; guided auth flow; fallback to manual token** |

---

## DEPENDENCIES ON OTHER REPOS

| Repo | What Web Needs | When |
|------|----------------|------|
| **Stager** | `cue go --json`, `cue threads --json`, `cue stop --json` output; IPC layer | Month 2 |
| **Cue** | **CLI `cue sync push` endpoint schema**; overnight brief schema; install script; auth flow | **Phase 2.4 (Week 2)** |
| **Backstage** | Orchestrate job kind; publish-post job kind | Month 2 |
| **Teams** | Shared LiveKit/Supabase config; unified room model | Month 3 |
| **Backend** | Token server fixes (username param, server_time, cubicle tokens) + **`/cue/push` endpoint** | Week 1 + Phase 2.4 |
| **LiveKitSDK** | `max_participants` room config; private room support | Week 2 |

---

## DEFINITION OF DONE (Per Phase)

| Phase | Done When |
|-------|-----------|
| 1 | All 5 fixes deployed to Vercel preview; manual test passes |
| 2 | 3 users in room: same phase, mic locks/unlocks together; cubicle private; room cap blocks 13th |
| 3 | 3 fixed rooms run daily; notifications fire; 15 beta users onboarded |
| 4 | Metrics measured; Go/No-Go decision documented |
| 5 | Stager ↔ Web loop works end-to-end; premium tested at 1000 DAU |

---

## QUESTIONS RESOLVED (From Your Calls)

| # | Question | Decision |
|---|----------|----------|
| 1 | Web primary or Stager companion? | **Stager primary. Web = social/community layer.** |
| 2 | EdTech narrative in deck? | **Deferred post-funding. Purge from current deck.** |
| 3 | Teams relationship? | **Same infra (LiveKit + Supabase), personalized for teams.** |
| 4 | LiveKit self-hosted? | **Yes. Load test before capacity claims.** |
| 5 | Mobile strategy? | **Expo parity for Room + Today.** |
| 6 | Premium timing? | **After 1000 DAU (not Month 4).** |
| 7 | Theme marketplace? | **Dropped for now. Architecture ready.** |
| 8 | Time tracking source? | **Cue only. Wakatime/Hackatime deprecated. Cue sync in Phase 2.4.** |

---

## NEXT STEPS

1. **You approve this plan** → I create task breakdown with file-level details
2. **Week 1 sprint** → Phase 1 fixes (5 tasks, ~8 hrs total)
3. **Daily sync** → Blockers, decisions, progress
4. **Phase 2 kickoff** → Only after Phase 1 deployed and tested

**Ready to proceed with Phase 1 task breakdown?**