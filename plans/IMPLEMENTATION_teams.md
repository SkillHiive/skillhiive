# SkillHive Teams — Implementation Plan

**Project:** `teams` (React + Vite + Supabase + LiveKit)
**Role:** Org Layer — TeamOffice, shared rhythm, calendar, announcements
**Strategy:** Unify with Web (same infra), then extend with team-specific features
**Constraint:** Same Supabase + LiveKit as Web; no separate deploys

---

## PHASE 1: WEB + TEAMS UNIFICATION (Week 1-2) — "Single Deploy"

*Teams currently separate repo but same Supabase/LiveKit. Unify for single deploy, shared components.*

### 1.1 Repository Merge Strategy (2 hrs)
**Decision:** Merge `teams/` into `web/` as feature routes under `/teams/*`
**Structure:**
```
web/
├── src/
│   ├── pages/
│   │   ├── teams/              # NEW: Teams routes
│   │   │   ├── TeamsPage.tsx
│   │   │   ├── TeamOffice.tsx
│   │   │   ├── TeamDetail.tsx
│   │   │   ├── TeamOffice.tsx
│   │   │   └── components/     # Team-specific components
│   │   └── ...                 # Existing Web pages
│   ├── components/
│   │   ├── team/               # NEW: Shared team components
│   │   │   ├── TeamCalendar.tsx
│   │   │   ├── AnnouncementBanner.tsx
│   │   │   ├── RitualsPanel.tsx
│   │   │   ├── BreakRoom.tsx
│   │   │   ├── NotesDrawer.tsx
│   │   │   ├── TeamMemberDesk.tsx
│   │   │   └── RhythmBar.tsx
│   │   └── ...                 # Existing shared components
│   ├── hooks/
│   │   ├── useTeam.ts          # NEW: Team context
│   │   ├── useTeamRhythm.ts    # NEW: Rhythm sync
│   │   └── ...                 # Existing hooks
│   └── lib/
│       ├── supabase.ts         # Shared client
│       └── livekit.ts          # Shared LiveKit
```

**Migration Steps:**
1. Copy `teams/src/pages/*` → `web/src/pages/teams/`
2. Copy `teams/src/components/*` → `web/src/components/team/`
3. Copy `teams/src/hooks/*` → `web/src/hooks/` (prefix with `useTeam`)
4. Copy `teams/supabase/migrations/*` → `web/supabase/migrations/` (renumber)
5. Update imports: `@/lib/supabase` → shared, `@/components/ui` → shared
6. Add `/teams/*` routes to `web/src/App.tsx` with feature flag

**Philosophy Layer:** 1 (Atmosphere) — Single deploy, shared infra
**Risk:** Medium. Route conflicts, component naming, Supabase migration ordering.

### 1.2 Shared Component Library (3 hrs)
**Files:** `web/src/components/team/` (new), `web/src/components/ui/` (audit)
**Tasks:**
- Move team-specific components to `components/team/`
- Audit `components/ui/` for duplicates (Button, Card, Avatar, etc.) → use Web's
- Extract design tokens: `teams/src/components/ui/` → `web/src/theme/`
- Ensure `ThemeProvider` works for both Web + Teams routes

**Philosophy Layer:** 1 (Atmosphere) — Consistent design language
**Risk:** Low. Component consolidation.

### 1.3 Unified Auth + LiveKit (2 hrs)
**Files:** `web/src/hooks/useAuth.ts`, `web/src/lib/livekit.ts`
**Tasks:**
- Verify `useAuth` works for both `/teams/*` and Web routes
- Single LiveKit token endpoint (`/getToken`) with `room` + `team_id` context
- Shared `supabase` client with RLS policies for `team_id` context

**Philosophy Layer:** 1 (Atmosphere) — Zero-friction auth
**Risk:** Low. Already shared Supabase project.

### 1.4 Feature Flag + Routing (1 hr)
**Files:** `web/src/App.tsx`, `web/src/routes.tsx`
**Implementation:**
```tsx
// Feature flag for Teams (can be env var)
const TEAMS_ENABLED = import.meta.env.VITE_TEAMS_ENABLED === 'true';

<Routes>
  {/* Web routes */}
  <Route path="/" element={<Layout />}>
    <Route index element={<Home />} />
    <Route path="room/:roomName" element={<Room />} />
    {/* ... */}
  </Route>
  
  {/* Teams routes (conditionally rendered) */}
  {TEAMS_ENABLED && (
    <Route path="/teams/*" element={<TeamLayout />}>
      <Route path="teams" element={<TeamsPage />} />
      <Route path="teams/:teamId" element={<TeamOffice />} />
      <Route path="teams/:teamId/detail" element={<TeamDetail />} />
    </Route>
  )}
</Routes>
```

**Philosophy Layer:** 1 (Atmosphere) — Gradual rollout, easy rollback
**Risk:** Low. Standard routing.

---

## PHASE 2: TEAM ANALYTICS DASHBOARD (Week 2-3) — "Admin Insights"

*RPCs exist (`get_team_sync_rate`, `get_team_focus_hours`, `get_team_schedule`). Need admin UI.*

### 2.1 Team Analytics Page (6 hrs)
**Files:** `web/src/pages/teams/TeamAnalytics.tsx` (new), `web/src/components/team/AnalyticsDashboard.tsx` (new)
**Widgets:**
| Widget | Data Source | Refresh |
|--------|-------------|---------|
| **Sync Rate (7d)** | `get_team_sync_rate` | Daily |
| **Focus Hours (7d/30d)** | `get_team_focus_hours` | Daily |
| **Member Activity** | `team_rhythm` + `team_members` | Realtime |
| **Rhythm Sessions** | `team_rhythm` transitions | Realtime |
| **Video Usage** | `usage_tracking` (team tier) | Daily |
| **Schedule Adherence** | `team_schedule` vs actual | Daily |

**UI:** Grid layout, date range picker, export CSV button
**Philosophy Layer:** 5 (Team Economy) — Admin insights drive retention
**Risk:** Medium. Data aggregation, charting library.

### 2.2 Team Health Indicators (3 hrs)
**Files:** `web/src/components/team/TeamHealthCard.tsx` (new)
**Indicators:**
| Indicator | Green | Yellow | Red |
|-----------|-------|--------|-----|
| **Weekly Sync Rate** | ≥80% | 50-80% | <50% |
| **Avg Sessions/Week** | ≥3 | 1-3 | <1 |
| **Member Retention** | ≥80% | 60-80% | <60% |
| **Video Usage (Team)** | Growing | Flat | Declining |

**Philosophy Layer:** 5 (Team Economy) — Early warning system
**Risk:** Low. UI only.

### 2.3 Team Settings Enhancement (3 hrs)
**Files:** `web/src/pages/teams/TeamSettings.tsx` (enhance)
**Add:**
- Rhythm config UI (focus/break/long break durations)
- Member roles management (admin/member/guest)
- Schedule management UI (link to TeamCalendar)
- Announcement management
- DND defaults for team
- Subscription tier display + upgrade button

**Philosophy Layer:** 2 (Team Structure) — Self-serve admin
**Risk:** Low. Standard settings UI.

---

## PHASE 3: BACKSTAGE INTEGRATION (Week 3-4) — "Team Orchestration"

*Backstage `orchestrate-task` job kind + Stager TeamOffice integration.*

### 3.1 Team Orchestration Job Kind (4 hrs)
**Files:** Backstage `src/orchestration.ts`, `src/queue.ts` (modify)
**New Job Kind:** `orchestrate-team-task`
**Payload:**
```typescript
{
  taskId: string,
  teamId: string,
  brief: string,
  projectThreadId: string,
  assigneeUserId?: string,  // optional, for team assignment
  agent: 'opencode' | 'codex',
  worktreePath: string
}
```

**Queue Lane:** New `team-orchestration` lane (separate from personal)
**Philosophy Layer:** 4 (Orchestration Engine) — Team tasks run on Backstage
**Risk:** High. Team context, assignee routing.

### 3.2 Team Task Assignment Flow (4 hrs)
**Files:** Stager `src/components/team/TeamTaskAssignment.tsx` (new), Backstage API
**Flow:**
1. TeamLead in Stager TeamOffice → "New Team Task"
2. Select project, write brief, assign to member (or "anyone")
3. Creates Cue task → Backstage `orchestrate-team-task` job
4. Backstage runs OpenCode in worktree → emits progress events
5. TeamOffice shows task in "Team Tasks" panel with progress
6. Assignee gets notification → can review diff in Stager

**Philosophy Layer:** 4 (Orchestration Engine) — Team tasks visible to all
**Risk:** High. Multi-user assignment, notification routing.

### 3.3 Team Task Visibility in TeamOffice (3 hrs)
**Files:** `web/src/components/team/TeamTasksPanel.tsx` (new)
**Features:**
- List of team tasks (status: pending/running/review/merged)
- Filter by assignee, project, status
- Click → opens Stager deep link for review
- Real-time updates via Backstage WS

**Philosophy Layer:** 4 (Orchestration Engine) — Shared visibility
**Risk:** Medium. Real-time sync, deep linking.

---

## PHASE 4: MOBILE TEAMOFFICE (Week 4-5) — "Expo Parity"

*Mobile app has Room + Today. Needs TeamOffice.*

### 4.1 Expo TeamOffice Implementation (8 hrs)
**Files:** `mobile/app/teams/[teamId].tsx` (new), `mobile/components/team/` (new)
**Scope:**
- TeamOffice screen with member desks grid
- Rhythm bar (shared with Room)
- Notes drawer (focus phase)
- Break room (break phase)
- Team calendar view
- Announcements banner

**Shared Logic:** Extract rhythm engine to `@skillhiive/team-rhythm` package (shared Web + Mobile)
**Philosophy Layer:** 1 (Atmosphere) — Mobile = companion, not second-class
**Risk:** Medium. Expo LiveKit + Realtime on mobile.

### 4.2 Push Notifications for Teams (4 hrs)
**Files:** `mobile/app/_layout.tsx`, Backstage `push.ts` (modify)
**Events:**
| Event | Payload | Deep Link |
|-------|---------|-----------|
| `team_rhythm_start` | `{teamId, phase}` | `teams://team/{teamId}` |
| `team_task_assigned` | `{taskId, teamId}` | `stager://task/{taskId}` |
| `team_announcement` | `{teamId, body}` | `teams://team/{teamId}` |
| `team_rhythm_break` | `{teamId}` | `teams://team/{teamId}` |

**Philosophy Layer:** 5 (Team Economy) — Mobile awareness
**Risk:** Medium. Expo push + Backstage FCM/APNs.

---

## PHASE 5: ENTERPRISE FEATURES (Month 2-3) — "Scale & Compliance"

### 5.1 SSO + Audit Logs (8 hrs)
**Files:** `web/src/auth/sso.ts` (new), `web/src/pages/teams/TeamAuditLog.tsx` (new)
**SSO Providers:** SAML 2.0, OIDC (Okta, Azure AD, Google Workspace)
**Audit Events:**
| Event | Data |
|-------|------|
| `team.created` | `{teamId, creatorId, name}` |
| `member.invited` | `{teamId, inviterId, inviteeId}` |
| `member.joined` | `{teamId, userId, role}` |
| `rhythm.started` | `{teamId, adminId, config}` |
| `task.orchestrated` | `{teamId, taskId, assigneeId}` |
| `subscription.changed` | `{teamId, oldTier, newTier}` |

**Export:** CSV/JSON, date range, filter by event/user
**Philosophy Layer:** 5 (Team Economy) — Enterprise compliance
**Risk:** High. SAML/OIDC complexity, audit storage.

### 5.2 Team Templates (4 hrs)
**Files:** `web/src/pages/teams/TeamTemplates.tsx` (new), Supabase seed data
**Templates:**
| Template | Schedule | Rhythm Config | Rituals |
|----------|----------|---------------|---------|
| **Study Group** | Mon/Wed/Fri 7pm | 50/10, 4 sessions | Check-in, weekly review |
| **Sprint Team** | Mon-Fri 10am | 50/10, 4 sessions | Standup, retro, planning |
| **Bootcamp** | Mon-Fri 9am | 50/10, 6 sessions | Daily check-in, mentor sync |
| **Async Team** | Tue/Thu 2pm | 90/20, 2 sessions | Weekly sync, async notes |

**One-click create:** "Use Template" → pre-fills team create modal
**Philosophy Layer:** 2 (Team Structure) — Reduce setup friction
**Risk:** Low. Data seeding.

### 5.3 Guest Access (4 hrs)
**Files:** `web/src/pages/teams/GuestAccess.tsx` (new), RLS policies
**Features:**
- Generate guest link (expires, read-only rhythm)
- Guest sees: member desks, rhythm phase, announcements
- Guest cannot: start rhythm, write notes, join break room
- Team admin can revoke anytime

**Philosophy Layer:** 2 (Team Structure) — External collaboration
**Risk:** Medium. RLS complexity, link security.

---

## TECHNICAL DEBT: ACCEPTED (Not Blocking)

| Item | Reason | Revisit |
|------|--------|---------|
| Separate `teams/` repo | Unification in Phase 1 | Week 1 |
| Duplicate UI components | Audit in Phase 1.2 | Week 1 |
| No mobile TeamOffice | Phase 4 | Week 4 |
| No team orchestration | Phase 3 | Week 3 |
| No admin analytics | Phase 2 | Week 2 |

---

## RISK MITIGATION

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Web + Teams merge conflicts | High | High | Feature flag, incremental merge, shared component audit |
| LiveKit scaling for team rooms | Medium | High | Simulcast, max 12 participants, load test |
| Supabase Realtime latency | Low | Medium | Optimize RLS, indexes, connection pooling |
| Mobile Expo LiveKit issues | Medium | High | Test on device weekly, fallback to WebView |
| Backstage team orchestration | High | High | Incremental: personal → team orchestration |
| SSO implementation | Medium | High | Use proven library (auth0/next-auth), test early |

---

## DEPENDENCIES ON OTHER REPOS

| Repo | What Teams Needs | When |
|------|------------------|------|
| **Web** | Shared infra, auth, LiveKit, components | **Phase 1** (immediate) |
| **Backstage** | `orchestrate-team-task`, push notifications | Phase 3-4 |
| **Stager** | Team task deep links, team task panel | Phase 3 |
| **Mobile** | TeamOffice screens, push notifications | Phase 4 |
| **Cue** | Team task creation via `cue orchestrate` | Phase 3 |

---

## DEFINITION OF DONE (Per Phase)

| Phase | Done When |
|-------|-----------|
| 1 | Single Vercel deploy; `/teams/*` routes work; shared components; no duplicate code |
| 2 | TeamAnalytics page shows real data; TeamHealthCard accurate; Settings complete |
| 3 | Stager brief → Backstage team task → OpenCode runs → diff → approve → merge |
| 4 | Expo TeamOffice loads; rhythm syncs; push notifications deliver; deep links work |
| 5 | SSO login works; audit log exports; templates create teams; guest links work |

---

## QUESTIONS RESOLVED (From Your Calls)

| # | Question | Decision |
|---|----------|----------|
| 1 | Teams separate deploy or Web routes? | **Web routes under `/teams/*`, single deploy** |
| 2 | Team orchestration priority? | **Phase 3 (after Backstage extraction)** |
| 3 | Team templates? | **Phase 5 (Study Group, Sprint Team, Bootcamp, Async)** |
| 4 | Guest access? | **Phase 5 (read-only rhythm, expiring links)** |
| 5 | Mobile TeamOffice scope? | **Room + Today + TeamOffice (Expo parity)** |
| 6 | Admin analytics? | **Phase 2 (sync rate, focus hours, member activity)** |
| 7 | Team billing | **Razorpay + Stripe (already in migrations)** |

---

## NEXT STEPS

1. **You approve this plan** → I create task breakdown with file-level details
2. **Week 1 sprint** → Phase 1: Merge teams into web, feature flag, shared components
3. **Daily sync** → Blockers, decisions, progress
4. **Phase 2 kickoff** → Only after Phase 1 deploy verified

**Ready to proceed with Phase 1 task breakdown?**