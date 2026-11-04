# SkillHive Stager — Implementation Plan

**Project:** `stager` (Tauri + Svelte 5 + SvelteKit)
**Role:** Primary Product — Desktop workspace for Cue
**Strategy:** "Pick up the thread" — Cue integration first, everything else serves the loop
**Constraint:** No monetization until 1000 DAU; Cue IPC is the critical path

---

## PHASE 1: CUE IPC LAYER (Week 1-2) — "The Nervous System"

*Stager must speak Cue's language. Every Tauri command maps to a Cue CLI `--json` output.*

### 1.1 Cue CLI JSON Output Schema (2 hrs)
**Files:** `cue/apps/cue/src/models.ts` (source of truth) → `stager/schemas/`
**Task:** Generate TypeScript schemas from Cue's models for:
- `cue go --json` → `CueModel`
- `cue threads --json` → `ThreadsModel`
- `cue stop --json` → `StopModel`
- `cue freeze --json` → `StopModel`
- `cue thaw --json` → `GoModel`
- `cue orchestrate --json` → `OrchestrateResult` (new)

**Implementation:**
```bash
# In cue repo: add --json flag to each command
# Output: stdout = JSON, stderr = human logs
# Stager consumes stdout only
```

**Philosophy Layer:** 2 (Cue Integration) — Contract first
**Risk:** Low. Cue models already exist; just need `--json` flag.

### 1.2 Tauri Commands: Cue IPC (6 hrs)
**Files:** `stager/src-tauri/src/cue_ipc.rs` (new) + `stager/src-tauri/src/lib.rs`
**Commands:**
| Tauri Command | Cue CLI | Output Schema |
|---------------|---------|---------------|
| `cue_go(threadId)` | `cue go <thread> --json` | `CueModel` |
| `cue_threads(all?)` | `cue threads [--all] --json` | `ThreadsModel` |
| `cue_stop(threadId, line?)` | `cue stop <thread> [--line] --json` | `StopModel` |
| `cue_freeze(threadId, line?)` | `cue freeze <thread> [--line] --json` | `StopModel` |
| `cue_thaw(threadId)` | `cue thaw <thread> --json` | `GoModel` |
| `cue_orchestrate(brief, projectThreadId)` | `cue orchestrate --brief "..." --project <thread> --json` | `OrchestrateResult` |

**Implementation (Rust):**
```rust
// src-tauri/src/cue_ipc.rs
use tauri::Command;
use serde::{Deserialize, Serialize};
use std::process::Command as StdCommand;

#[derive(Deserialize)]
struct CueGoArgs { thread_id: String }

#[tauri::command]
async fn cue_go(args: CueGoArgs) -> Result<CueModel, String> {
    let output = StdCommand::new("cue")
        .args(["go", &args.thread_id, "--json"])
        .output()
        .map_err(|e| format!("Failed to spawn cue: {}", e))?;
    
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    
    serde_json::from_slice(&output.stdout)
        .map_err(|e| format!("Failed to parse cue JSON: {}", e))
}
```

**Philosophy Layer:** 2 (Cue Integration) — Zero-latency local IPC
**Risk:** Medium. Cue binary must be in PATH. Handle "cue not found" gracefully.

### 1.3 Cue Binary Detection & Install Prompt (2 hrs)
**Files:** `stager/src/lib/cue-binary.ts` (new) + `stager/src/components/CueInstallPrompt.svelte` (new)
**Logic:**
1. On Stager start: `which cue` → if found, verify version compatibility
2. If not found: Show "Install Cue" prompt with one-liner:
   ```bash
   curl -fsSL cue.skillhiive.com/install.sh | bash
   ```
3. After install: `cue auth login` → opens web, links device
4. Store Cue path in Tauri config for subsequent calls

**Philosophy Layer:** 1 (Atmosphere) — Friction-free entry
**Risk:** Low. Standard install flow.

### 1.4 TypeScript Schemas & Types (2 hrs)
**Files:** `stager/src/lib/cue-types.ts` (generated from Cue models)
**Content:** Exact TypeScript interfaces matching Cue's `models.ts`:
- `CueModel`, `HeadModel`, `Refs`, `ModelFields`, `ThreadsModel`, `ThreadRowModel`, `StopModel`, `GoModel`, `OrchestrateResult`
- `Refs`: branch, head, dirty, topFiles, lastFail, recentCmds, sessions, captures, minutesToday
- `ModelFields`: doing, next, open, confidence

**Philosophy Layer:** 2 (Cue Integration) — Type safety across boundary
**Risk:** Low. Keep in sync via build script.

---

## PHASE 2: REAL DATA SURFACES (Week 2-3) — "No More Sample Data"

*Replace all sample data in the three surfaces with live Cue data.*

### 2.1 Today Surface: Real Thread Head (4 hrs)
**Files:** `stager/src/routes/+page.svelte` (modify `surface === 'today'` block)
**Current:** Hardcoded "STAGER" spotlight project with sample data
**New:** 
1. On mount: `cue_threads()` → find `spotlight` thread
2. `cue_go(spotlightThreadId)` → render real `head`:
   - `head.line` → "What you were about to do"
   - `head.refs.topFiles` → recent files
   - `head.refs.lastFail` → blocker
   - `head.refs.minutesToday` → focus time
   - `head.fields.next.action` → next step
   - `head.stale` → warning badge
3. "Go" button → `cue_go(threadId)` + open terminal at `head.refs.root`
4. Carry from yesterday: `cue_threads()` → filter `status === 'frozen'` + recent

**Philosophy Layer:** 3 (Project Continuity) — "Pick up the thread"
**Risk:** Medium. Terminal launch varies by OS (macOS: `open -a Terminal`, Linux: `gnome-terminal`, etc.)

### 2.2 Projects Surface: Real Catalog (4 hrs)
**Files:** `stager/src/routes/+page.svelte` (modify `surface === 'projects'` block)
**Current:** Static `projects` array with samples
**New:**
1. `cue_threads({all: true})` → map to catalog rows:
   - `status === 'spotlight'` → ◆ "IN SPOTLIGHT"
   - `status === 'push'` → ● "BUILDING"
   - `status === 'dormant'` → · "DORMANT" (with `at` timestamp)
   - `status === 'frozen'` → ‖ "FROZEN" (with `frozenAt`)
2. Each row: emblem (thread initial), name, kind (from `origin`), status badge
3. Click row → `cue_go(threadId)` → switches to Today surface with that thread
4. "New Project" → `cue init` in new directory → creates thread → refreshes catalog

**Philosophy Layer:** 3 (Project Continuity) — Threads as entry points, not folders
**Risk:** Low. Pure data mapping.

### 2.3 Orchestrate Surface: Real Brief → Cue Task (6 hrs)
**Files:** `stager/src/routes/+page.svelte` (modify `surface === 'orchestrate'` block) + new `cue_orchestrate` command
**Current:** Preview-only form with `previewTask` state
**New:**
1. Form: brief textarea + project selector (from `cue_threads`) + agent selector (OpenCode/Codex/Claude)
2. On submit: `cue_orchestrate({brief, projectThreadId, agent})` → returns `{taskId, state: 'draft'}`
3. Stager polls `cue_go(taskThreadId)` → shows planner progress:
   - `planning` → "Planning…"
   - `plan_ready` → shows diff preview (from `head.fields.next`)
   - User clicks "Approve" → `cue approve <taskId>` (new CLI command)
   - `approved` → "Running step 3/7: writing tests"
   - `final_review` → shows diff → "Approve merge?"
4. Background: Stager Server WS pushes updates (Phase 3)

**Philosophy Layer:** 4 (Orchestration) — Manual orchestration, you stay in charge
**Risk:** High. New Cue CLI command `cue orchestrate` needed. Complex state machine.

### 2.4 Surface-Specific UI Polish (3 hrs)
**Files:** `stager/src/routes/+page.svelte` + `stager/src/app.css`
**Tasks:**
- **Today:** Full-width thread head, timer ring if `cue go` active, "Carry from yesterday" section
- **Projects:** Emblem colors per status (amber/sage/blue), scroll-snap catalog, empty state → "Create first project"
- **Orchestrate:** Context chips (project, agent, workspace) update live, diff preview pane
- **All:** Reduced motion respected, pill navigation smooth, theme persists

**Philosophy Layer:** 1 (Atmosphere) — Breathable UI
**Risk:** Low. Visual polish.

---

## PHASE 3: STAGER SERVER + REAL-TIME SYNC (Week 3-4) — "Live Updates"

*Stager Server (exists in Cue) pushes real-time updates to UI. No polling.*

### 3.1 Stager Server Integration (4 hrs)
**Files:** `cue/apps/cue/src/stager/server.ts` (exists) + `stager/src/lib/stager-server.ts` (new)
**Architecture:**
```
Cue Director Loop → Stager Server (WS) → Stager UI (Tauri WebSocket)
```
**Cue Side (already exists in `apps/cue/src/stager/server.ts`):**
- WebSocket server on `ws://localhost:7421` (configurable)
- Events: `thread_status`, `orchestration_progress`, `diff_ready`, `check_result`, `overnight_brief`
- Auth: Local-only, token from Cue config

**Stager Side (new):**
```typescript
// stager/src/lib/stager-server.ts
class StagerServerClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  
  connect() {
    this.ws = new WebSocket('ws://localhost:7421');
    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      this.dispatch(msg);
    };
    this.ws.onclose = () => this.scheduleReconnect();
  }
  
  private dispatch(msg: StagerServerMessage) {
    // Emit to Svelte stores: threadStatus, orchestrationProgress, etc.
  }
}
```

**Philosophy Layer:** 2 (Cue Integration) — Zero-latency sync
**Risk:** Medium. Port conflicts, firewall, process lifecycle.

### 3.2 Real-Time Surface Updates (4 hrs)
**Files:** `stager/src/routes/+page.svelte` + Svelte stores
**Events → UI Updates:**
| Stager Server Event | Surface | Update |
|---------------------|---------|--------|
| `thread_status` | Today/Projects | Status glyph, timestamp, spotlight changes |
| `orchestration_progress` | Orchestrate | Step counter, current action, diff ready flag |
| `diff_ready` | Orchestrate | Shows diff preview, "Approve" button enabled |
| `check_result` | Orchestrate | Step status: pass/fail, output excerpt |
| `overnight_brief` | Today | "While you were away" panel with results |

**Philosophy Layer:** 3 (Project Continuity) — Live context
**Risk:** Medium. Race conditions between IPC and WS updates.

### 3.3 Stager Server Lifecycle Management (2 hrs)
**Files:** `stager/src-tauri/src/main.rs` + `stager/src/lib/stager-server.ts`
**Requirements:**
- Auto-start Stager Server when Stager opens (if Cue running)
- Graceful shutdown on Stager close
- Health check: `ws://localhost:7421/health` → shows Cue version, thread count
- Fallback: If WS fails, poll `cue_threads` every 30s

**Philosophy Layer:** 1 (Atmosphere) — Reliable, invisible infrastructure
**Risk:** Low. Standard process management.

---

## PHASE 4: ORCHESTRATION LOOP (Week 4-5) — "Manual Orchestration Works"

*End-to-end: Brief → Plan → Diff → Approve → Apply → Verify.*

### 4.1 Cue Orchestrate CLI Command (4 hrs)
**Files:** `cue/apps/cue/src/commands/orchestrate.ts` (new) + `cue/apps/cue/src/main.ts` (register)
**Command:** `cue orchestrate --brief "..." --project <thread> [--agent openocde|codex|claude] --json`
**Flow:**
1. Creates Cue task in `draft` state with brief
2. Planner runs → `plan_ready`
3. Returns `{taskId, taskThreadId, state: 'plan_ready'}`
4. Stager polls `cue_go(taskThreadId)` for diff

**Philosophy Layer:** 4 (Orchestration) — You direct, agents execute
**Risk:** High. New command, integrates with Director loop.

### 4.2 Diff Review UI (6 hrs)
**Files:** `stager/src/components/DiffReview.svelte` (new) + `stager/src/routes/+page.svelte`
**Features:**
- Side-by-side diff (old vs. new) with syntax highlighting
- File tree navigation
- "Approve" / "Request Changes" / "View Full" buttons
- Keyboard shortcuts: `A` approve, `C` changes, `F` full
- Shows: check results (pass/fail), output excerpts
- **Trust principle:** Never auto-apply. Human approval required.

**Philosophy Layer:** 5 (Trust Economy) — Diffs before decisions
**Risk:** Medium. Diff rendering performance for large changes.

### 4.3 Approval → Apply Flow (4 hrs)
**Files:** `cue/apps/cue/src/commands/approve.ts` (new) + Stager integration
**Flow:**
1. User clicks "Approve" in DiffReview
2. Stager calls `cue approve <taskId> --json`
3. Cue: task → `approved` → runner picks up → executes steps
4. Stager streams progress via WS (`orchestration_progress`, `check_result`)
5. On `final_review`: Stager shows merge diff → "Merge?"
6. User clicks "Merge" → `cue merge <taskId> --json`
7. Task → `merged` → Stager shows "Done. Merged to main."

**Philosophy Layer:** 5 (Trust Economy) — Approval before publishing
**Risk:** High. Merge conflicts, failed checks, rollback handling.

### 4.4 Overnight Brief Capture (3 hrs)
**Files:** `cue/apps/cue/src/commands/stop.ts` (modify) + `stager/src/components/OvernightBrief.svelte` (new)
**Flow:**
1. `cue stop [--line]` → prompts for overnight brief (optional):
   ```
   What should happen while you're away?
   □ Run tests on auth refactor
   □ Deploy staging
   □ Post update to SkillHive
   ```
2. Brief → stored in Cue task as `orchestrate` kind
3. Backstage picks up → executes overnight
4. Morning: Stager WS `overnight_brief` → shows results panel:
   ```
   While you were away:
   ✅ Tests passed (coverage 87%)
   ✅ Staging deployed
   📝 Post drafted → [Review & Publish]
   ```

**Philosophy Layer:** 4 (Orchestration) — Work continues while you sleep
**Risk:** Medium. Backstage job scheduling, permissions.

---

## PHASE 5: PRO TIER + TEAM FEATURES (Month 2-3) — "Scale What Works"

*Only after 1000 DAU and core loop validated.*

### 5.1 Pro Tier Features (4 hrs)
**Files:** `stager/src/components/ProUpgrade.svelte` + Tauri `invoke('stager_pro_status')`
**Features:**
| Feature | Implementation |
|---------|----------------|
| Team Sync | Shared project catalog via Web ally system |
| Advanced Orchestration | Multi-step briefs, parallel agents, custom runners |
| Backstage Included | Hosted sync + runners (no self-host) |
| Export/Import | Portable context bundles (`.stager` files) |
| Priority Support | Direct Discord/email channel |

**Philosophy Layer:** 5 (Orchestration Ecosystem) — Team amplification
**Risk:** Low. Gated behind auth + subscription.

### 5.2 Team Sync (Web Integration) (6 hrs)
**Files:** `stager/src/lib/team-sync.ts` + Web `teams` repo
**Flow:**
1. Stager Pro user creates team → invites via email/username
2. Team members see shared project catalog (read-only or read-write)
3. Orchestration tasks can be assigned to team members
4. Stager Today shows teammate status: "Sarah — in spotlight: auth refactor"
5. Sync via Web Supabase (same infra as Teams product)

**Philosophy Layer:** 5 (Orchestration Ecosystem) — Shared context
**Risk:** Medium. Requires Web ally system + real-time Supabase.

### 5.3 Context Export/Import (3 hrs)
**Files:** `stager/src/lib/context-bundle.ts`
**Format:** `.stager` bundle (zip):
```
context.stager/
├── manifest.json          # version, cue_version, created_at
├── threads/               # Cue thread data (JSON)
├── save_states/           # Latest save states per thread
├── refs/                  # Git refs, dirty state
├── briefs/                # Overnight briefs, orchestration tasks
└── metadata/              # User preferences, theme, window state
```
**Use Cases:** Machine migration, team handoff, backup, CI artifact.

**Philosophy Layer:** 3 (Project Continuity) — Portable context
**Risk:** Low. Serialization of existing Cue data.

---

## TECHNICAL DEBT: ACCEPTED (Not Blocking)

| Item | Reason | Revisit |
|------|--------|---------|
| Tauri/Rust learning curve | Team knows Svelte; Rust new | Month 1 |
| Single window (no detachable panels) | Scope: single window first | Month 3 |
| No Windows support yet | macOS/Linux first | Month 4 |
| Terminal launch abstraction | OS-specific; good enough for beta | Month 2 |
| Stager Server port conflicts | Configurable port; fallback polling | Month 2 |

---

## RISK MITIGATION

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Cue CLI JSON schema drift | High | High (breaks IPC) | Schema gen in CI; contract test every PR |
| `cue` binary not in PATH | Medium | High (blocks all IPC) | Install prompt + PATH detection + `which cue` fallback |
| Stager Server port conflict | Medium | Medium | Configurable port; random ephemeral; fallback polling |
| Terminal launch fails on Linux | Medium | Medium | Detect DE (GNOME/KDE/etc.); support common terminals |
| Orchestration diff too large | Medium | High (trust) | Streaming diff; chunked rendering; "View in editor" fallback |
| Backstage overnight jobs fail silently | Medium | High (trust) | Morning summary always shows: success/failure + logs link |
| Tauri binary size > 100MB | Low | Medium | Strip symbols; `upx` compress; lazy-load heavy deps |

---

## DEPENDENCIES ON OTHER REPOS

| Repo | What Stager Needs | When |
|------|-------------------|------|
| **Cue** | `--json` flags on all CLI commands; `cue orchestrate`; `cue approve`; Stager Server WS | **Phase 1 (Week 1)** |
| **Backstage** | Overnight orchestration job kinds; hosted runners | Phase 4 |
| **Web** | Team sync (ally system), overnight brief → posts, verified portfolio | Phase 5 |
| **Teams** | Shared project catalog, team presence | Phase 5 |

---

## DEFINITION OF DONE (Per Phase)

| Phase | Done When |
|-------|-----------|
| 1 | `invoke('cue_go', {threadId})` returns real `CueModel`; renders in Today |
| 2 | All 3 surfaces show real Cue data; zero sample data; `cue orchestrate` works |
| 3 | `cue stop` → Stager updates in < 2s via WS; no polling needed |
| 4 | Brief → Diff → Approve → Merge works end-to-end; overnight brief shows results |
| 5 | 10 Pro subscribers; 3 team orgs; context export/import works |

---

## QUESTIONS RESOLVED (From Your Calls)

| # | Question | Decision |
|---|----------|----------|
| 1 | Stager Server binary | Bundle in Tauri as sidecar; `cue stager serve` starts it |
| 2 | Orchestrate CLI | `cue orchestrate --brief --project --agent` (new command) |
| 3 | Diff Review UI | In Stager (Tauri webview); syntax highlighting, side-by-side |
| 4 | Window Management | Single window, three surfaces, pill navigation |
| 5 | IPC Protocol | Tauri `invoke` → `cue <cmd> --json` (stdio) |
| 6 | Auth | Cue handles auth; Stager trusts local Cue (no separate login) |
| 7 | Auto-Start | `cue stager serve` on login via launchd/systemd (user config) |

---

## NEXT STEPS

1. **You approve this plan** → I create task breakdown with file-level details
2. **Week 1 sprint** → Phase 1: Cue `--json` flags + Tauri IPC commands
3. **Daily sync** → Blockers, decisions, progress
4. **Phase 2 kickoff** → Only after Phase 1 IPC works end-to-end

**Ready to proceed with Phase 1 task breakdown?**