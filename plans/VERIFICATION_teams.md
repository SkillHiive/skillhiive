# SkillHive Teams — End Goal & Verification Cycle

**Purpose:** This file defines the measurable end state and the verification loop that confirms the Teams implementation matches the philosophy. Any AI (or human) can use this to verify completion.

---

## END GOAL: What "Done" Looks Like

### The North Star Metric
> **In 6 months, Teams is the answer to: "How does my team focus together without Slack destroying our flow?"**

### Quantitative Success Criteria (Non-Negotiable)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Active teams (weekly rhythm)** | 500+ | `team_rhythm` with `phase != 'idle'` in last 7 days |
| **Members in teams** | 5000+ | `team_members` count |
| **Weekly active team rate** | ≥70% | Teams with ≥1 rhythm session / total teams |
| **Rhythm sessions/week/team** | ≥3 | `team_rhythm` transitions per team/week |
| **Member invite acceptance** | ≥70% | Invites sent → `team_members` inserts |
| **Team MRR** | ₹50L+ | Stripe/Razorpay subscriptions (Team/Enterprise) |
| **Team sync rate** | ≥80% | `get_team_sync_rate` RPC average |
| **Video room usage (Team tier)** | ≥500 hrs/mo | `usage_tracking` for team subscriptions |

### Qualitative Success Criteria (The "Vibe Check")

| Criterion | How to Verify |
|-----------|---------------|
| **Team creation → first rhythm in <24hr** | New team → admin clicks "Start Rhythm" within 24hr |
| **Shared rhythm felt** | 3+ members in room → same phase badge, mic locks together |
| **Break room feels natural** | Break starts → break room opens → team chats there |
| **Notes drawer reduces interruptions** | Focus phase → notes written → read during break |
| **Admin analytics actionable** | Dashboard shows sync rate, focus hours, member activity |
| **DND respected** | Member sets DND → rhythm doesn't notify during DND |
| **Team chat integrated** | Auto-created → used for async, not focus |

---

## VERIFICATION CYCLE: The Implementation Loop

### Cycle Definition
Every feature implementation must pass through this cycle before "done":

```
┌─────────────────────────────────────────────────────────────────┐
│  1. SPECIFY          → Map feature to Philosophy Layer (1-5)   │
│  2. IMPLEMENT        → Write React + Supabase RPC + Realtime   │
│  3. VERIFY (AUTO)    → Typecheck + Unit + Contract + Build    │
│  4. VERIFY (CONTRACT)→ RPC schema match + Realtime events      │
│  5. VERIFY (PLATFORM)→ Web + Mobile (Expo) + Desktop          │
│  6. VERIFY (MANUAL)  → Dogfood: use with real team            │
│  7. VERIFY (METRIC)  → Does it move North Star metrics?       │
│  8. DECIDE           → Ship / Iterate / Kill                   │
└─────────────────────────────────────────────────────────────────┘
```

### Phase-Gate Verification (Per Implementation Plan Phase)

| Phase | Gate | Verification Method | Pass Criteria |
|-------|------|---------------------|---------------|
| **1: Web + Teams Unification** | Single deploy | `npm run build` → single Vercel deploy | Shared components, single auth, feature flags |
| **2: Team Analytics Dashboard** | Admin insights | Dashboard shows sync rate, focus hours | Data matches RPCs, real-time updates |
| **3: Backstage Integration** | Team orchestration | Stager brief → Backstage → team task | Team task appears in TeamOffice |
| **4: Mobile TeamOffice** | Expo parity | Room + Today + TeamOffice on mobile | Feature parity with Web |
| **5: Enterprise Features** | SSO + Audit | SAML/OIDC login, audit log export | Enterprise pilot successful |

### Feature-Level Verification (Per Task)

Every task in the implementation plan must include:

```markdown
## Task: [Name]
**Philosophy Layer:** [1-5]
**Supabase Contract:** [RPC name + schema / Table + RLS]
**Verification:**
- [ ] Typecheck passes (`bun run typecheck` or `tsc --noEmit`)
- [ ] Unit tests pass (`bun test` or `vitest run`)
- [ ] Contract test: RPC schema matches implementation
- [ ] Realtime test: Supabase channel events fire correctly
- [ ] RLS test: Policies block unauthorized access
- [ ] Manual test: [specific workflow with real team]
- [ ] Metric impact: [which North Star metric this moves]
```

---

## AI VERIFICATION PROTOCOL

When an AI reviews this implementation, it must:

### 1. Trace Every RPC/Component to Philosophy
```bash
# For each Supabase RPC / React component, the AI must answer:
grep -r "Philosophy Layer" IMPLEMENTATION_teams.md | grep "<rpc_name>"
# If no mapping exists → FAIL
```

### 2. Verify Supabase Contract Compliance
```bash
# Every RPC must match migration schema exactly:
# Check: migration SQL → TypeScript types → RPC implementation
# If drift → FAIL
```

### 3. Verify Realtime Contract Compliance
```bash
# Every Supabase Realtime subscription must match publication:
# Check: migration `ALTER PUBLICATION` → channel subscription
# If missing → FAIL
```

### 4. Verify RLS Compliance
```bash
# Every table must have RLS + policies:
grep -r "ENABLE ROW LEVEL SECURITY" supabase/migrations/
grep -r "CREATE POLICY" supabase/migrations/
# If missing → FAIL
```

### 5. Verify the Verification Cycle Was Followed
```bash
# Check for evidence of each gate:
ls -la .verification/phase-1/  # Unification build logs
ls -la .verification/phase-2/  # Dashboard screenshots + RPC test logs
ls -la .verification/phase-3/  # Backstage orchestration E2E logs
ls -la .verification/phase-4/  # Expo build + TestFlight logs
# If missing → FAIL
```

### 6. Verify Shared Infrastructure Compliance
```bash
# Teams must share Web's infrastructure:
# - Same Supabase project (verified via `supabase url`)
# - Same LiveKit cluster (verified via `LIVEKIT_URL`)
# - Same auth (verified via `useAuth` hook)
# - Same design tokens (verified via `theme-provider`)
# If divergent → FAIL
```

---

## CONTINUOUS VERIFICATION (CI/CD)

### Required Checks on Every PR
```yaml
# .github/workflows/verify.yml
jobs:
  typecheck:
    runs-on: ubuntu-latest
    steps: [bun run typecheck]
  
  test:
    runs-on: ubuntu-latest
    steps: [bun test]
  
  supabase-contract:
    runs-on: ubuntu-latest
    steps:
      - supabase db diff --schema public --linked
      - supabase gen types typescript --linked > types.ts
      - diff types.ts src/integrations/supabase/types.ts
  
  rls-test:
    runs-on: ubuntu-latest
    steps:
      - supabase test db --filter=rls
  
  realtime-test:
    runs-on: ubuntu-latest
    steps:
      - supabase test db --filter=realtime
  
  philosophy-trace:
    runs-on: ubuntu-latest
    steps: [grep -r 'Philosophy Layer' changed-files]
```

### Required Checks on Every Deploy
```bash
# Deploy verification script
./scripts/verify-deploy.sh
# Runs:
# 1. Health check: /teams page loads
# 2. Team creation → rhythm start → member invite flow
# 3. Rhythm sync: 3 users → same phase, mic lock together
# 4. Break room: phase transition → opens → chat works
# 5. Notes drawer: focus → write note → break → read
# 6. DND: set hours → rhythm respects → no notification
# 7. Subscription: free tier → 2hr video limit enforced
# 8. Team chat: auto-created → messages sync
```

---

## KILL CRITERIA (When to Stop)

| Signal | Action |
|--------|--------|
| Team creation → rhythm start < 20% | **Simplify: auto-start rhythm on create** |
| Weekly active team rate < 40% | **Redesign: rhythm too complex, simplify** |
| Member invite acceptance < 50% | **Fix: invite flow, team value prop** |
| Rhythm sessions/week/team < 1.5 | **Kill rhythm feature; pivot to async** |
| Team MRR growth < 10% MoM | **Revisit pricing, value prop** |
| Mobile TeamOffice parity < 80% | **Scope down: Room + Today only** |
| LiveKit costs > 30% revenue | **Optimize: simulcast, reduce max participants** |

---

## SUCCESS DEFINITION (The Only Thing That Matters)

> **A team creates "Backend Squad", sets Mon/Wed/Fri 9am rhythm, invites 5 members. Monday 9am: rhythm starts, 4 join, 50min focus, 10min break room chat, repeat. Admin checks dashboard Friday: "Team sync rate 92%, 18 focus hours, 0 interruptions." Team renews Team tier.**

**If this loop works for 500 teams, the philosophy is validated. Everything else is noise.**

---

## USAGE FOR AI REVIEWERS

```bash
# To verify this project:
1. Read PHILOSOPHY_teams.md → understand the contract
2. Read IMPLEMENTATION_teams.md → understand the plan
3. Read this file → understand the verification standard
4. Audit: Does every RPC/Component trace to a Philosophy Layer?
5. Audit: Does every table have RLS + policies?
6. Audit: Does every Realtime channel match publication?
6. Audit: Does Teams share Web's Supabase + LiveKit?
7. Audit: Are kill criteria respected?
8. Report: PASS / FAIL with specific gaps
```

**This file is the contract. If the implementation doesn't satisfy this verification cycle, it's not done.**