# SkillHive Teams — Philosophy Mindmap & Strategic Brief

**Project:** `teams` (React + Vite + Supabase + LiveKit)
**Role:** **Org Layer** — TeamOffice, shared rhythm, calendar, announcements. Built on same infra as Web.
**Status:** Feature-complete for v1, deployed on same Supabase as Web
**Last Commit:** October 18, 2026

---

## 1. CORE PHILOSOPHY: WHY THIS EXISTS

### The Founding Insight
> **"Focus is contagious. Distraction is too. Teams need a shared rhythm, not more meetings."**

Teams is not "Slack for focus." It's **a shared silent office** where:
- Everyone focuses together (50/10 cycles, synchronized)
- Breaks are shared (break room, not doom-scroll)
- Presence is ambient (desk indicators, not green dots)
- Communication is batched (notes drawer during focus, break room during breaks)
- Admin controls the rhythm, not the people

### The Philosophy Stack (Bottom to Top)

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 5: TEAM ECONOMY                                          │
│  ├─ Team subscriptions (Pro/Team/Enterprise tiers)              │
│  ├─ Video room limits by tier (free: 2hr/day)                   │
│  ├─ Admin dashboard for team health                             │
│  └─ Enterprise SSO, audit logs, custom contracts                │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 4: TEAM RITUALS                                          │
│  ├─ Shared rhythm (50/10, admin-controlled)                     │
│  ├─ Team calendar (scheduled focus sessions)                    │
│  ├─ Announcements (pinned, not lost in chat)                    │
│  ├─ Rituals panel (check-in, weekly review)                     │
│  └─ Break room (social during breaks, not during focus)         │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 3: SHARED PRESENCE                                       │
│  ├─ TeamOffice: live desk grid with focus states                │
│  ├─ Member desks: idle / focusing / breaking / solo             │
│  ├─ Real-time rhythm sync (Supabase Realtime)                   │
│  ├─ Notes drawer (batched communication during focus)           │
│  └─ DND hours (personal boundaries respected)                   │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 2: TEAM STRUCTURE                                        │
│  ├─ Teams: create, invite, roles (admin/member/guest)           │
│  ├─ Team chat (auto-created, integrated)                        │
│  ├─ Team schedule (weekly recurring focus sessions)             │
│  └─ Team analytics (sync rate, focus hours)                     │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 1: ATMOSPHERE (SHARED WITH WEB)                          │
│  ├─ Zero friction: no dashboards to nurture                     │
│  ├─ Breathable: UI adapts to rhythm phase                       │
│  ├─ Calm tech: ambient soundscapes, glass panels                │
│  └─ Identity: "A silent office for deep work"                   │
└─────────────────────────────────────────────────────────────────┘
```

### The Golden Thread
**Every feature must answer: "Does this help a team focus together without adding noise?"**

If yes → build it. If no → kill it.

---

## 2. USER ARCHETYPES & THEIR JOURNEYS

### Primary: The Team Lead (Creator/Admin)
- **Pain:** No visibility into deep work; standups are theater; Slack destroys focus
- **Journey:**
  1. Creates team → "Backend Squad" / "Study Group" / "Startup Team"
  2. Sets weekly schedule → Mon/Wed/Fri 9am focus sessions
  3. Invites members → auto-creates team chat
  4. Starts rhythm → everyone sees "Focusing 42:30" on their desk
  5. During focus: posts announcement → appears on everyone's desk
  6. During break: opens break room → team chats in break room
  7. Checks analytics → "Team sync rate 87% this week"

### Secondary: The Team Member (Contributor)
- **Pain:** Meetings interrupt flow; unclear when to focus; no shared rhythm
- **Journey:**
  1. Receives invite → joins team → sees team in Teams page
  2. Enters TeamOffice → sees live desk grid with teammates
  3. Rhythm starts → desk shows "Focusing 42:30" → mic locked, notifications paused
  4. Needs to ask something → writes note in drawer → batched for break
  5. Break starts → mic unlocked → break room opens → chats with team
  5. Sets DND hours → respected by team rhythm

### Tertiary: The Solo Builder (Uses Team Features Alone)
- **Pain:** Wants structure without team overhead
- **Journey:**
  1. Creates "team of one" → gets all TeamOffice features
  2. Sets personal schedule → rhythm runs automatically
  6. Uses rituals panel for check-in/weekly review
  7. Upgrades to Pro for unlimited video rooms

---

## 3. FEATURE MAP: WHAT EXISTS vs. WHAT'S NEEDED

### ✅ FULLY BUILT & WORKING (Code Reality)

| Feature | Location | Status |
|---------|----------|--------|
| **Teams Page** | `src/pages/Teams.tsx` | ✅ Create, list, join, active_now indicator |
| **TeamOffice** | `src/pages/TeamOffice.tsx` (613 lines) | ✅ Full shared rhythm, member desks, break room |
| **Room (Video)** | `src/pages/Room.tsx` (84K lines) | ✅ LiveKit, cubicles, phases, constraints |
| **Team Calendar** | `src/components/TeamCalendar.tsx` | ✅ Weekly schedule, admin management |
| **Announcements** | `src/components/AnnouncementBanner.tsx` | ✅ Pinned messages, admin-only post |
| **Rituals Panel** | `src/components/RitualsPanel.tsx` | ✅ Check-in, checkout, weekly review |
| **Break Room** | `src/components/BreakRoom.tsx` | ✅ Social during breaks only |
| **Notes Drawer** | `src/components/NotesDrawer.tsx` | ✅ Batched notes during focus |
| **DND Settings** | `src/components/DNDSettings.tsx` | ✅ Personal DND hours |
| **Subscription System** | Supabase migrations 006, 007 | ✅ Free/Pro/Team/Enterprise tiers |
| **Video Room Limits** | `can_start_video_room` RPC | ✅ Free: 2hr/day, Pro+: unlimited |
| **Team Schedule** | `team_schedule` table + RPCs | ✅ Weekly recurring sessions |
| **Team Chat** | `get_or_create_team_chat` RPC | ✅ Auto-created on team create |
| **DND Hours** | `is_user_dnd` RPC + profile cols | ✅ Personal boundaries |
| **Subscription Webhooks** | Razorpay + Stripe ready | ✅ Razorpay webhook, Stripe ready |
| **Billing Page** | `src/pages/Billing.tsx` | ✅ Tier display, upgrade flow |

### ⚠️ BUILT BUT NEEDS INTEGRATION/POLISH

| Gap | Impact | Fix Required |
|-----|--------|--------------|
| **Teams ↔ Web unification** | Separate codebases, same Supabase | Unify auth, share components, single deploy |
| **Teams ↔ Backstage** | Team orchestration needs Backstage | Backstage `orchestrate-task` for team tasks |
| **Team analytics dashboard** | Sync rate, focus hours RPCs exist | Admin dashboard UI needed |
| **Mobile parity** | TeamOffice not in mobile app | Expo TeamOffice implementation |
| **Team orchestration** | Not connected to Backstage | `orchestrate-task` job kind for team tasks |

### ❌ MISSING ENTIRELY (From Philosophy)

| Missing Feature | Philosophy Layer | Revenue Potential |
|-----------------|------------------|-------------------|
| **Team orchestration** | Layer 4 | Backstage Team tier ($50/mo) |
| **Admin analytics dashboard** | Layer 5 | Retention, upsell signal |
| **Team templates** | Layer 2 | "Study group", "Sprint team" presets |
| **Guest access** | Layer 2 | External collaborators |
| **Team analytics API** | Layer 5 | External integrations |

---

## 4. STRATEGIC POSITIONING: THE THREE-WORKSPACE TRUTH

### Current Reality
| Workspace | Role | Dependency |
|-----------|------|------------|
| **Web** | Individual focus + social proof | **None** (standalone) |
| **Teams** | Org layer (shared rhythm, calendar) | **Web infra** (same Supabase, LiveKit) |
| **Backstage** | Night shift + orchestration | **Optional** (enhances both) |
| **Stager** | Desktop workspace | **Cue** (local kernel) |
| **Cue** | Local kernel | **None** |

### The Verdict
**Teams is the org layer on Web's infrastructure.** It's not a separate product — it's Web with `team_id` context.

> **Rule**: Teams shares **everything** with Web (Supabase, LiveKit, auth, LiveKit). Only the UI routes differ.

### Positioning Statement
> **Teams is the silent office for teams. Shared rhythm, not shared chat. Focus together, break together, ship together.**

---

## 5. MONETIZATION PHILOSOPHY: TIERED BY TEAM NEEDS

### The Tier Ladder
| Tier | Price | Target | Limits |
|------|-------|--------|--------|
| **Free** | ₹0 | Small teams, students | 2hr video/day, 5 members, basic rhythm |
| **Pro** | ₹499/mo | Power users, freelancers | Unlimited video, 20 members, custom rhythm |
| **Team** | ₹2,999/mo | Startups, study groups | 50 members, admin dashboard, custom branding |
| **Enterprise** | Custom | Orgs, schools | SSO, audit logs, SLA, dedicated support |

### Revenue Projections (Conservative)
| Month | Free | Pro | Team | Enterprise | MRR |
|-------|------|-----|------|------------|-----|
| 3 | 500 | 50 | 10 | 1 | ₹3.5L |
| 6 | 2000 | 200 | 30 | 3 | ₹18L |
| 12 | 5000 | 500 | 100 | 10 | ₹65L |

### The Fix: Monetize the **Room**, Not the Course
- Video rooms are the product → limit by tier
- Rhythm is free → drives engagement
- Teams pay for **scale** (members, video hours, admin tools)

---

## 6. SHARED RHYTHM: THE HEART OF TEAMS

### How It Works
| Component | Implementation |
|-----------|----------------|
| **Rhythm State** | `team_rhythm` table (phase, cycle_started_at, config, admin) |
| **Sync** | Supabase Realtime on `team_rhythm` table |
| **Phases** | `focusing` (50min) → `breaking` (10min) → `long_break` (15min every 4) |
| **Admin Control** | `start_team_rhythm`, `pause_team_rhythm`, `transition_team_rhythm` RPCs |
| **Constraints** | `getConstraints()` engine → `focus`/`break`/`off` modes |
| **Member Desks** | Live grid: idle/focusing/breaking/solo states |

### The Golden Rules
1. **Admin starts rhythm** → everyone syncs automatically
2. **Focus = mic locked, notifications paused, chat disabled**
3. **Break = mic unlocked, chat enabled, break room opens**
4. **Notes drawer** = batched communication during focus
5. **Break room** = social space during breaks only

---

## 7. GO-TO-MARKET: THE TEAM WEDGE

### Target: Study Groups + Dev Teams + Startups
- **Study groups** (Discord servers wanting structure)
- **Dev teams** (Remote teams losing focus to Slack)
- **Bootcamps** (Instructors needing structure)
- **Startups** (Small teams needing focus culture)

### Launch Sequence
1. **Month 1:** Teams on Web (already deployed) → 50 beta teams
2. **Month 2:** Team analytics dashboard → admin insights
3. **Month 3:** Team orchestration (Backstage integration) → team tasks
4. **Month 4:** Team Pro/Enterprise → revenue
5. **Month 6:** Team templates ("Study group", "Sprint team", "Bootcamp")

### Success Criteria (Beta)
| Metric | Threshold |
|--------|-----------|
| Team creation → first rhythm | ≥50% within 24hr |
| Member invite acceptance | ≥70% |
| Weekly active teams | ≥40% of created |
| Rhythm sessions/week/team | ≥3 |
| "Would recommend" | ≥8/10 |

---

## 8. QUESTIONS FOR ALIGNMENT

### Product Strategy
1. **Teams as separate deploy vs. Web routes?** — Currently separate repo, same Supabase. Unify?
2. **Team orchestration** — Backstage `orchestrate-task` for team tasks? Priority?
3. **Team templates** — "Study group", "Sprint team", "Bootcamp" presets?
4. **Guest access** — External collaborators (read-only rhythm)?

### Technical Decisions
5. **Teams ↔ Web unification** — Single repo, feature flags, or separate deploys?
6. **Mobile TeamOffice** — Expo implementation priority?
7. **LiveKit scaling** — Team rooms = more concurrent. Load test?

### Monetization Timing
8. **Team billing** — Razorpay (India) + Stripe (global) both implemented?
9. **Free tier limits** — 5 members, 2hr video/day — right balance?
10. **Enterprise features** — SSO, audit logs, custom contracts — when?

---

## 9. SUCCESS DEFINITION (The North Star)

> **In 6 months, Teams is the answer to: "How does my team focus together without Slack destroying our flow?"**

**Measured by:**
- 500+ active teams (weekly rhythm)
- 5000+ members in teams
- 70%+ weekly active team rate
- ₹50L+/mo recurring from Team/Enterprise
- 3+ teams using Backstage orchestration

---

**This philosophy document is the contract. The implementation plan must trace every Supabase RPC, every LiveKit room, every Supabase Realtime subscription back to these principles. Any feature that adds noise instead of rhythm gets cut.**

---

**NEXT: Upon your approval, I'll create `IMPLEMENTATION_teams.md` with:**
- Phase 1: Web + Teams unification (shared components, single deploy)
- Phase 2: Team analytics dashboard (admin insights)
- Phase 3: Backstage integration (team orchestration)
- Phase 4: Mobile TeamOffice (Expo parity)
- Phase 5: Enterprise features (SSO, audit, templates)
- Every task mapped to Philosophy Layer
- Verification cycle per phase