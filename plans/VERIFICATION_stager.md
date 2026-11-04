# SkillHive Stager — End Goal & Verification Cycle

**Purpose:** This file defines the measurable end state and the verification loop that confirms the Stager implementation matches the philosophy. Any AI (or human) can use this to verify completion.

---

## END GOAL: What "Done" Looks Like

### The North Star Metric
> **In 6 months, Stager is the answer to: "How do I close my laptop at 6pm and open it at 9am tomorrow with exactly the same context — plus the work that happened while I slept?"**

### Quantitative Success Criteria (Non-Negotiable)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Daily active developers** | 1000+ | Stager opens/day (telemetry: `stager_open` event) |
| **`cue go` usage** | ≥3x/day per user | Cue telemetry: `cue_go` count / DAU |
| **Orchestration tasks** | ≥500/week | Cue tasks with `kind='orchestrate'` |
| **Diff review approval rate** | ≥80% | `approval.kind='merge'` / total merge approvals |
| **Pro recurring revenue** | ₹5L+/mo | Stripe subscriptions on `stager_pro` tier |
| **Day-7 return (beta)** | ≥50% | Cohort analysis: Day 7 / Day 1 |

### Qualitative Success Criteria (The "Vibe Check")

| Criterion | How to Verify |
|-----------|---------------|
| **"Pick up the thread" in < 5 sec** | Fresh open → Today surface shows real thread head → click "Go" → terminal at exact context |
| **Zero "where was I?" moments** | User survey: "Did you lose context returning to work this week?" → 0% yes |
| **Overnight orchestration feels magical** | User writes brief at 11pm → morning: diff ready → approve → merged → "it just worked" |
| **Breathable UI felt** | Each surface (Today/Projects/Orchestrate) feels distinct; no unused UI |
| **Cue integration invisible** | User never thinks "I'm using Cue" — just "I'm working" |
| **Diff review builds trust** | User approves 10 diffs → 0 regressions → "I trust this loop" |

---

## VERIFICATION CYCLE: The Implementation Loop

### Cycle Definition
Every feature implementation must pass through this cycle before "done":

```
┌─────────────────────────────────────────────────────────────────┐
│  1. SPECIFY          → Map feature to Philosophy Layer (1-5)   │
│  2. IMPLEMENT        → Write Tauri command + Svelte component  │
│  3. VERIFY (AUTO)    → Typecheck + Unit tests + Lint          │
│  4. VERIFY (CONTRACT)→ Cue CLI JSON schema match               │
│  5. VERIFY (MANUAL)  → Dogfood: use in real workflow          │
│  6. VERIFY (METRIC)  → Does it move North Star metrics?       │
│  7. DECIDE           → Ship / Iterate / Kill                   │
└─────────────────────────────────────────────────────────────────┘
```

### Phase-Gate Verification (Per Implementation Plan Phase)

| Phase | Gate | Verification Method | Pass Criteria |
|-------|------|---------------------|---------------|
| **1: Cue IPC Layer** | `cue go --json` works | Tauri `invoke('cue_go', {threadId})` → renders real head | Real thread head (line, refs, next action) displays in Today |
| **2: Real Data Surfaces** | All 3 surfaces live | Open Stager → Today/Projects/Orchestrate show real Cue data | No sample data; all from Cue CLI JSON |
| **3: Stager Server + Sync** | Real-time updates | `cue stop` in terminal → Stager Today updates in < 2s | WS push works; no polling needed |
| **4: Orchestration Loop** | Brief → Diff → Approve | Write brief → see diff → approve → merged | End-to-end orchestration works |
| **5: Pro Tier + Teams** | Revenue + Team sync | 10 Pro subscribers + 3 team orgs | Revenue + team catalog sync works |

### Feature-Level Verification (Per Task)

Every task in the implementation plan must include:

```markdown
## Task: [Name]
**Philosophy Layer:** [1-5]
**Cue Contract:** [CLI command + JSON schema]
**Verification:**
- [ ] Typecheck passes (`bun run typecheck` in stager + cue)
- [ ] Unit tests pass (`bun test`)
- [ ] Lint clean (`bun run lint`)
- [ ] Cue contract test: `cue go --json` matches `CueModel` schema
- [ ] Manual test: [specific steps to verify in real workflow]
- [ ] Metric impact: [which North Star metric this moves]
```

---

## AI VERIFICATION PROTOCOL

When an AI reviews this implementation, it must:

### 1. Trace Every Tauri Command to Philosophy
```bash
# For each Tauri command, the AI must answer:
grep -r "Philosophy Layer" IMPLEMENTATION_stager.md | grep "<command_name>"
# If no mapping exists → FAIL
```

### 2. Verify Cue Contract Compliance
```bash
# Every Tauri invoke must match Cue CLI JSON output exactly:
# Stager: invoke('cue_go', {threadId: 'abc'}) → expects CueModel
# Cue: `cue go abc --json` → outputs CueModel
# Schema diff must be zero:
diff <(stager/schema/cue_go.json) <(cue --json go abc)
# If drift → FAIL
```

### 3. Verify the Verification Cycle Was Followed
```bash
# Check for evidence of each gate:
ls -la .verification/phase-1/  # IPC layer test results
ls -la .verification/phase-2/  # Real data surfaces screenshots/logs
ls -la .verification/phase-3/  # WS push test logs
# If missing → FAIL
```

### 4. Confirm North Star Alignment
```bash
# For each feature, trace to metric:
# "This feature moves [metric] because [reasoning]"
# If no clear line → FAIL
```

### 5. Validate No Orphan Features
```bash
# Every new Tauri command/Svelte component must have:
# - Cue CLI JSON schema definition
# - Svelte component with TypeScript types
# - Tauri command registration
# - Integration test (mock Cue CLI output)
# If any missing → FAIL
```

### 6. Validate Breathable UI Compliance
```bash
# For each surface component:
# - Today: no Projects/Orchestrate UI
# - Projects: no Today/Orchestrate UI  
# - Orchestrate: no Today/Projects UI
# - Pill navigation: smooth, accessible, spatial
# If surface leaks UI from another → FAIL
```

---

## CONTINUOUS VERIFICATION (CI/CD)

### Required Checks on Every PR
```yaml
# .github/workflows/verify.yml
checks:
  - typecheck: "bun run typecheck" (both stager + cue)
  - lint: "bun run lint"
  - test: "bun test"
  - build: "bun run build && bun run build:tauri"
  - cue-contract: "diff stager/schemas/ cue/apps/cue/src/models.ts"
  - philosophy-trace: "grep -r 'Philosophy Layer' changed-files"
  - surface-purity: "check-surface-imports" (custom script)
```

### Required Checks on Every Tauri Build
```bash
# Pre-build verification script
./scripts/verify-tauri.sh
# Runs:
# 1. Cue CLI builds: `bun run build` in cue repo
# 2. Schema generation: `cue go --json` → stager/schemas/cue_go.json
# 3. Tauri build: `bun run build:tauri`
# 4. Binary test: `./dist/stager --version`
# 5. IPC smoke test: invoke each command with mock data
```

---

## KILL CRITERIA (When to Stop)

| Signal | Action |
|--------|--------|
| Cue IPC schema drift > 3 days | **Freeze Stager; align Cue first.** |
| Phase 1 (IPC) takes > 2 weeks | **Scope too big; reduce to `cue go` + `cue threads` only.** |
| Stager Server WS drops > 5% messages | **Redesign: use polling fallback or Tauri event loop.** |
| Orchestration diff review < 50% approval | **Redesign diff UI; trust is broken.** |
| Pro conversion < 1% at 1000 DAU | **Revisit value prop; don't scale.** |
| Team sync requires Web changes not ready | **Defer Team sync; focus on solo loop.** |

---

## SUCCESS DEFINITION (The Only Thing That Matters)

> **A developer opens Stager, sees their exact Cue thread context (line 247, `next.action: "write tests for auth middleware"`), clicks "Go", works for 2 hours, runs `cue stop` with line "test coverage at 80%", closes laptop. Next morning: Stager shows "While you were away: tests passed, coverage 85%, diff ready for review." They approve → merged. Zero friction. Total trust.**

**If this loop works for 1000 developers daily, the philosophy is validated. Everything else is noise.**

---

## USAGE FOR AI REVIEWERS

```bash
# To verify this project:
1. Read PHILOSOPHY_stager.md → understand the contract
2. Read IMPLEMENTATION_stager.md → understand the plan
3. Read this file → understand the verification standard
4. Audit: Does every Tauri command trace to a Philosophy Layer?
5. Audit: Does every Cue contract match `apps/cue/src/models.ts`?
6. Audit: Does every surface (Today/Projects/Orchestrate) stay pure?
7. Audit: Are kill criteria respected?
8. Report: PASS / FAIL with specific gaps
```

**This file is the contract. If the implementation doesn't satisfy this verification cycle, it's not done.**