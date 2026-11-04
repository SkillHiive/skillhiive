# SkillHive Web — End Goal & Verification Cycle

**Purpose:** This file defines the measurable end state and the verification loop that confirms the Web implementation matches the philosophy. Any AI (or human) can use this to verify completion.

---

## END GOAL: What "Done" Looks Like

### The North Star Metric
> **In 6 months, SkillHive Web is the default answer to: "How do I prove I can build without a degree, a course certificate, or a gatekeeper's permission?"**

### Quantitative Success Criteria (Non-Negotiable)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Verified developers** | 500+ | Public profiles with `is_public=true` + ≥1 `cue_session` |
| **Active ally circles** | 50+ | Mutual follows where both users have ≥1 capture reply in 30 days |
| **Institutions on TeamOffice** | 10+ | `teams` table rows with `member_count ≥ 5` |
| **Premium recurring revenue** | ₹1L+/mo | Stripe subscriptions on `workroom_premium` tier (after 1000 DAU) |
| **Employer hires** | 3+ | `employer_access` table with `hired=true` |

### Qualitative Success Criteria (The "Vibe Check")

| Criterion | How to Verify |
|-----------|---------------|
| **Zero friction entry** | New user: register → install Cue → see heatmap in < 3 minutes |
| **Shared rhythm works** | 3 users in room: same phase badge, mic locks/unlocks simultaneously |
| **Cubicles are private** | 3rd user cannot join cubicle; no signaling leakage |
| **Cue sync is invisible** | User works in terminal → `cue stop` → web heatmap updates in < 5 seconds |
| **Breathable UI felt** | Intent/Focus/Break/Review modes each have distinct, purpose-built UI |
| **No algorithmic feed** | Feed shows only ally captures; no strangers, no engagement bait |

---

## VERIFICATION CYCLE: The Implementation Loop

### Cycle Definition
Every feature implementation must pass through this cycle before "done":

```
┌─────────────────────────────────────────────────────────────────┐
│  1. SPECIFY          → Map feature to Philosophy Layer (1-5)   │
│  2. IMPLEMENT        → Write code + tests                      │
│  3. VERIFY (AUTO)    → Typecheck + Unit tests + Lint          │
│  4. VERIFY (MANUAL)  → Dogfood: use it in real workflow       │
│  5. VERIFY (METRIC)  → Does it move North Star metrics?       │
│  6. DECIDE           → Ship / Iterate / Kill                   │
└─────────────────────────────────────────────────────────────────┘
```

### Phase-Gate Verification (Per Implementation Plan Phase)

| Phase | Gate | Verification Method | Pass Criteria |
|-------|------|---------------------|---------------|
| **1: Critical Fixes** | Deploy to Vercel Preview | Manual test checklist | All 5 fixes work; no console errors |
| **2: Core Loop** | Local multi-device test | 3 laptops, different times | Same phase, mic sync, cubicle private, room cap blocks 13th |
| **3: Beta Ready** | 3 fixed rooms running daily | 7-day dry run | Notifications fire; onboarding completes; mobile Room+Today works |
| **4: Beta Execution** | 15 users, 7 days | Analytics dashboard | Day-3 return ≥40%; avg mins ≥35; captures ≥1/day; allies ≥2 |
| **5: Post-Signal** | Stager↔Web loop works | End-to-end dogfood | `cue stop` → web heatmap updates; Stager shows Cue thread state |

### Feature-Level Verification (Per Task)

Every task in the implementation plan must include:

```markdown
## Task: [Name]
**Philosophy Layer:** [1-5]
**Verification:**
- [ ] Typecheck passes (`bun run typecheck` or `tsc --noEmit`)
- [ ] Unit tests pass (`bun test` or `bun run test`)
- [ ] Lint clean (`bun run lint` or `eslint .`)
- [ ] Manual test: [specific steps to verify]
- [ ] Metric impact: [which North Star metric this moves]
```

---

## AI VERIFICATION PROTOCOL

When an AI reviews this implementation, it must:

### 1. Trace Every File to Philosophy
```bash
# For each changed file, the AI must answer:
grep -r "Philosophy Layer" IMPLEMENTATION_web.md | grep "<filename>"
# If no mapping exists → FAIL
```

### 2. Verify the Verification Cycle Was Followed
```bash
# Check for evidence of each gate:
ls -la .verification/phase-1/  # Should exist with test results
ls -la .verification/phase-2/  # Should exist with multi-device test logs
# If missing → FAIL
```

### 3. Confirm North Star Alignment
```bash
# For each feature, trace to metric:
# "This feature moves [metric] because [reasoning]"
# If no clear line → FAIL
```

### 4. Validate Cue Contract Compliance
```bash
# Web /cue/push endpoint must accept Cue PushBody exactly:
diff <(curl -s /cue/push/schema) packages/store/src/outbox.ts:10-21
# If schema drift → FAIL
```

### 5. Confirm No Orphan Features
```bash
# Every new table/component must have:
# - RLS policies
# - RPC for public read (if needed)
# - Migration file
# - TypeScript types
# If any missing → FAIL
```

---

## CONTINUOUS VERIFICATION (CI/CD)

### Required Checks on Every PR
```yaml
# .github/workflows/verify.yml
checks:
  - typecheck: "tsc --noEmit"
  - lint: "eslint . --max-warnings=0"
  - test: "bun test"
  - build: "vite build"
  - schema-drift: "diff cue-push-schema.json packages/store/src/outbox.ts"
  - philosophy-trace: "grep -r 'Philosophy Layer' changed-files"
```

### Required Checks on Every Deploy
```bash
# Pre-deploy verification script
./scripts/verify-deploy.sh
# Runs:
# 1. Health check: /api/health
# 2. Room join: 2 users, same phase, mic sync
# 3. Cue sync: push test event → heatmap updates
# 4. Cubicle: 3rd user denied
# 5. Room cap: 13th user blocked
```

---

## KILL CRITERIA (When to Stop)

| Signal | Action |
|--------|--------|
| Phase 4 Day-3 return < 40% | **Kill web rooms. Pivot expression.** |
| Cue sync schema drift > 1 week | **Freeze Web; align Cue first.** |
| LiveKit scale limits hit at < 500 concurrent | **Migrate to LiveKit Cloud or kill self-hosted.** |
| Premium conversion < 2% at 1000 DAU | **Revisit pricing/value prop; don't scale.** |
| TeamOffice adoption < 3 orgs at Month 6 | **Deprecate Teams; focus on individual loop.** |

---

## SUCCESS DEFINITION (The Only Thing That Matters)

> **A developer installs Cue, joins a 9am room, works for 2 hours, runs `cue stop`, sees their heatmap update on web, gets an ally reply on their capture, and returns tomorrow — all without thinking about the platform.**

**If this loop works for 500 developers, the philosophy is validated. Everything else is noise.**

---

## USAGE FOR AI REVIEWERS

```bash
# To verify this project:
1. Read PHILOSOPHY_web.md → understand the contract
2. Read IMPLEMENTATION_web.md → understand the plan
3. Read this file → understand the verification standard
4. Audit: Does every implementation task trace to a Philosophy Layer?
5. Audit: Does every Phase have verification evidence?
6. Audit: Does the Cue contract match packages/store/src/outbox.ts?
7. Audit: Are kill criteria respected?
8. Report: PASS / FAIL with specific gaps
```

**This file is the contract. If the implementation doesn't satisfy this verification cycle, it's not done.**