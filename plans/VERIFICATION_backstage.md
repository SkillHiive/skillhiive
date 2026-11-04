# SkillHive Backstage — End Goal & Verification Cycle

**Purpose:** This file defines the measurable end state and the verification loop that confirms the Backstage implementation matches the philosophy. Any AI (or human) can use this to verify completion.

---

## END GOAL: What "Done" Looks Like

### The North Star Metric
> **In 6 months, Backstage is the answer to: "How do I get model-refined context + heavy orchestration + encrypted sync — without giving up my hardware, my privacy, or my wallet?"**

### Quantitative Success Criteria (Non-Negotiable)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Self-host deployments** | 1000+ | Docker Hub pulls + `cue doctor --check-backstage` pings |
| **Backstage Personal subscribers** | 500+ | Stripe active subscriptions |
| **Sync reliability** | ≥99.9% | Push/pull success rate (telemetry) |
| **Night shift quality** | ≥90% | "Refined state useful" user rating |
| **Vault UX** | ≤2 min setup | Time from `cue vault unlock` to ready |
| **Zero vault key loss** | 0 incidents | Recovery key usage = 0 |
| **Orchestration success** | ≥80% | Tasks completed without manual intervention |
| **MRR** | $10k+ | Stripe recurring revenue |
| **Sync latency** | <5s | Push → Pull round-trip |

### Qualitative Success Criteria (The "Vibe Check")

| Criterion | How to Verify |
|-----------|---------------|
| **Self-host in ≤10 min** | Fresh Proxmox → `docker compose up -d` → `cue doctor --check-backstage` green |
| **Night shift invisible** | `cue stop` → sleep → `cue go` shows refined states + "While you were away" |
| **Vault unlock feels instant** | `cue vault unlock` → ready in <30s, lease auto-relocks |
| **Orchestration feels magical** | Stager brief → OpenCode works → diff ready → approve → merged |
| **Mobile push works** | Phone notification → deep-link to Stager → review diff |
| **Privacy feels real** | Canary test passes; local-tier content never in outbound payloads |
| **Self-host survives chaos** | Power loss → reboot → sync resumes; network partition → outbox flushes |

---

## VERIFICATION CYCLE: The Implementation Loop

### Cycle Definition
Every feature implementation must pass through this cycle before "done":

```
┌─────────────────────────────────────────────────────────────────┐
│  1. SPECIFY          → Map feature to Philosophy Layer (1-5)   │
│  2. IMPLEMENT        → Write API + Worker + Tests + Docker     │
│  3. VERIFY (AUTO)    → Typecheck + Unit + Contract + Build    │
│  4. VERIFY (CONTRACT)→ OpenAPI schema match + Canary tests     │
│  5. VERIFY (PLATFORM)→ Self-host deploy + Windows/Linux/Mac   │
│  6. VERIFY (MANUAL)  → Dogfood: use in real workflow          │
│  7. VERIFY (METRIC)  → Does it move North Star metrics?       │
│  8. DECIDE           → Ship / Iterate / Kill                   │
└─────────────────────────────────────────────────────────────────┘
```

### Phase-Gate Verification (Per Implementation Plan Phase)

| Phase | Gate | Verification Method | Pass Criteria |
|-------|------|---------------------|---------------|
| **1: Repo Extraction + Docker** | Standalone repo + Docker | Fresh VM → `docker compose up` → `cue doctor --check-backstage` | All health checks green |
| **2: Vault API + Encryption** | Vault endpoints work | `cue vault unlock` → lease acquired → auto-relock | Lease acquired, key wiped on expiry |
| **3: Orchestration Jobs** | New job kinds work | Stager brief → `orchestrate-task` → OpenCode runs → diff | Diff appears in Stager, approve → merge |
| **4: Mobile Push** | FCM/APNs delivery | Stager task → Backstage → FCM/APNs → phone notification | Deep-link opens Stager |
| **5: Managed Hosting** | Personal launch ready | Stripe checkout → provisioned → `cue init --tier managed` | Subscriber active in <5 min |

### Feature-Level Verification (Per Task)

Every task in the implementation plan must include:

```markdown
## Task: [Name]
**Philosophy Layer:** [1-5]
**API Contract:** [OpenAPI path + schema]
**Verification:**
- [ ] Typecheck passes (`bun run typecheck`)
- [ ] Unit tests pass (`bun test`)
- [ ] Contract test: OpenAPI schema matches implementation
- [ ] Canary test: Local-tier content never in outbound payload
- [ ] Docker build: `docker build -t backstage:test .` succeeds
- [ ] Self-host test: Fresh VM → `docker compose up` → health green
- [ ] Manual test: [specific workflow]
- [ ] Metric impact: [which North Star metric this moves]
```

---

## AI VERIFICATION PROTOCOL

When an AI reviews this implementation, it must:

### 1. Trace Every Endpoint to Philosophy
```bash
# For each API endpoint, the AI must answer:
grep -r "Philosophy Layer" IMPLEMENTATION_backstage.md | grep "<endpoint>"
# If no mapping exists → FAIL
```

### 2. Verify OpenAPI Contract Compliance
```bash
# Every endpoint must match OpenAPI spec exactly:
# Generate spec from code → diff with docs/openapi.yaml
# If drift → FAIL
```

### 3. Verify Canary Tests Exist
```bash
# For every privacy-sensitive feature:
grep -r "canary" tests/ --include="*.ts"
# Must have: local-tier leak test, endpoint classification test, vault leak test
# If missing → FAIL
```

### 4. Verify Self-Host Deploy Works
```bash
# CI must have self-host test:
cat .github/workflows/self-host-test.yml
# Must: Fresh VM → docker compose up → cue doctor --check-backstage
# If missing → FAIL
```

### 4. Verify Vault Security
```bash
# Vault tests must cover:
grep -r "vault" tests/ --include="*.ts" | grep -E "(lease|encrypt|recovery|wipe)"
# Must have: lease expiry wipe, recovery key restore, revoked device blocked
# If missing → FAIL
```

### 5. Verify the Verification Cycle Was Followed
```bash
# Check for evidence of each gate:
ls -la .verification/phase-1/  # Docker build + health check logs
ls -la .verification/phase-2/  # Vault lease + encryption test logs
ls -la .verification/phase-3/  # Orchestration E2E test logs
ls -la .verification/phase-4/  # Mobile push delivery logs
# If missing → FAIL
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
  
  contract-test:
    runs-on: ubuntu-latest
    steps:
      - bun run build
      - generate-openapi-spec
      - diff generated-spec.yaml docs/openapi.yaml
  
  canary-tests:
    runs-on: ubuntu-latest
    steps:
      - bun test --filter=canary
  
  docker-build:
    runs-on: ubuntu-latest
    steps:
      - docker build -t backstage:pr .
      - docker run --rm backstage:pr --version
  
  philosophy-trace:
    runs-on: ubuntu-latest
    steps: [grep -r 'Philosophy Layer' changed-files]
```

### Required Checks on Every Release
```bash
# Release verification script
./scripts/verify-release.sh v0.2.0
# Runs:
# 1. Docker image built + pushed (multi-arch: linux/amd64, linux/arm64)
# 2. Self-host deploy test: Fresh VM → docker compose up → health green
# 3. Cue sync test: `cue sync push/pull` against deployed Backstage
# 4. Vault test: unlock → lease → expiry → key wiped
# 5. Orchestration test: Stager brief → OpenCode → diff → approve → merge
# 6. Mobile push test: FCM/APNs delivery → deep-link
# 7. Chaos test: Network kill → outbox flushes; Power loss → no corruption
# 8. Security scan: `bun audit`, dependency check, SBOM generated
```

---

## KILL CRITERIA (When to Stop)

| Signal | Action |
|--------|--------|
| Self-host deploy > 15 min | **Simplify: SQLite-only, remove Postgres requirement** |
| Vault lease expiry doesn't wipe key | **Block release; fix key wipe** |
| Local-tier content in outbound payload | **Block release; fix scrubber/gate** |
| Sync success rate < 99% | **Investigate: outbox, network, auth** |
| Night shift quality < 80% | **Disable local refine; fallback to deterministic** |
| Orchestration fail rate > 20% | **Disable auto-orchestration; manual only** |
| Vault key loss incident | **Immediate: audit recovery key flow, add warnings** |
| Self-host deploy fails on ARM | **Fix Docker multi-arch build** |

---

## SUCCESS DEFINITION (The Only Thing That Matters)

> **A developer runs `docker compose up -d` on their Proxmox box, points Cue at it, goes to sleep. Next morning: `cue go` shows refined context, Stager shows "While you were away: tests passed, diff ready." They orchestrate a feature from their phone, approve the diff, it merges. Zero config friction. Total privacy. $5/mo if they want managed.**

**If this loop works for 1000 self-host users + 500 Personal subscribers, the philosophy is validated. Everything else is noise.**

---

## USAGE FOR AI REVIEWERS

```bash
# To verify this project:
1. Read PHILOSOPHY_backstage.md → understand the contract
2. Read IMPLEMENTATION_backstage.md → understand the plan
3. Read this file → understand the verification standard
4. Audit: Does every API endpoint trace to a Philosophy Layer?
5. Audit: Does every endpoint have OpenAPI spec + canary test?
6. Audit: Does self-host deploy work on fresh VM?
7. Audit: Does vault lease expiry actually wipe keys?
8. Audit: Are kill criteria respected?
9. Report: PASS / FAIL with specific gaps
```

**This file is the contract. If the implementation doesn't satisfy this verification cycle, it's not done.**