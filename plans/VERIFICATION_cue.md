# SkillHive Cue — End Goal & Verification Cycle

**Purpose:** This file defines the measurable end state and the verification loop that confirms the Cue implementation matches the philosophy. Any AI (or human) can use this to verify completion.

---

## END GOAL: What "Done" Looks Like

### The North Star Metric
> **In 6 months, `cue` is the answer to: "How do I get exact context restore + trustworthy AI orchestration + verified proof — all in a 15MB binary that runs everywhere?"**

### Quantitative Success Criteria (Non-Negotiable)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Cross-platform installs** | 5000+ | GitHub Releases download count across 5 targets |
| **Daily active `cue go` users** | 1000+ | Telemetry (opt-in) or Backstage sync count |
| **Platforms supported** | 5/5 | macOS (universal), Linux x64/arm64, Windows x64/arm64 |
| **`cue go` frequency** | ≥3x/day per user | Local counter + Backstage sync |
| **Freeze/thaw success rate** | ≥95% | `cue go` after `cue stop` shows exact same head |
| **Orchestration tasks/week** | ≥500 | Cue tasks with `kind='orchestrate'` |
| **Diff approval rate** | ≥80% | `approval.kind='merge'` / total |
| **Backstage Personal revenue** | $10k+/mo | Stripe subscriptions |
| **Binary size** | ≤15MB | `ls -lh dist/cue-*` |

### Qualitative Success Criteria (The "Vibe Check")

| Criterion | How to Verify |
|-----------|---------------|
| **Single binary, no runtime** | `./cue --version` works on fresh machine (no Bun, Node, Python) |
| **Universal macOS download** | One `.dmg` runs on both Intel + Apple Silicon |
| **Windows x64/arm64** | `.exe` works on Surface Pro (arm64) and standard laptops |
| **`cue go --json` → Stager renders exact head** | Line, refs, next action, spotlight — zero manual mapping |
| **Freeze/thaw = exact context** | `cue stop` → `cue go` shows identical line, refs, next action |
| **Overnight orchestration works** | Brief at 11pm → morning diff ready → approve → merged |
| **Privacy gate blocks secrets** | Try to send API key in open tier → scrubbed/rejected |
| **Backstage sync invisible** | `cue stop` → web heatmap updates in <5s, no user action |

---

## VERIFICATION CYCLE: The Implementation Loop

### Cycle Definition
Every feature implementation must pass through this cycle before "done":

```
┌─────────────────────────────────────────────────────────────────┐
│  1. SPECIFY          → Map feature to Philosophy Layer (1-5)   │
│  2. IMPLEMENT        → Write code + tests + cross-compile      │
│  3. VERIFY (AUTO)    → Typecheck + Unit tests + Lint + Build  │
│  4. VERIFY (CONTRACT)→ JSON schema match + IPC compatibility   │
│  5. VERIFY (PLATFORM)→ Test on all 5 targets (CI matrix)      │
│  6. VERIFY (MANUAL)  → Dogfood: use in real workflow          │
│  7. VERIFY (METRIC)  → Does it move North Star metrics?       │
│  8. DECIDE           → Ship / Iterate / Kill                   │
└─────────────────────────────────────────────────────────────────┘
```

### Phase-Gate Verification (Per Implementation Plan Phase)

| Phase | Gate | Verification Method | Pass Criteria |
|-------|------|---------------------|---------------|
| **1: Cross-Platform Builds** | All 5 targets compile | CI matrix: macOS universal, Linux x64/arm64, Windows x64/arm64 | `bun run build:all` succeeds; binaries run on target OS |
| **2: CLI JSON Output** | `--json` on all commands | Contract test: `cue go --json` matches `CueModel` schema | Zero schema drift; Stager IPC works |
| **3: Orchestration Commands** | New commands work | `cue orchestrate → approve → merge` end-to-end | Brief → diff → approve → merged |
| **4: Stager Server + Windows Ingest** | Real-time sync + Windows events | `cue stop` → Stager WS update <2s; PowerShell events ingested | WS push works; Windows shell events captured |
| **5: Backstage Personal Launch** | Hosted sync + runners | 100 Personal subscribers; runners execute tasks | Revenue + task execution |

### Feature-Level Verification (Per Task)

Every task in the implementation plan must include:

```markdown
## Task: [Name]
**Philosophy Layer:** [1-5]
**Platforms:** [macOS-universal, Linux-x64, Linux-arm64, Windows-x64, Windows-arm64]
**Verification:**
- [ ] Typecheck passes (`bun run typecheck`)
- [ ] Unit tests pass (`bun test`)
- [ ] Lint clean (`bun run lint`)
- [ ] Cross-compile: `bun run build:all` succeeds
- [ ] Binary test: each target runs `./cue --version`
- [ ] Contract test: `--json` output matches schema
- [ ] Manual test: [specific workflow on each platform]
- [ ] Metric impact: [which North Star metric this moves]
```

---

## AI VERIFICATION PROTOCOL

When an AI reviews this implementation, it must:

### 1. Trace Every Command/Module to Philosophy
```bash
# For each changed file, the AI must answer:
grep -r "Philosophy Layer" IMPLEMENTATION_cue.md | grep "<filename>"
# If no mapping exists → FAIL
```

### 2. Verify Cross-Platform Build Integrity
```bash
# Check CI matrix runs all targets:
cat .github/workflows/build.yml | grep -A5 "matrix:"
# Must include: macos-universal, linux-x64, linux-arm64, windows-x64, windows-arm64
# If missing → FAIL
```

### 3. Verify CLI JSON Contract Compliance
```bash
# Every command with --json must match schema exactly:
# Stager expects: cue go --json → CueModel
# Test: diff <(cue go test --json) schemas/cue_go.json
# If drift → FAIL
```

### 4. Verify the Verification Cycle Was Followed
```bash
# Check for evidence of each gate:
ls -la .verification/phase-1/  # Build artifacts for all 5 targets
ls -la .verification/phase-2/  # Contract test results
ls -la .verification/phase-3/  # Orchestration E2E test logs
# If missing → FAIL
```

### 5. Validate No Platform-Specific Leaks
```bash
# Check for platform assumptions:
grep -r "process.platform" --include="*.ts" packages/ apps/
# Must be abstracted via platform module
# If raw process.platform in business logic → FAIL
```

### 6. Validate Binary Size & Startup
```bash
# Each binary:
ls -lh dist/cue-*  # Must be ≤15MB
time ./cue --version  # Must be <100ms cold start
# If exceeded → FAIL
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
  
  lint-test:
    runs-on: ubuntu-latest
    steps: [bun run lint, bun test]
  
  build-matrix:
    strategy:
      matrix:
        target: [bun-darwin-universal, bun-linux-x64, bun-linux-arm64, bun-windows-x64, bun-windows-arm64]
    runs-on: ${{ matrix.target == 'bun-windows-*' && 'windows-latest' || matrix.target == 'bun-darwin-*' && 'macos-latest' || 'ubuntu-latest' }}
    steps:
      - bun run build:target ${{ matrix.target }}
      - test-binary: ./${{ matrix.target }}/cue --version
  
  contract-test:
    runs-on: ubuntu-latest
    steps:
      - bun run build:target bun-linux-x64
      - diff <(./dist/cue-linux-x64 go test --json) schemas/cue_go.json
      - diff <(./dist/cue-linux-x64 threads --json) schemas/cue_threads.json
      - # ... all commands
  
  philosophy-trace:
    runs-on: ubuntu-latest
    steps: [grep -r 'Philosophy Layer' changed-files]
```

### Required Checks on Every Release
```bash
# Release verification script
./scripts/verify-release.sh v0.2.0
# Runs:
# 1. All 5 binaries built and tested
# 2. Schema compatibility with Stager (locked version)
# 3. Backstage sync test (push/pull)
# 4. Stager IPC smoke test (cue go/threads/stop --json)
# 5. Binary size check (≤15MB each)
# 6. Startup time check (<100ms)
# 7. Install script test (curl | bash)
```

---

## KILL CRITERIA (When to Stop)

| Signal | Action |
|--------|--------|
| Windows arm64 build fails > 2 weeks | **Drop Windows arm64; ship x64 only. Revisit when Bun stable.** |
| Universal macOS binary > 20MB | **Drop universal; ship separate x64/arm64.** |
| Binary startup > 200ms | **Profile; strip symbols; reduce deps. If impossible, accept.** |
| `--json` schema drift > 3 days | **Freeze all CLI changes; align schemas first.** |
| Stager IPC breaks on Windows | **Priority 1 fix; Stager Windows users blocked.** |
| Backstage sync fails on Windows | **Block Backstage Personal launch on Windows.** |
| 32-bit requests > 10 | **Document "64-bit only"; close issue.** |

---

## SUCCESS DEFINITION (The Only Thing That Matters)

> **A developer downloads `cue` (one click, universal macOS / Windows .exe / Linux tarball), runs `cue init`, works for 3 hours, runs `cue stop "write tests"`, closes laptop. Next morning: `cue go` shows exact same context + overnight test results. They orchestrate a feature via `cue orchestrate`, review diff, approve, merged. Zero friction. Total trust. Runs on their Mac, their Linux server, their Windows laptop, their Raspberry Pi 4.**

**If this loop works for 5000 developers across all 5 platforms, the philosophy is validated. Everything else is noise.**

---

## USAGE FOR AI REVIEWERS

```bash
# To verify this project:
1. Read PHILOSOPHY_cue.md → understand the contract
2. Read IMPLEMENTATION_cue.md → understand the plan
3. Read this file → understand the verification standard
4. Audit: Does every build target trace to Philosophy Layer 1?
5. Audit: Does every `--json` command match Stager's expected schema?
6. Audit: Does every platform run the same test suite?
7. Audit: Are kill criteria respected?
8. Report: PASS / FAIL with specific gaps
```

**This file is the contract. If the implementation doesn't satisfy this verification cycle, it's not done.**