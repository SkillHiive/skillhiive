# SkillHive Cue — Implementation Plan

**Project:** `cue` (Bun + TypeScript, multi-package monorepo)
**Role:** Local Kernel — Cross-platform, single binary, Stager IPC, Backstage sync
**Strategy:** "Single binary, everywhere" → Cross-platform first, then Stager IPC, then orchestration
**Constraint:** 5 targets (macOS universal, Linux x64/arm64, Windows x64/arm64); ≤15MB binary; ≤100ms startup

---

## PHASE 1: CROSS-PLATFORM BUILDS (Week 1-2) — "Single Binary, Everywhere"

*Foundation: Cue must run on every developer's machine before anything else matters.*

### 1.1 CI/CD Matrix for 5 Targets (4 hrs)
**Files:** `.github/workflows/build.yml` (new) + `package.json` (update scripts)
**Targets:**
| Target | Runner | Output | Notes |
|--------|--------|--------|-------|
| `bun-darwin-universal` | macos-latest | `dist/cue-darwin-universal` | Fat binary (x64 + arm64) |
| `bun-linux-x64` | ubuntu-latest | `dist/cue-linux-x64` | Standard Linux |
| `bun-linux-arm64` | ubuntu-latest (arm64) | `dist/cue-linux-arm64` | ARM Linux (RPi, AWS Graviton) |
| `bun-windows-x64` | windows-latest | `dist/cue-windows-x64.exe` | **Critical** — majority of devs |
| `bun-windows-arm64` | windows-latest (arm64) | `dist/cue-windows-arm64.exe` | Experimental Bun; fallback to x64 |

**Workflow:**
```yaml
# .github/workflows/build.yml
jobs:
  build:
    strategy:
      matrix:
        target: [bun-darwin-universal, bun-linux-x64, bun-linux-arm64, bun-windows-x64, bun-windows-arm64]
        include:
          - target: bun-darwin-universal
            runner: macos-latest
            output: cue-darwin-universal
          - target: bun-linux-x64
            runner: ubuntu-latest
            output: cue-linux-x64
          - target: bun-linux-arm64
            runner: ubuntu-latest-arm64
            output: cue-linux-arm64
          - target: bun-windows-x64
            runner: windows-latest
            output: cue-windows-x64.exe
          - target: bun-windows-arm64
            runner: windows-latest-arm64
            output: cue-windows-arm64.exe
    runs-on: ${{ matrix.runner }}
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run build:target ${{ matrix.target }}
      - run: ./${{ matrix.output }} --version
      - uses: actions/upload-artifact@v4
        with:
          name: ${{ matrix.output }}
          path: ./${{ matrix.output }}
```

**Philosophy Layer:** 1 (Cross-Platform Kernel) — Non-negotiable foundation
**Risk:** Medium. Windows arm64 runner availability; universal macOS binary size.

### 1.2 Build Scripts & Configuration (2 hrs)
**Files:** `package.json` (update), `bunfig.toml` (verify)
**Scripts to Add/Update:**
```json
{
  "scripts": {
    "build:target": "bun build --compile --target=$TARGET apps/cue/src/main.ts --outfile dist/$OUTPUT",
    "build:all": "bun run build:target bun-darwin-universal && bun run build:target bun-linux-x64 && bun run build:target bun-linux-arm64 && bun run build:target bun-windows-x64 && bun run build:target bun-windows-arm64",
    "build:release": "bun run build:all && bun run package:release"
  }
}
```

**Philosophy Layer:** 1 — Build system as product
**Risk:** Low. Configuration only.

### 1.3 Binary Size & Startup Optimization (2 hrs)
**Files:** `apps/cue/src/main.ts`, `packages/*/package.json` (audit deps)
**Targets:**
- Binary size: **≤15MB** each target
- Cold start: **≤100ms** (`time ./cue --version`)

**Optimization Checklist:**
- [ ] Strip symbols: `--strip` flag in Bun compile (if available) or post-process with `strip`
- [ ] Audit dependencies: Remove unused packages (`@opentui/core` only in TUI)
- [ ] Lazy-load heavy modules: `packages/orchestra`, `packages/gate` only when needed
- [ ] Compress with UPX: `upx --best dist/cue-*` (if compatible)

**Philosophy Layer:** 1 — Performance = respect
**Risk:** Low. Standard optimization.

### 1.4 Universal macOS Binary (1 hr)
**Files:** `package.json` (add target), verify `bun-darwin-universal` support
**Test:**
```bash
bun build --compile --target=bun-darwin-universal apps/cue/src/main.ts --outfile dist/cue-darwin-universal
file dist/cue-darwin-universal  # Must show: Mach-O universal binary with 2 architectures: [x86_64, arm64]
```

**Philosophy Layer:** 1 — Single download for all Macs
**Risk:** Low. Bun supports this natively.

### 1.5 Install Script & Release Packaging (3 hrs)
**Files:** `scripts/install.sh` (new), `scripts/package-release.ts` (new)
**Install Script (`cue.skillhiive.com/install.sh`):**
```bash
#!/bin/bash
# Detect OS/arch → download correct binary → install to ~/.local/bin → add to PATH
# Supports: macOS (universal), Linux x64/arm64, Windows x64/arm64
# Verifies checksum → creates symlink → runs `cue init` on first run
```

**Release Packaging:**
- GitHub Release with 5 artifacts + checksums.txt
- Homebrew formula (macOS/Linux)
- Scoop/Chocolatey (Windows)
- AUR (Arch Linux)

**Philosophy Layer:** 1 — Zero-friction install
**Risk:** Low. Standard packaging.

---

## PHASE 2: CLI JSON OUTPUT CONTRACT (Week 2) — "Stager IPC Ready"

*Stager needs machine-readable output from every command. This is the IPC contract.*

### 2.1 `--json` Flag on All Existing Commands (6 hrs)
**Files:** `apps/cue/src/commands/*.ts` (go, threads, stop, freeze, thaw, think, north, capture, audit, init)
**Pattern:**
```typescript
// apps/cue/src/commands/go.ts
interface GoOptions extends RenderOpts { 
  printCdRequested: boolean
  json?: boolean  // NEW
}

export function runGo(context: Context, query: string, opts: GoOptions): number {
  const match = matchThread(context.db, query)
  if (!match.ok) return error(match.message)
  
  writeEntry(context.db, match.thread.id, 'cue go', context.now, context.thresholds.entryGapMin)
  
  if (opts.json) {
    const model = goModel(context, match.thread)
    console.log(JSON.stringify(model))  // stdout = pure JSON
    return 0
  }
  
  // Existing human output
  if (opts.printCdRequested) printCd(match.thread.root)
  process.stdout.write(render(goModel(context, match.thread), opts))
  return 0
}
```

**Commands to Update:**
| Command | Output Schema | Source |
|---------|---------------|--------|
| `cue go --json` | `CueModel` | `apps/cue/src/models.ts` |
| `cue threads --json` | `ThreadsModel` | `apps/cue/src/models.ts` |
| `cue stop --json` | `StopModel` | `apps/cue/src/models.ts` |
| `cue freeze --json` | `StopModel` | `apps/cue/src/models.ts` |
| `cue thaw --json` | `GoModel` | `apps/cue/src/models.ts` |
| `cue think --json` | `ThinkModel` (new) | `apps/cue/src/models.ts` |
| `cue north --json` | `NorthModel` (new) | `apps/cue/src/models.ts` |
| `cue capture --json` | `CaptureResult` (new) | `apps/cue/src/models.ts` |
| `cue audit --json` | `AuditModel` | `apps/cue/src/models.ts` |
| `cue init --json` | `InitResult` (new) | `apps/cue/src/models.ts` |

**JSON Output Rules:**
- stdout = pure JSON (machine-readable)
- stderr = human logs, progress, errors
- Exit codes: 0=success, 1=user error, 2=system error
- Errors in JSON: `{"error": true, "code": "THREAD_NOT_FOUND", "message": "..."}`

**Philosophy Layer:** 2 (Cue Integration) — Contract first
**Risk:** Medium. Must match Stager's expected schemas exactly.

### 2.2 Schema Generation & Contract Tests (3 hrs)
**Files:** `scripts/generate-schemas.ts` (new), `schemas/*.json` (generated), `tests/contract.test.ts` (new)
**Schema Generation:**
```typescript
// scripts/generate-schemas.ts
import { CueModel, ThreadsModel, StopModel, GoModel } from '../apps/cue/src/models.ts'
// Generate JSON Schema (draft-07) from TypeScript interfaces
// Output: schemas/cue_go.json, schemas/cue_threads.json, etc.
```

**Contract Tests:**
```typescript
// tests/contract.test.ts
import { runGo } from '../apps/cue/src/commands/go.ts'
import { readFileSync } from 'fs'

test('cue go --json matches schema', () => {
  const output = runGo(context, 'test-thread', { json: true })
  const schema = JSON.parse(readFileSync('schemas/cue_go.json', 'utf8'))
  const validate = ajv.compile(schema)
  expect(validate(output)).toBe(true)
})
```

**CI Integration:**
```yaml
# .github/workflows/contract-test.yml
- run: bun run build:target bun-linux-x64
- run: ./dist/cue-linux-x64 go test-thread --json > output.json
- run: ajv validate -s schemas/cue_go.json -d output.json
```

**Philosophy Layer:** 2 — Contract testing prevents drift
**Risk:** Low. Automated guardrails.

### 2.3 Stager Schema Distribution (1 hr)
**Files:** `schemas/` (published to npm or GitHub Releases)
**Distribution:**
- GitHub Release: `schemas.zip` with all `.json` files
- npm: `@skillhiive/cue-schemas` (optional)
- Stager build: downloads schemas at build time

**Philosophy Layer:** 2 — Shared contract
**Risk:** Low. Simple file copy.

---

## PHASE 3: ORCHESTRATION COMMANDS (Week 3) — "Manual Orchestration Works"

*New CLI commands for the full orchestration loop: brief → plan → diff → approve → merge.*

### 3.1 `cue orchestrate` Command (6 hrs)
**Files:** `apps/cue/src/commands/orchestrate.ts` (new), `apps/cue/src/main.ts` (register), `apps/cue/src/models.ts` (add `OrchestrateResult`)
**Command:**
```bash
cue orchestrate --brief "Add OAuth to API using existing patterns" \
  --project auth-thread \
  --agent opencode \
  --json
```

**Flow:**
1. Creates Cue task in `draft` state with brief + project + agent
2. Planner runs (Director loop) → generates plan
3. Task → `plan_ready`
4. Returns `{taskId, taskThreadId, state: 'plan_ready', planSummary}`

**OrchestrateResult Schema:**
```typescript
interface OrchestrateResult {
  taskId: string
  taskThreadId: string
  state: 'plan_ready'
  planSummary: {
    steps: number
    estimatedCost: number
    affectedFiles: string[]
  }
}
```

**Philosophy Layer:** 4 (Orchestration) — You direct, agents execute
**Risk:** High. Integrates with Director loop, planner, task model.

### 3.2 `cue approve` Command (4 hrs)
**Files:** `apps/cue/src/commands/approve.ts` (new), `apps/cue/src/main.ts` (register)
**Command:**
```bash
cue approve <taskId> [--revision 2] --json
```

**Flow:**
1. Validates task is in `plan_ready` or `changes_requested`
2. Records approval (kind: `plan` or `what_revision`)
3. Task → `approved` → runner picks up
4. Returns `{taskId, state: 'approved', runnerId}`

**Philosophy Layer:** 5 (Trust Economy) — Approval before publishing
**Risk:** Medium. Task state machine, approval kinds.

### 3.3 `cue merge` Command (3 hrs)
**Files:** `apps/cue/src/commands/merge.ts` (new), `apps/cue/src/main.ts` (register)
**Command:**
```bash
cue merge <taskId> --json
```

**Flow:**
1. Validates task is in `ready` state (post final_review)
2. Runs merge (fast-forward or merge commit)
4. Task → `merged`
5. Returns `{taskId, state: 'merged', commit: 'abc123'}`

**Philosophy Layer:** 5 (Trust Economy) — Diffs before decisions
**Risk:** Medium. Git merge logic, conflict handling.

### 3.4 `cue stager serve` Command (3 hrs)
**Files:** `apps/cue/src/commands/stager-serve.ts` (new), `apps/cue/src/stager/server.ts` (exists)
**Command:**
```bash
cue stager serve [--port 7421] --json
```

**Output:**
```json
{"port": 7421, "url": "ws://localhost:7421", "status": "running"}
```

**Philosophy Layer:** 2 (Cue Integration) — Stager Server lifecycle
**Risk:** Low. Wraps existing server.

---

## PHASE 4: STAGER SERVER + WINDOWS INGEST + PLATFORM GAPS (Week 4) — "Real-Time Sync Everywhere"

### 4.1 Stager Server Integration (3 hrs)
**Files:** `apps/cue/src/stager/server.ts` (enhance), `apps/cue/src/commands/stager-serve.ts`
**Enhancements:**
- Auth: Local-only token from Cue config
- Events: `thread_status`, `orchestration_progress`, `diff_ready`, `check_result`, `overnight_brief`
- Health endpoint: `GET /health` → `{status, cue_version, thread_count, uptime}`
- Graceful shutdown on SIGTERM/SIGINT

**Philosophy Layer:** 2 — Zero-latency sync
**Risk:** Medium. Port conflicts, firewall, process lifecycle.

### 4.2 Windows Shell Event Ingest (6 hrs)
**Files:** `packages/ingest/src/events.ts` (new platform abstraction), `packages/ingest/src/windows.ts` (new)
**Current:** Unix-only (`/proc`, `bash` history, `zsh`/`fish` hooks)
**New:** Platform abstraction layer
```typescript
// packages/ingest/src/events.ts
export interface ShellEventSource {
  start(): Promise<void>
  stop(): Promise<void>
  onEvent: (event: ShellEvent) => void
}

// Unix: reads ~/.bash_history, ~/.zsh_history, uses `script`/`pty`
// Windows: PowerShell `Get-History`, CMD `doskey /history`, PSReadLine
```

**Windows Implementation:**
- PowerShell: `Get-History` + `Register-EngineEvent` for real-time
- CMD: `doskey /history` polling
- PSReadLine: `Get-PSReadLineOption -HistorySavePath`
- Event schema unified: `{t, k:'run', d, c, x, ms, h, p}`

**Philosophy Layer:** 1 (Cross-Platform Kernel) — Windows parity
**Risk:** High. Windows shell diversity (PowerShell 5/7, CMD, Git Bash, WSL).

### 4.2 32-bit Decision & Documentation (1 hr)
**Decision:** **Officially support 64-bit only.**
**Files:** `README.md`, `docs/platform-support.md` (new)
**Content:**
> **Minimum Requirements:** 64-bit OS (macOS 11+, Linux kernel 4.15+, Windows 10 1809+)
> 
> 32-bit architectures (i686, armhf) are not supported. This affects <0.5% of developer machines in 2026.
> 
> For Raspberry Pi 3/Zero: Use 64-bit Raspberry Pi OS (aarch64) — fully supported.

**Philosophy Layer:** 1 — Focus energy on 99.5% of users
**Risk:** Low. Clear communication.

### 4.4 Platform Abstraction Layer (3 hrs)
**Files:** `packages/core/src/platform.ts` (new), audit all `process.platform` usage
**Abstractions:**
```typescript
// packages/core/src/platform.ts
export const platform = {
  isWindows: () => process.platform === 'win32',
  isMac: () => process.platform === 'darwin',
  isLinux: () => process.platform === 'linux',
  shell: {
    historyPath: () => platform.isWindows() 
      ? path.join(process.env.USERPROFILE!, 'AppData', 'Roaming', 'Microsoft', 'Windows', 'PowerShell', 'PSReadLine', 'ConsoleHost_history.txt')
      : path.join(process.env.HOME!, '.bash_history'),
    // ...
  },
  paths: {
    configDir: () => platform.isWindows()
      ? path.join(process.env.APPDATA!, 'cue')
      : path.join(process.env.HOME!, '.config', 'cue'),
    // ...
  }
}
```

**Audit:** Replace all raw `process.platform` checks in business logic.

**Philosophy Layer:** 1 — Clean platform abstraction
**Risk:** Low. Refactoring only.

---

## PHASE 5: BACKSTAGE PERSONAL + RUNNER INFRASTRUCTURE (Month 2) — "Monetize Infrastructure"

### 5.1 Backstage Personal Launch (6 hrs)
**Files:** `apps/backstage/src/` (enhance), billing integration (Stripe)
**Features:**
- Hosted sync: `cue sync push/pull` → Backstage (no self-host)
- Night-shift: refine/distill/classify while you sleep
- 1 runner slot (microVM) for heavy agents
- Dashboard: usage, costs, sync status

**Pricing:** $5/mo (Personal), $20/mo (Pro), $50/mo (Team)

**Philosophy Layer:** 5 (Trust Economy) — Pay for convenience, not capability
**Risk:** Medium. Billing, auth, quota enforcement.

### 5.2 Runner Infrastructure (8 hrs)
**Files:** `apps/runner/src/` (enhance), `packages/orchestra/src/runner/`
**Runner Types:**
| Type | Use Case | Provisioning |
|------|----------|--------------|
| **Local** | Free, on your Mac/Linux | `cue runner start --local` |
| **Backstage MicroVM** | Heavy agents, isolation | `cue runner start --backstage` (Personal+) |
| **Hosted MicroVM** | Cloud execution | Backstage-managed (Pro+) |

**Runner Protocol:**
- gRPC/HTTP to Backstage control plane
- Lease model: acquire → execute → release
- Health checks, version compatibility
- Sandbox: no network (configurable), disk limits

**Philosophy Layer:** 5 (Orchestration Ecosystem) — Scalable execution
**Risk:** High. VM orchestration, networking, security.

### 5.3 Backstage Sync Protocol Hardening (4 hrs)
**Files:** `apps/backstage/src/sync.ts`, `packages/store/src/outbox.ts`
**Enhancements:**
- Conflict resolution: device-local wins (last-write-wins per record)
- Partial sync: only changed threads (cursor-based)
- Bandwidth optimization: compress push body (gzip)
- Retry with exponential backoff + jitter

**Philosophy Layer:** 2 (Cue Integration) — Reliable sync
**Risk:** Medium. Edge cases in conflict resolution.

---

## TECHNICAL DEBT: ACCEPTED (Not Blocking)

| Item | Reason | Revisit |
|------|--------|---------|
| Windows arm64 experimental | Bun support immature | When Bun stable |
| 32-bit officially dropped | <0.5% of devs | Never |
| TUI only on Unix | Windows terminal different | Month 3 |
| OpenCode ingest only | Other agents later | Month 3 |
| Single SQLite file | Simplicity > scale | Year 2 |

---

## RISK MITIGATION

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Windows arm64 build fails | High | Medium | Ship x64 only; arm64 when Bun stable |
| Universal macOS > 20MB | Medium | Low | Separate x64/arm64 if needed |
| Binary startup > 200ms | Medium | Medium | Profile; strip; lazy-load |
| `--json` schema drift | High | High (blocks Stager) | Contract tests in CI; locked schemas |
| Windows shell ingest incomplete | High | High | Ship PowerShell only; iterate |
| Backstage runner VM failures | Medium | High | Health checks; auto-restart; logs |
| Stager IPC breaks on Windows | High | High | Test on Windows weekly |

---

## DEPENDENCIES ON OTHER REPOS

| Repo | What Cue Provides | When |
|------|-------------------|------|
| **Stager** | `--json` on all commands; `orchestrate/approve/merge`; Stager Server | **Phase 2-3** |
| **Web** | Sync endpoint `/cue/push` (Backstage); overnight brief schema | Phase 5 |
| **Backstage** | Same binary (`backstage` subcommand); sync protocol | Phase 5 |
| **Teams** | Shared thread model; project catalog | Month 3 |

---

## DEFINITION OF DONE (Per Phase)

| Phase | Done When |
|-------|-----------|
| 1 | 5 binaries built, tested, ≤15MB, ≤100ms startup; CI matrix green |
| 2 | All 10 commands have `--json`; contract tests pass; Stager IPC works |
| 3 | `orchestrate → approve → merge` works end-to-end; Stager diff review works |
| 4 | Stager Server WS pushes updates; Windows PowerShell events ingested |
| 5 | 100 Personal subscribers; runners execute orchestration tasks |

---

## QUESTIONS RESOLVED (From Your Calls)

| # | Question | Decision |
|---|----------|----------|
| 1 | 32-bit support | **Dropped. 64-bit only. Document clearly.** |
| 2 | Windows arm64 | **Target x64 first; arm64 when Bun stable.** |
| 3 | Universal macOS | **Priority 1. Single download for all Macs.** |
| 4 | `--json` flag | **`--json` on all commands. stdout=JSON, stderr=logs.** |
| 5 | Stager Server | **`cue stager serve` command; bundled in Tauri sidecar.** |
| 6 | Windows shell ingest | **PowerShell first (Get-History + PSReadLine).** |
| 7 | Backstage binary | **Same `cue` binary: `cue backstage serve`.** |

---

## NEXT STEPS

1. **You approve this plan** → I create task breakdown with file-level details
2. **Week 1 sprint** → Phase 1: CI matrix, build scripts, universal macOS, Windows x64
3. **Daily sync** → Blockers, decisions, progress
4. **Phase 2 kickoff** → Only after all 5 targets build and run

**Ready to proceed with Phase 1 task breakdown?**