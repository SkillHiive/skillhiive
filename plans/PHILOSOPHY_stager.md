# SkillHive Stager — Philosophy Mindmap & Strategic Brief

**Project:** `stager` (Tauri + Svelte 5 + SvelteKit)
**Role:** **Primary Product** — Desktop workspace for Cue. The "calm, adaptive workspace for project continuity and manual orchestration."
**Status:** Preview/Shell — Beautiful UI, **not connected to Cue** ("CUE NOT CONNECTED" banner)
**Last Commit:** October 18, 2026

---

## 1. CORE PHILOSOPHY: WHY THIS EXISTS

### The Founding Insight
> **"The interface should adapt to the work. The work should never adapt to the interface."** — Stager's north star principle

Stager is the **physical manifestation of Cue's philosophy** on desktop. It's not a dashboard. It's not a monitor. It's a *stage* where your work waits for you — exactly where you left it, with the context you need to continue.

### The Philosophy Stack (Bottom to Top)

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 5: ORCHESTRATION ECOSYSTEM                               │
│  ├─ Manual orchestration: you direct, agents execute           │
│  ├─ Overnight brief → Backstage runs while you sleep           │
│  ├─ Diff review before apply → you stay in control             │
│  └─ Autopilot (later): trusted patterns run automatically      │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 4: PROJECT CONTINUITY                                    │
│  ├─ Freeze/Thaw: exact context restore (files, terminal, AI)   │
│  ├─ Project catalog: threads as entry points, not folders      │
│  ├─ Spotlight/Push/Dormant/Frozen: work has natural rhythm     │
│  └─ History as narrative: not metrics, but story               │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 3: THE THREE SURFACES                                    │
│  ├─ TODAY: intent → focus → capture → review (daily loop)      │
│  ├─ PROJECTS: living documents of work + insight               │
│  └─ ORCHESTRATE: give work direction; Cue coordinates          │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 2: CUE INTEGRATION (THE NERVOUS SYSTEM)                 │
│  ├─ `cue go --json` → renders exact thread head state          │
│  ├─ `cue threads --json` → populates project catalog           │
│  ├─ `cue stop --json` → captures overnight brief               │
│  └─ Stager server ↔ Cue IPC: zero-latency, local-first         │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 1: ATMOSPHERE (THE NON-NEGOTIABLE FOUNDATION)           │
│  ├─ Calm tech: no dashboards, no notifications, no noise       │
│  ├─ Breathable: UI adapts to surface (today/projects/orchestrate)│
│  ├─ Spatial memory: pill navigation, scroll-snap, muscle memory│
│  └─ "Pick up the thread" — not "manage your tasks"             │
└─────────────────────────────────────────────────────────────────┘
```

### The Golden Thread
**Every pixel must answer: "Does this help a builder return to flow without friction?"**

If yes → build it. If no → kill it.

---

## 2. USER ARCHETYPES & THEIR JOURNEYS

### Primary: The Solo Builder (Developer)
- **Pain:** Context switching kills momentum; "where was I?" costs 30min per return
- **Journey:**
  1. Opens Stager → "Pick up the thread" (Today surface)
  2. Sees exact Cue thread head: line, refs, next action, spotlight status
  3. Clicks "Go" → terminal opens at exact repo, Cue resumes thread
  4. Works → `cue stop` in terminal → captures line + blockers + shipped
  5. Closes laptop → Stager shows "While you were away" on next open
  6. Orchestrates overnight: "Run tests on auth refactor" → Backstage executes
  7. Morning: Stager shows diff → approve → merged → momentum preserved

### Secondary: The Intentional Orchestrator
- **Pain:** AI agents are impressive but untrustworthy; "vibe coding" loses control
- **Journey:**
  1. Opens Orchestrate surface → writes brief: "Add OAuth to API, use existing patterns"
  2. Stager shows: project context, agent (OpenCode), isolated worktree
  3. Reviews plan → sees diff → approves → Cue coordinates agent
  4. Watches progress in Today surface → "Running step 3/7: writing tests"
  5. Steps away → Backstage continues → morning: review + merge
  6. **Never loses the thread** — every orchestration is a Cue task with full history

### Tertiary: The Team Lead (Future)
- **Pain:** No visibility into deep work; standups are theater
- **Journey:**
  1. TeamOffice (web) shows aggregate: "3 builders in spotlight, 2 orchestrating"
  2. Clicks builder → sees their Stager Today (with permission)
  3. Understands blockers without interrupting: "auth refactor blocked on API keys"
  4. Helps by unblocking, not managing

---

## 3. FEATURE MAP: WHAT EXISTS vs. WHAT'S NEEDED

### ✅ BUILT & BEAUTIFUL (UI Shell Complete)

| Feature | Location | Status |
|---------|----------|--------|
| **Three Surfaces** | `+page.svelte` | ✅ Today / Projects / Orchestrate with pill navigation |
| **Pill Navigation** | `+page.svelte:48-76` | ✅ Smooth scroll-snap, hover preview, keyboard accessible |
| **Today Surface** | `+page.svelte:338-396` | ✅ Spotlight project, call sheet, principle note, sample data |
| **Projects Surface** | `+page.svelte:398-420` | ✅ Project catalog with emblems, states, sample data |
| **Orchestrate Surface** | `+page.svelte:421-448` | ✅ Task brief form, context chips, preview response |
| **Welcome Screen** | `WelcomeScreen.svelte` | ✅ Animated entry, reduced motion support |
| **Preview Task** | `preview-task.ts` | ✅ Client-side task brief preview |
| **Tauri Config** | `tauri.conf.json` | ✅ Overlay titlebar, macOS native, CSP locked down |

### ⚠️ BUILT BUT DISCONNECTED (The "CUE NOT CONNECTED" Problem)

| Missing Connection | Impact | Fix Required |
|--------------------|--------|--------------|
| **No Cue IPC** | Today surface shows sample data, not real thread head | Tauri commands → `cue go --json` / `cue threads --json` / `cue stop --json` |
| **No Project Catalog** | Projects surface shows static samples | `cue threads --json` → populates catalog with real threads |
| **No Overnight Brief** | Orchestrate surface is preview only | `cue stop --json` captures brief → sends to Backstage |
| **No Real-Time Sync** | Stager doesn't reflect Cue state changes | Stager server (`apps/cue/src/stager/server.ts`) ↔ WebSocket |
| **No Agent Log Visibility** | Can't see orchestration progress | Stager client subscribes to Cue director loop events |

### ❌ MISSING ENTIRELY (From Philosophy)

| Missing Feature | Philosophy Layer | Dependency |
|-----------------|------------------|------------|
| **Cue IPC Layer** | Layer 2 | Tauri `invoke` → Cue CLI JSON output |
| **Stager Server** | Layer 2 | `apps/cue/src/stager/server.ts` (exists, needs wiring) |
| **Real Thread Head Display** | Layer 3 | `cue go --json` → renders line, refs, next action |
| **Project Catalog from Cue** | Layer 3 | `cue threads --json` → spotlight/push/dormant/frozen |
| **Overnight Brief Capture** | Layer 4 | `cue stop` → brief → Backstage job |
| **Diff Review UI** | Layer 5 | Stager shows patch → approve/reject → Cue applies |
| **Agent Progress Stream** | Layer 5 | Director loop events → Stager Today surface |
| **Breathable UI Transitions** | Layer 1 | Surface-specific layouts (focus vs. orchestrate) |

---

## 4. THE THREE SURFACES: DEEP DESIGN

### Surface 1: TODAY — "Your Stage"
```
┌─────────────────────────────────────────────────────────────┐
│  STAGER / YOUR STAGE                    [Pill: Today]       │
├─────────────────────────────────────────────────────────────┤
│  A QUIETER WAY BACK IN                                        │
│  Pick up the thread.                                          │
│  Your work has a place to wait for you.                       │
├─────────────────────────────────────────────────────────────┤
│  IN THE SPOTLIGHT                    ●●●○○  6h 42m  3 shipped │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ STAGER ✳    Desktop workspace                         │   │
│  │ A workspace that knows when to make room.             │   │
│  │ [Explore the stage ↗]  [Draft a task →]               │   │
│  └──────────────────────────────────────────────────────┘   │
│  ↳ THE NEXT THREAD                                          │
│    Connect this stage to Cue's local API. Then the          │
│    context here will be yours, not a sample.                │
├─────────────────────────────────────────────────────────────┤
│  CALL SHEET                    A FEW THINGS THAT MATTER     │
│  01  Reconnect Stager to Cue        NOW                     │
│  02  Shape the manual handoff       NEXT                    │
│  03  Review before anything lands   ALWAYS                  │
├─────────────────────────────────────────────────────────────┤
│  A SMALL PROMISE                                              │
│  "The interface should adapt to the work.                   │
│   The work should never adapt to the interface."            │
└─────────────────────────────────────────────────────────────┘
```

**Real Data Requirements (from Cue):**
- `cue go --json` → `{screen, now, thread, head, spotlight, warm, also, dormantCount, frozenCount, stale, announce, curtain}`
- `head` = `{at, by, line, fields, refs}` — **this is the "exact context"**
- `refs` = branch, head, dirty, topFiles, lastFail, recentCmds, minutesToday

### Surface 2: PROJECTS — "Threads of Your Work"
```
┌─────────────────────────────────────────────────────────────┐
│  STAGER / PROJECTS                     [Pill: Projects]     │
├─────────────────────────────────────────────────────────────┤
│  THE WORKSPACE, AT A GLANCE                                   │
│  Threads of your work.                                        │
│  Projects are entry points, not folders to maintain.          │
│  Cue will bring the real context here when connected.         │
├─────────────────────────────────────────────────────────────┤
│  PROJECT CATALOG                    ILLUSTRATIVE DATA         │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 01  S  STAGER        Desktop workspace    IN SPOTLIGHT  │  │
│  │ 02  C  CUE           Local orchestrator  CONNECTED SOON │  │
│  │ 03  B  BACKSTAGE     Remote service      REMOTE         │  │
│  └────────────────────────────────────────────────────────┘  │
│  In the connected app, Cue owns this catalog and the         │
│  continuity behind each project.                              │
└─────────────────────────────────────────────────────────────┘
```

**Real Data Requirements (from Cue):**
- `cue threads --json` → `{screen, now, rows: [{glyph, name, verb, at, local, ink}], more, momentum}`
- Status mapping: `spotlight` → ◆, `push` → ●, `dormant` → ·, `frozen` → ‖
- Each row clickable → `cue go <thread>` → opens Today with that thread

### Surface 3: ORCHESTRATE — "Your Intent, Held Clearly"
```
┌─────────────────────────────────────────────────────────────┐
│  STAGER / ORCHESTRATION               [Pill: Orchestrate]   │
├─────────────────────────────────────────────────────────────┤
│  YOUR INTENT, HELD CLEARLY                                    │
│  Give the work a direction.                                   │
│  Manual orchestration starts with you choosing what matters.  │
│  Cue will coordinate; you stay in charge.                     │
├─────────────────────────────────────────────────────────────┤
│  TASK BRIEF                    PREVIEW · NOT CONNECTED        │
│  What would you like Cue to coordinate?                       │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Describe the outcome, not the keystrokes…              │  │
│  └────────────────────────────────────────────────────────┘  │
│  PROJECT: Stager · sample    AGENT: OpenCode · planned       │
│  WORKSPACE: Isolated worktree · planned                      │
│  [Preview brief →]  (disabled until connected)               │
├─────────────────────────────────────────────────────────────┤
│  DIFFS BEFORE DECISIONS      APPROVAL BEFORE PUBLISHING       │
└─────────────────────────────────────────────────────────────┘
```

**Real Data Requirements (from Cue):**
- User writes brief → Stager validates → `cue orchestrate --brief "..." --project <thread>` (new command)
- Creates Cue task in `draft` state → planner runs → `plan_ready` → Stager shows diff
- User approves → `approved` → Cue runs → Stager streams progress

---

## 5. CUE INTEGRATION ARCHITECTURE (Layer 2)

### The Nervous System
```
┌─────────────────────────────────────────────────────────────────┐
│                        STAGER (Tauri)                           │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐ │
│  │   Svelte UI     │    │   Tauri IPC     │    │  Stager     │ │
│  │  (Three Surfs)  │◄──►│  (invoke)       │◄──►│  Server     │ │
│  └─────────────────┘    └────────┬────────┘    │  (WS)       │ │
│                                 │             └──────┬──────┘ │
└─────────────────────────────────┼─────────────────────┼────────┘
                                  │                     │
                    ┌─────────────┴─────────────┐       │
                    ▼                           ▼       ▼
           ┌─────────────────┐         ┌─────────────────┐
           │   CUE CLI       │         │   BACKSTAGE     │
           │  (Local Kernel) │◄───────►│  (Remote Sync)  │
           │  - threads      │  Sync   │  - refine       │
           │  - saveStates   │         │  - distill      │
           │  - director     │         │  - classify     │
           └─────────────────┘         └─────────────────┘
```

### IPC Contract (Stager ↔ Cue CLI)

| Stager Invokes | Cue CLI Command | Expected JSON Output |
|----------------|-----------------|---------------------|
| `cue_go(threadId)` | `cue go <thread> --json` | `CueModel` (see `apps/cue/src/models.ts`) |
| `cue_threads(all?)` | `cue threads [--all] --json` | `ThreadsModel` |
| `cue_stop(threadId, line?)` | `cue stop <thread> [--line] --json` | `StopModel` |
| `cue_orchestrate(brief, project)` | `cue orchestrate --brief "..." --project <thread> --json` | `{taskId, state: 'draft'}` |
| `cue_freeze(threadId)` | `cue freeze <thread> --json` | `StopModel` |
| `cue_thaw(threadId)` | `cue thaw <thread> --json` | `GoModel` |

**CueModel Fields (from `models.ts`):**
```typescript
interface CueModel {
  screen: 'cue';
  now: number;
  thread: { name: string; status: string } | null;
  head: HeadModel | null;        // {at, by, line, fields, refs} — THE CONTEXT
  spotlight: { name: string; at: number } | null;
  warm: { name: string; at: number }[];
  also: { name: string; at: number }[];
  dormantCount: number;
  frozenCount: number;
  stale: boolean;
  announce: string | null;
  curtain: boolean;
}
```

### Stager Server (Exists at `apps/cue/src/stager/server.ts`)
- WebSocket server on localhost (port configurable)
- Subscribes to Cue director loop events
- Pushes real-time updates to Stager UI:
  - Thread status changes
  - Orchestration progress (step running, diff ready, check results)
  - Overnight brief results
- **Must be started by Cue** when `cue stager serve` runs (new command)

---

## 6. BREATHABLE UI PHILOSOPHY (Layer 1)

### Surface-Specific Adaptation

| Surface | Cognitive Mode | UI Behavior |
|---------|----------------|-------------|
| **TODAY** | Returning to flow | Calm, centered, single thread prominent. Pill = "Your Stage". No distractions. |
| **PROJECTS** | Surveying work | Catalog view, scannable, status glyphs. Pill = "Projects". Spatial memory via emblems. |
| **ORCHESTRATE** | Directing work | Form-focused, context chips visible (project, agent, workspace). Pill = "Orchestration". Intent-forward. |

### Adaptation Principles
1. **No surface has unused UI** — every element serves the surface's cognitive task
2. **Transitions are spatial** — pill navigation = muscle memory; scroll-snap = intentional
3. **State persists across surfaces** — project selection in Projects → pre-selected in Today
4. **Ambient persistence** — theme, reduced motion, window size survive restarts

### The "Pick Up the Thread" Moment
```
User opens Stager → 
  1. Welcome screen (first time only) → "Enter Stager"
  2. Today surface loads → 
     - If Cue connected: shows real thread head (line, refs, next action)
     - If not: "Connect this stage to Cue's local API"
  3. Zero clicks to resume — "Go" button or `cue go` in terminal
  4. Context is EXACT — same line, same refs, same next action
```

---

## 6. STRATEGIC POSITIONING

### Stager is the Primary Product
| Product | Role | Monetization |
|---------|------|--------------|
| **Stager** | **Primary** — Desktop workspace for Cue | Pro tier (advanced orchestration, team sync) |
| **Web** | Social/Community layer — verified proof, allies, rooms | Premium rooms, institution rooms |
| **Cue** | Local kernel — free, open source | Backstage (hosted sync), Runner VMs |
| **Backstage** | Infrastructure — hosted Cue + runners | Per-seat / usage |

### The Wedge
**Stager + Cue = "The only desktop that remembers your context exactly."**

- No other tool combines: freeze/thaw + AI orchestration + verified proof + social proof
- Web amplifies: your Stager work → verified portfolio → allies → employers
- Cue enables: local-first, privacy-preserving, extensible

---

## 7. MONETIZATION PHILOSOPHY: PRO TIER (Post-Signal)

### Free Tier (Forever)
- Three surfaces (Today/Projects/Orchestrate)
- Cue integration (local)
- Unlimited projects, threads, orchestrations
- Basic diff review

### Pro Tier (₹499/mo or $9/mo) — After 1000 DAU
| Feature | Philosophy Alignment |
|---------|---------------------|
| **Team Sync** | Shared project catalog, ally orchestration |
| **Advanced Orchestration** | Multi-step briefs, parallel agents, custom runners |
| **Backstage Included** | Hosted sync + runners (no self-host) |
| **Export/Import** | Portable context bundles |
| **Priority Support** | Direct line to team |

**Rule: No monetization until the "Pick up the thread" loop works flawlessly for 1000 daily users.**

---

## 8. GO-TO-MARKET: THE DEVELOPER WEDGE

### Target: Rust/Go/TypeScript Builders Who:
- Use terminal heavily (neovim, helix, VS Code)
- Track time with Hackatime/Wakatime
- Frustrated by context switching
- Curious about AI but distrust "autopilot"

### Launch Sequence
1. **Month 1-2:** Cue IPC complete → Stager shows real thread head
2. **Month 2:** 50 beta users (Hack Club, terminal enthusiasts) → "Pick up the thread" test
3. **Month 3:** Measure: Day-7 return, orchestration adoption, diff review usage
4. **Month 4:** If signal → Pro tier soft launch; Web integration (overnight brief → web posts)
5. **Month 6:** Team features; Backstage hosted offering

### Success Criteria (Beta)
| Metric | Threshold |
|--------|-----------|
| Day-7 return | ≥50% (higher than web — desktop = commitment) |
| `cue go` usage | ≥3x/day per user |
| Orchestration tasks | ≥1/week per user |
| Diff review approval rate | ≥80% |
| "Would recommend" | ≥9/10 |

---

## 9. QUESTIONS FOR ALIGNMENT

### Product Strategy
1. **Stager Server binary** — Bundle in Tauri or separate `cue stager serve` command?
2. **Orchestrate CLI** — `cue orchestrate` new command or `cue task create --brief`?
3. **Diff Review UI** — In Stager (Tauri webview) or terminal (TUI)?
4. **Window Management** — Single window (current) or detachable panels?

### Technical Decisions
5. **IPC Protocol** — JSON-RPC over stdio? Tauri `invoke` → CLI `--json`? WebSocket to Stager server?
6. **State Sync** — Stager polls Cue? Cue pushes via WS? Hybrid?
7. **Auth** — Cue handles auth; Stager trusts local Cue (no separate login)?
8. **Auto-Start** — `cue stager serve` on login? systemd/launchd service?

### Monetization Timing
9. **Pro Tier Features** — Which orchestration features are Pro vs. Free?
10. **Team Sync** — Requires Web ally system; when to build?

---

## 10. SUCCESS DEFINITION (The North Star)

> **In 6 months, Stager is the answer to: "How do I close my laptop at 6pm and open it at 9am tomorrow with exactly the same context — plus the work that happened while I slept?"**

**Measured by:**
- 1000+ developers opening Stager daily
- 500+ orchestrations/week (manual + overnight)
- 80%+ diff approval rate (trust in the loop)
- ₹5L+/mo Pro recurring (independent of Web)
- Zero "where was I?" moments reported

---

**This philosophy document is the contract. The implementation plan must trace every Tauri command, Svelte component, and Cue IPC call back to these principles. Any feature not serving "Pick up the thread" gets cut.**

---

**NEXT: Upon approval, I'll create `IMPLEMENTATION_stager.md` with:**
- Phase 1: Cue IPC Layer (Tauri commands → Cue CLI JSON)
- Phase 2: Real Data Surfaces (Today/Projects/Orchestrate from Cue)
- Phase 3: Stager Server + Real-Time Sync
- Phase 4: Orchestration Loop (Brief → Plan → Diff → Approve → Apply)
- Phase 5: Pro Tier + Team Features
- Every task mapped to Philosophy Layer
- Cue CLI JSON schema definitions
- Verification cycle per phase