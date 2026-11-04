# SkillHive Cue — Philosophy Mindmap & Strategic Brief

**Project:** `cue` (Bun + TypeScript, multi-package monorepo)
**Role:** **Local Kernel** — The only owner of threads, save states, captures, ops, privacy gate, Director control loop. Stager talks to it. Backstage is Cue running always-on.
**Status:** Feature-complete kernel + Director + Stager integration. **Not cross-platform yet.**
**Last Commit:** October 18, 2026 (pushed to GitHub)

---

## 1. CORE PHILOSOPHY: WHY THIS EXISTS

### The Founding Insight
> **"The interface should adapt to the work. The work should never adapt to the interface."** — Cue is the *nervous system* that makes this possible.

Cue is not a chat app. Not a second git history. Not a place where agents mark their own work verified. Cue is the **local kernel** that:
- Owns the truth: threads, save states, captures, ops, privacy gate
- Runs the Director: planning → approval → execution → verification
- Enforces the gate: every model call scrutinized for purpose, tier, budget, safety
- Syncs to Backstage: night-shift refine/distill/classify while you sleep
- Stager is a client. Backstage is Cue running always-on.

### The Philosophy Stack (Bottom to Top)

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 5: TRUST ECONOMY                                         │
│  ├─ Verified execution: every diff reviewed, every check run   │
│  ├─ Ledger: full audit trail of tokens, cost, decisions        │
│  ├─ Trust ladder (rungs 1-4): progressive autonomy             │
│  └─ Portable context: .stager bundles, reproducible runs       │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 4: DIRECTOR ORCHESTRATION                                │
│  ├─ Manual orchestration: you direct, agents execute           │
│  ├─ Task state machine: 13 states, monotonic transitions       │
│  ├─ Planner → Judge → Critic → Merge: human-in-the-loop       │
│  └─ Overnight brief → Backstage executes while you sleep       │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 3: MEMORY & CONTINUITY                                   │
│  ├─ Threads: spotlight/push/dormant/frozen (not folders)      │
│  ├─ Save states: append-only, fact-hash deduplication          │
│  ├─ Freeze/Thaw: exact context restore (line, refs, next)      │
│  ├─ Captures: inbox → classified → threaded                    │
│  └─ Refs: git + events + sessions + captures = context         │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 2: PRIVACY GATE & INGEST                                 │
│  ├─ Tier system: local (free) vs open (paid/NIM)               │
│  ├─ Scrub: secrets never leave local tier                      │
│  ├─ Ingest: shell events, git facts, OpenCode sessions         │
│  ├─ Idle/leave/night: automatic freeze triggers                │
│  └─ Stager IPC: `cue go/threads/stop --json` for desktop       │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 1: CROSS-PLATFORM LOCAL KERNEL (THE FOUNDATION)         │
│  ├─ Runs everywhere: amd64/arm64 Windows, Linux, macOS         │
│  ├─ Single binary: `cue` — no runtime, no install friction     │
│  ├─ SQLite local: zero-config, portable, durable               │
│  ├─ Stager server: WS on localhost for real-time UI            │
│  └─ Backstage sync: same binary, different mode                │
└─────────────────────────────────────────────────────────────────┘
```

### The Golden Thread
**Every component must answer: "Does this help a builder trust their local kernel with their context?"**

If yes → build it. If no → kill it.

---

## 2. USER ARCHETYPES & THEIR JOURNEYS

### Primary: The Solo Builder (Terminal-Native)
- **Pain:** Context switching kills flow; AI agents are impressive but untrustworthy
- **Journey:**
  1. `cue init` → creates thread, maps repo, sets up tier rules
  2. `cue go` → renders exact thread head (line 247, next action, refs)
  3. Works in editor/terminal → shell events auto-ingested
  4. `cue stop "write tests for auth"` → freeze + capture + overnight brief
  5. Closes laptop → Backstage refines save state, distills session
  6. Morning: `cue go` → exact context + overnight results (tests passed, diff ready)
  7. `cue orchestrate --brief "add OAuth" --project auth` → manual orchestration
  8. Reviews diff → approves → merged → trust compounds

### Secondary: The Stager Desktop User
- **Pain:** Wants visual context, diff review UI, project catalog
- **Journey:**
  1. Opens Stager → "Pick up the thread" (Today surface)
  2. Stager calls `cue go --json` → renders real thread head
  3. Clicks "Go" → terminal opens at exact repo/path
  4. Works → `cue stop` in terminal → Stager updates via WS in <2s
  4. Orchestrates in Stager UI → `cue orchestrate --json` → diff review → approve
  5. Never leaves Cue's context — Stager is a *view*, not a separate system

### Tertiary: The Team Lead (Future)
- **Pain:** No visibility into deep work without interrupting
- **Journey:**
  1. TeamOffice (web) shows aggregate: "3 in spotlight, 2 orchestrating"
  2. Clicks builder → sees their Stager Today (with permission)
  3. Understands blockers: "auth refactor blocked on API keys"
  4. Helps by unblocking, not managing

---

## 3. FEATURE MAP: WHAT EXISTS vs. WHAT'S NEEDED

### ✅ FULLY BUILT & WORKING (Kernel Complete)

| Feature | Location | Status |
|---------|----------|--------|
| **Thread Model** | `packages/core/src/schema.ts`, `packages/store/src/threads.ts` | ✅ Spotlight/push/dormant/frozen, tier (open/local) |
| **Save States** | `packages/core/src/savestate.ts`, `packages/store/src/savestate.ts` | ✅ Append-only, fact-hash dedup, deterministic base |
| **Privacy Gate** | `packages/gate/src/` | ✅ Tier routing, budget, scrub, canary, model routing |
| **Director Loop** | `packages/orchestra/src/control/` | ✅ 13 states, planner, judge, critic, step verification |
| **Task Model** | `packages/store/src/tasks.ts`, `docs/data-and-contracts.md` | ✅ 13 states, ULID, brief, plan revisions, approvals |
| **Ingest** | `packages/ingest/src/` | ✅ Shell events, git facts, OpenCode sessions, idle detection |
| **Freeze/Thaw** | `apps/cue/src/commands/freeze.ts`, `stop.ts` | ✅ Exact context capture, `.md` state files |
| **Stager IPC Types** | `apps/cue/src/stager/` | ✅ Types, server, client, engine, director-loop |
| **Backstage Sync** | `apps/backstage/src/sync.ts`, `worker.ts` | ✅ Push/pull, refine/distill/classify jobs |
| **CLI Commands** | `apps/cue/src/commands/` | ✅ go, stop, freeze, thaw, threads, think, north, capture |
| **TUI** | `packages/tui/src/` | ✅ Render, layout, snapshots |

### ⚠️ BUILT BUT INCOMPLETE / MISSING PLATFORM SUPPORT

| Gap | Impact | Fix Required |
|-----|--------|--------------|
| **Cross-platform builds** | Only macOS arm64, Linux x64/arm64 | Windows (msvc/gnu), 32-bit Linux, universal macOS |
| **`--json` flags on CLI** | Stager IPC needs machine-readable output | Add to all commands: go, threads, stop, freeze, thaw, orchestrate |
| **`cue orchestrate` command** | Stager Orchestrate surface needs it | New command: brief → task → plan_ready |
| **`cue approve/merge` commands** | Diff review → approval flow | New commands for orchestration loop |
| **Windows shell ingest** | `packages/ingest/src/events.ts` uses Unix shell | PowerShell/CMD event parsing |
| **Stager Server binary** | Bundled in Tauri sidecar | `cue stager serve` command |
| **Cross-compile CI** | No GitHub Actions for multi-arch | Matrix builds for all targets |

### ❌ MISSING ENTIRELY (From Philosophy)

| Missing Feature | Philosophy Layer | Dependency |
|-----------------|------------------|------------|
| **32-bit Linux support** | Layer 1 | Cross-compile toolchain |
| **Windows arm64 support** | Layer 1 | Bun support + cross-compile |
| **Universal macOS binary** | Layer 1 | `bun build --target=bun-darwin-universal` |
| **Portable `.stager` bundles** | Layer 5 | Export/import context |
| **Ledger audit trail** | Layer 5 | Full token/cost/decision log |

---

## 4. CROSS-PLATFORM STRATEGY: "Single Binary, Everywhere"

### Target Matrix (Priority Order)

| Platform | Arch | Runtime | Status | Priority |
|----------|------|---------|--------|----------|
| **macOS** | arm64 (Apple Silicon) | Bun native | ✅ Working | Done |
| **macOS** | x64 (Intel) | Bun native | 🔄 Needed | High (Intel Macs still common) |
| **macOS** | universal (fat binary) | Bun `--target=bun-darwin-universal` | 🔄 Needed | High (single download) |
| **Linux** | x64 (amd64) | Bun native | ✅ Working | Done |
| **Linux** | arm64 (aarch64) | Bun native | ✅ Working | Done |
| **Linux** | armhf (32-bit ARM) | Bun *unsupported* | ❌ Need alternative | Medium (Raspberry Pi, embedded) |
| **Linux** | i686 (32-bit x86) | Bun *unsupported* | ❌ Need alternative | Low (legacy) |
| **Windows** | x64 (amd64) | Bun native (stable) | 🔄 Needed | **Critical** (majority of devs) |
| **Windows** | arm64 | Bun native (experimental) | 🔄 Needed | High (Surface, ARM laptops) |
| **Windows** | x86 (32-bit) | Bun *unsupported* | ❌ Need alternative | Low |

### Bun's Current Support (v1.1+)
| Target | Status | Notes |
|--------|--------|-------|
| `bun-darwin-arm64` | ✅ Stable | Primary macOS target |
| `bun-darwin-x64` | ✅ Stable | Intel Macs |
| `bun-linux-x64` | ✅ Stable | Most Linux servers/desktops |
| `bun-linux-arm64` | ✅ Stable | ARM Linux |
| `bun-windows-x64` | ✅ Stable | **Critical for adoption** |
| `bun-windows-arm64` | ⚠️ Experimental | Surface Pro, ARM Windows |
| `bun-linux-armhf` | ❌ Not supported | Need separate strategy |
| `bun-linux-x86` | ❌ Not supported | Need separate strategy |

### Strategy for Unsupported Targets (32-bit)

| Approach | Feasibility | Effort |
|----------|-------------|--------|
| **Bun compile + qemu-user** | Possible for armhf | Medium (slow, emulation overhead) |
| **Separate Node.js build** | `pkg` or `nexec` for 32-bit | High (dual runtime) |
| **Drop 32-bit officially** | Pragmatic | Zero (document minimum: 64-bit) |

**Recommendation:** **Officially support 64-bit only.** Document minimum requirement: "64-bit OS required." 32-bit is <1% of developer machines in 2026. Focus energy on Windows x64/arm64 + universal macOS.

### Universal macOS Binary
```bash
# Single .dmg/.zip for all Macs
bun build --compile --target=bun-darwin-universal apps/cue/src/main.ts --outfile dist/cue-darwin-universal
```
- Bun supports `--target=bun-darwin-universal` (fat binary: x64 + arm64)
- Single download for all Mac users
- **High priority** — eliminates "which download?" friction

---

## 5. CLI JSON OUTPUT CONTRACT (Stager IPC Requirement)

### Required `--json` Flags (All Commands)

| Command | Current Output | Required JSON Schema |
|---------|----------------|---------------------|
| `cue go <thread>` | Human TUI | `CueModel` (see `apps/cue/src/models.ts`) |
| `cue threads [--all]` | Human TUI | `ThreadsModel` |
| `cue stop <thread> [--line]` | Human TUI | `StopModel` |
| `cue freeze <thread> [--line]` | Human TUI | `StopModel` |
| `cue thaw <thread>` | Human TUI | `GoModel` |
| `cue orchestrate --brief --project --agent` | **Not exists** | `OrchestrateResult` |
| `cue approve <taskId>` | **Not exists** | `ApprovalResult` |
| `cue merge <taskId>` | **Not exists** | `MergeResult` |
| `cue stager serve` | **Not exists** | Starts WS server, outputs port |

### JSON Output Rules
```bash
# Stdout = pure JSON (machine-readable)
# Stderr = human logs, progress, errors
# Exit code: 0 = success, 1 = user error, 2 = system error

# Example:
$ cue go my-thread --json
{"screen":"cue","now":1700000000000,"thread":{"name":"auth","status":"spotlight"},"head":{"at":1700000000000,"by":"local:model","line":"write tests for auth middleware","fields":{"doing":"auth tests","next":{"action":"write integration tests","where":"tests/auth.test.ts"},"open":[],"confidence":"high"},"refs":{"branch":"main","head":"abc123","dirty":{"files":3,"insertions":45,"deletions":12},"topFiles":["src/auth.ts","tests/auth.test.ts"],"lastFail":null,"recentCmds":["cargo test","git diff"],"lastCommit":{"subject":"refactor auth","at":1699999999000},"sessions":[],"captures":[],"minutesToday":120},"spotlight":null,"warm":[],"also":[],"dormantCount":5,"frozenCount":1,"stale":false,"announce":null,"curtain":false}
```

### Implementation Pattern
```typescript
// apps/cue/src/commands/go.ts
export async function runGo(context: Context, query: string, opts: GoOptions): Promise<number> {
  const match = matchThread(context.db, query)
  if (!match.ok) return error(match.message)
  
  writeEntry(context.db, match.thread.id, 'cue go', context.now, context.thresholds.entryGapMin)
  
  if (opts.json) {
    const model = goModel(context, match.thread)
    console.log(JSON.stringify(model))  // stdout = JSON
    return 0
  }
  
  // Human output (existing)
  if (opts.printCdRequested) printCd(match.thread.root)
  process.stdout.write(render(goModel(context, match.thread), opts))
  return 0
}
```

---

## 6. STRATEGIC POSITIONING

### Cue is the Kernel — Everything Else is a Client

| Product | Relationship to Cue |
|---------|---------------------|
| **Stager** | Desktop client — Tauri IPC → `cue --json` |
| **Backstage** | Cue running always-on — same binary, `backstage serve` |
| **Web** | Social layer — receives Cue sync via Backstage `/v1/push` |
| **Teams** | Org layer — shared Cue threads via Web ally system |
| **Mobile** | Companion — reads synced Cue state from Web |

### The Wedge
**`cue` = The only local kernel that gives you exact context restore + AI orchestration + verified proof — all in one binary.**

- No Electron bloat (Bun compile = ~15MB binary)
- No cloud dependency (SQLite local, privacy-first)
- Extensible (Director loop, custom runners, custom tiers)
- Cross-platform (single binary per platform)

---

## 7. MONETIZATION PHILOSOPHY: FREE KERNEL, PAID INFRASTRUCTURE

### Cue CLI: Forever Free & Open Source
- Local kernel, privacy gate, Director loop, freeze/thaw, Stager IPC
- **No telemetry, no cloud dependency, no account required**

### Backstage (Hosted Cue): Paid
| Tier | Price | Includes |
|------|-------|----------|
| **Personal** | $5/mo | Hosted sync, night-shift refine/distill, 1 runner slot |
| **Pro** | $20/mo | Unlimited runners, custom tiers, priority queue |
| **Team** | $50/mo | Shared threads, team runners, admin dashboard |

### Runners (VM/MicroVM): Usage-Based
- Backstage-managed microVMs for heavy agents
- Pay per CPU-minute
- Local runners (Mac/Linux) always free

**Rule: The kernel stays free. You pay for convenience (hosted sync, runners), not capability.**

---

## 8. GO-TO-MARKET: THE TERMINAL WEDGE

### Target: Builders Who Live in Terminal
- neovim/helix/VS Code users
- Rust/Go/TypeScript/C developers
- Hackatime/Wakatime trackers
- Frustrated by context loss, distrust AI autopilot

### Launch Sequence
1. **Month 1:** Cross-platform binaries + `--json` flags + Stager IPC working
2. **Month 2:** 100 beta users (Hack Club, terminal communities) → "Pick up the thread" test
3. **Month 3:** Measure: `cue go` frequency, freeze/thaw usage, orchestration adoption
4. **Month 4:** Backstage Personal launch ($5/mo) for hosted sync
5. **Month 6:** Team/Enterprise; Stager Pro; Web integration

### Success Criteria (Beta)
| Metric | Threshold |
|--------|-----------|
| `cue go` daily usage | ≥3x/day per user |
| Freeze/thaw success rate | ≥95% (exact context restore) |
| Orchestration tasks/week | ≥1 per user |
| Diff approval rate | ≥80% |
| "Would recommend" | ≥9/10 |

---

## 9. QUESTIONS FOR ALIGNMENT

### Cross-Platform
1. **32-bit support** — Officially drop? Document "64-bit only"?
2. **Windows arm64** — Target now (experimental Bun) or wait for stable?
3. **Universal macOS** — Priority 1 for single download?
4. **Linux distro compatibility** — Static linking? glibc version minimum?

### CLI & IPC
5. **`--json` flag naming** — `--json` vs `--output=json` vs `--format=json`?
6. **Stderr vs stdout** — JSON on stdout, logs on stderr (standard)?
7. **Error format** — JSON errors too? `{error: true, code, message}`?

### Architecture
8. **Stager Server** — Bundled in Tauri sidecar or `cue stager serve` standalone?
9. **Backstage binary** — Same `cue` binary with `backstage` subcommand?
10. **Plugin system** — Custom tiers/runners/packs via dynamic load?

### Monetization
11. **Backstage Personal price** — $5/mo or $3/mo?
12. **Runner pricing** — Per-minute vs per-hour vs included?

---

## 10. SUCCESS DEFINITION (The North Star)

> **In 6 months, `cue` is the answer to: "How do I get exact context restore + trustworthy AI orchestration + verified proof — all in a 15MB binary that runs everywhere?"**

**Measured by:**
- 5000+ developers with `cue` installed across all 5 target platforms
- 1000+ daily active `cue go` users
- 500+ orchestrations/week (manual + overnight)
- 80%+ diff approval rate (trust in the loop)
- $10k+/mo Backstage Personal recurring
- Zero "cue not found on my platform" issues

---

**This philosophy document is the contract. The implementation plan must trace every cross-platform build target, every `--json` flag, every Stager IPC command back to these principles. Any feature not serving "local kernel you can trust" gets cut.**

---

**NEXT: Upon approval, I'll create `IMPLEMENTATION_cue.md` with:**
- Phase 1: Cross-platform builds (CI matrix, universal macOS, Windows x64/arm64)
- Phase 2: `--json` flags on all CLI commands + Stager IPC schemas
- Phase 3: New orchestration commands (`orchestrate`, `approve`, `merge`)
- Phase 4: Stager Server + Windows shell ingest + 32-bit decision
- Phase 5: Backstage Personal launch + Runner infrastructure
- Every task mapped to Philosophy Layer
- CI/CD pipeline for multi-arch releases
- Verification cycle per phase