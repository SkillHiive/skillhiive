# SkillHive Backstage — Philosophy Mindmap & Strategic Brief

**Project:** `backstage` (Bun + Postgres, HTTP API + Worker)
**Role:** **Remote Orchestration Service** — Night shift, sync API, and orchestration engine for Cue
**Status:** Working implementation in `cue/apps/backstage/` — needs extraction to standalone repo
**Architecture:** Separate workspace, independently deployable, optional (Cue works without it)

---

## 1. CORE PHILOSOPHY: WHY THIS EXISTS

### The Founding Insight
> **"Night shift does the heavy composition; day clock edits."** — Backstage is the *slow clock* that runs while you sleep, so the *fast clock* (Cue) stays instant.

Backstage is **not a dependency**. It's an **enhancement**. Cue Core + Stager work fully offline. Backstage only *enhances*:
- Model-refined save states (instead of deterministic only)
- Session distillation (extract intent from opencode chats)
- Cross-device sync (pull on wake, push on sleep)
- Heavy orchestration (OpenCode/Codex in isolated worktrees)
- Mobile push notifications
- Encrypted vault with lease-based unlock

### The Philosophy Stack (Bottom to Top)

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 5: TRUST ECONOMY                                         │
│  ├─ Hosted Backstage Personal/Pro/Team (recurring revenue)     │
│  ├─ Managed runners (microVMs) for heavy orchestration         │
│  ├─ Encrypted vault with lease-based unlock (privacy as product)│
│  └─ Legal compliance as moat (GDPR, CCPA, SOC2)                │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 4: ORCHESTRATION ENGINE                                  │
│  ├─ Task queue with OpenCode/Codex adapters                    │
│  ├─ Git worktree isolation + .cue.lock safety                  │
│  ├─ Review gate: diff → tests → risk score → approval          │
│  └─ No auto-merge, no auto-push, no auto-message               │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 3: NIGHT SHIFT                                           │
│  ├─ Refine save states (model rewrites context)                │
│  ├─ Distill sessions (extract intent from opencode)            │
│  ├─ Backfill (historical sessions)                             │
│  ├─ Nightly (03:00 daily: refresh active threads)              │
│  └─ Classify captures (route inbox → correct thread)           │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 2: SYNC & VAULT                                          │
│  ├─ Outbox pattern: local-first, async flush to Backstage      │
│  ├─ Cursor-based pull (saveStates, distills, captures)         │
│  ├─ AES-256 encrypted vault, envelope encryption               │
│  ├─ Lease-based unlock (default 3h night shift window)         │
│  └─ Envelope encryption + printed recovery key                 │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 1: INFRASTRUCTURE (THE FOUNDATION)                       │
│  ├─ Self-hosted: Docker + Tailscale sidecar, single volume     │
│  ├─ SQLite + vec0 (optional pgvector) for simpler deploy       │
│  ├─ Bearer token auth over tailnet (no public exposure)        │
│  ├─ Health endpoint for Cue doctor / Stager                    │
│  └─ Same binary as Cue: `cue backstage serve`                  │
└─────────────────────────────────────────────────────────────────┘
```

### The Golden Thread
**Every feature must answer: "Does this enhance Cue without becoming a dependency?"**

If yes → build it. If no → kill it.

---

## 2. USER ARCHETYPES & THEIR JOURNEYS

### Primary: The Solo Builder (Self-Hosted Backstage)
- **Pain:** Laptop can't run heavy models overnight; wants refined context on wake
- **Journey:**
  1. `cue init --tier self-host` → deploys Backstage on home server/Proxmox
  2. `cue stop "write tests for auth"` → laptop syncs outbox → sleeps
  3. Backstage (server) runs night shift: refines save states, distills sessions
  4. Morning: `cue go` → pulls refined save states → exact context + overnight insights
  5. Stager shows "While you were away: tests passed, diff ready"
  6. Orchestrates via Stager → Backstage runs OpenCode in isolated worktree

### Secondary: The Mobile Builder (Managed Backstage Future)
- **Pain:** Laptop asleep, wants mobile push when orchestration ready
- **Journey:**
  1. Signs up for Backstage Personal ($5/mo) → managed hosting
  2. `cue init --tier managed` → AES-256 vault, lease-based unlock
  3. Orchestrates via Stager mobile push → Backstage runs OpenCode in microVM
  4. Push notification: "Diff ready for review" → deep-links to Stager
  5. Reviews on phone → approves → Backstage merges

### Tertiary: The Team Lead (TeamOffice Integration)
- **Pain:** No visibility into deep work without interrupting
- **Journey:**
  1. Team pays for Backstage Team ($50/mo) → shared runners, admin dashboard
  2. TeamOffice (web) shows: "3 builders in spotlight, 2 orchestrating"
  3. Clicks builder → sees their Stager Today (with permission)
  4. Understands blockers: "auth refactor blocked on API keys"
  5. Helps by unblocking, not managing

---

## 3. FEATURE MAP: WHAT EXISTS vs. WHAT'S NEEDED

### ✅ FULLY BUILT & WORKING (Code Reality)

| Feature | Location | Status |
|---------|----------|--------|
| **Sync API** | `src/api.ts` | ✅ `/v1/health`, `/v1/push`, `/v1/pull` with device auth |
| **Push Protocol** | `src/sync.ts` | ✅ `applyPush` — full PushBody validation + atomic transaction |
| **Pull Protocol** | `src/sync.ts` | ✅ `pullRows` — cursor-based, idempotent, classified captures |
| **Job Queue** | `src/queue.ts` | ✅ `claimPostgresJob` with SKIP LOCKED, lane separation (local/nim/control) |
| **Worker Loop** | `src/worker.ts` | ✅ `runBackstageWorker` — processes refine/distill/classify jobs |
| **Refine Job** | `src/worker.ts:206` | ✅ `finishRefine` — fact-hash deduplication, deterministic base |
| **Distill Job** | `src/worker.ts:259` | ✅ `finishDistill` — extracts intent/conclusions from opencode |
| **Classify Job** | `src/worker.ts:279` | ✅ `finishClassify` — routes captures to threads |
| **Nightly Enqueue** | `src/queue.ts:51` | ✅ `enqueueNightRefines` — refreshes active threads nightly |
| **Backfill Distills** | `src/queue.ts:108` | ✅ `enqueueBackfillDistills` — processes historical sessions |
| **Control Jobs** | `src/queue.ts:37` | ✅ `enqueueControlJob` — nightly/backfill triggers |
| **Budget/Gate** | `src/worker.ts:80` | ✅ Token bucket + daily cap + lane busy detection |
| **Audit Logging** | `src/worker.ts:126` | ✅ `insertAudit` — full outbound log with SHA256 |
| **Config System** | `src/config.ts` | ✅ TOML parsing, tailnet IP enforcement, provider budgets |
| **Health Endpoint** | `src/api.ts:32` | ✅ `/v1/health` — DB, llama.cpp, queue status |
| **Docker Support** | `infra/` | ✅ Dockerfile, compose, systemd services |

### ⚠️ BUILT BUT NEEDS EXTRACTION/POLISH

| Gap | Impact | Fix Required |
|-----|--------|--------------|
| **Embedded in Cue repo** | Not independently deployable | Extract to standalone `backstage/` repo with own `package.json` |
| **No `/v1/vault` endpoints** | Encrypted vault + lease unlock missing | Implement `/v1/vault/unlock`, `/v1/vault/lock`, `/v1/vault/status` |
| **No orchestration job kinds** | Stager orchestration needs Backstage workers | Add `orchestrate-task`, `publish-post`, `notify-allies` job kinds |
| **No mobile push gateway** | Stager mobile needs FCM/APNs | Add FCM/APNs integration, device token registration |
| **No managed hosting infra** | Backstage Personal/Team requires managed deploy | Terraform/k8s for hosted offering |
| **No billing integration** | Monetization needs Stripe | Stripe webhook, subscription management, quota enforcement |
| **No Cue↔Stager API docs** | Stager integration blocked | OpenAPI spec for Cue local API + Backstage sync API |
| **No chaos testing** | Production hardening | Network kill, power loss, disk full test scripts |

### ❌ MISSING ENTIRELY (From Philosophy)

| Missing Feature | Philosophy Layer | Revenue Potential |
|-----------------|------------------|-------------------|
| **Backstage Personal ($5/mo)** | Layer 5 | $10k+/mo at 2000 users |
| **Backstage Pro ($20/mo)** | Layer 5 | $50k+/mo at 2500 users |
| **Managed runners (microVMs)** | Layer 4 | Usage-based, high margin |
| **Team shared runners** | Layer 5 | $50k+/mo at 100 teams |
| **Encrypted vault + lease unlock** | Layer 2 | Privacy as product differentiator |
| **Mobile push gateway** | Layer 5 | Stager mobile retention |

---

## 4. STRATEGIC POSITIONING: THE THREE-WORKSPACE TRUTH

### Current Reality
| Workspace | Role | Dependency |
|-----------|------|------------|
| **Cue Core** | Local orchestrator (CLI, SQLite, hooks) | **None** — works fully offline |
| **Stager** | Desktop workspace (Tauri + Svelte) | **Cue Core only** — Unix socket client |
| **Backstage** | Remote orchestration (sync, night shift, runners) | **Optional** — Cue + Stager work without it |

### The Verdict
**Backstage is the only optional pillar.** This is a feature, not a bug.

> **Rule**: Every feature in Cue Core has a working deterministic fallback. Backstage only *enhances*, never *enables*.

### Positioning Statement
> **Backstage is the night shift you hire so your day shift stays instant. Self-host free, managed from $5/mo. Your data, your hardware, your rules.**

---

## 5. MONETIZATION PHILOSOPHY: PAY FOR CONVENIENCE, NOT CAPABILITY

### The Revenue Ladder
| Tier | Price | Target | Includes |
|------|-------|--------|----------|
| **Self-Host** | Free | Developers with hardware | Full sync, night shift, local runners |
| **Personal** | $5/mo | Solo builders | Managed hosting, 1 microVM runner, vault |
| **Pro** | $20/mo | Power users | Unlimited runners, custom tiers, priority queue |
| **Team** | $50/mo | Orgs (5 seats) | Shared runners, admin dashboard, SSO |

### Revenue Projections (Conservative)
| Month | Self-Host | Personal | Pro | Team | MRR |
|-------|-----------|----------|-----|------|-----|
| 3 | 500 | 50 | 10 | 2 | $1,150 |
| 6 | 2000 | 500 | 50 | 10 | $12,500 |
| 12 | 5000 | 2000 | 200 | 50 | $72,500 |

**Rule: The kernel (Cue) stays free. You pay for infrastructure (hosted sync, runners), not capability.**

---

## 6. NIGHT SHIFT: THE HEART OF BACKSTAGE

### Job Types & Triggers
| Job | Purpose | Trigger |
|-----|---------|---------|
| `distill-session` | Extract intent/conclusions from opencode | New session detected |
| `refine-state` | Model rewrites save state with richer context | After checkpoint, nightly |
| `classify-capture` | Route inbox captures to correct thread | New capture |
| `backfill` | Process all historical opencode sessions | One-time, then incremental |
| `nightly` | Refresh states for active threads | 03:00 daily (configurable TZ) |

### Golden Rules (Non-Negotiable)
1. **Night shift leaves notes on the desk. It doesn't sign anything.** Never sends, merges, publishes, deletes, or messages without approval.
2. **Burnout Guard**: Night shift must hand you **fewer decisions than it found**. Call Sheet hard cap: 3 decisions max.
3. **Local-tier content never leaves your hardware** (or your model endpoint over tailnet).
4. **Night shift never uses paid providers**. Free providers only; `--spend` required for paid.

---

## 6. VAULT & SECURITY: PRIVACY AS PRODUCT

### Vault Design (AES-256 + Envelope Encryption)
- **At rest**: AES-256 encrypted SQLite volume
- **Key management**: Envelope encryption — wrapped data key per device
- **Lease-based unlock**: Default 3h night shift window (01:00-04:00), relock when queue empty
- **Hard max lease**: 8h (configurable). Indefinite = explicit opt-in with privacy risk prompt.
- **Recovery key**: Printed once, never stored digitally. Lost key = lost data.
- **Leak closure**: Encrypted swap, tmpfs for temp files, backup ciphertext only, key wipe on lease end.

### Hosted "Local Tier" Semantics
> *"Encrypted at rest with a key we never store. While unlocked, the running machine can read your data, and we do not access running instances."*

- Local-tier content **only refined on user's machine** or **user's model endpoint over tailnet**
- **Never on hosted Backstage** — even with vault unlocked
- Endpoint classification by network location (loopback/tailnet vs public)

---

## 7. GO-TO-MARKET: THE SELF-HOST WEDGE

### Target: Developers Who Self-Host
- Proxmox/homelab enthusiasts
- Tailscale users
- Privacy-conscious builders
- Already running Cue Core + Stager

### Launch Sequence
1. **Month 1:** Extract Backstage → standalone repo + Docker + Tailscale sidecar
2. **Month 2:** 50 self-host beta users (Proxmox/homelab) → "Night shift while you sleep"
3. **Month 3:** Measure: sync reliability, night shift quality, vault UX
4. **Month 4:** Backstage Personal launch ($5/mo) for managed hosting
5. **Month 6:** Team/Enterprise; managed runners; legal compliance

### Success Criteria (Beta)
| Metric | Threshold |
|--------|-----------|
| Sync success rate | ≥99.5% (push/pull) |
| Night shift quality | ≥90% "refined state useful" |
| Vault UX | ≤2 min setup, zero "lost key" reports |
| Self-host deploy | ≤10 min (Docker + Tailscale) |
| "Would recommend" | ≥9/10 |

---

## 8. QUESTIONS FOR ALIGNMENT

### Product Strategy
1. **Vault unlock UX** — CLI `cue vault unlock` vs API `/v1/vault/unlock` vs both?
2. **Lease duration** — 3h default (01:00-04:00) or configurable per user?
3. **Managed hosting timeline** — Personal launch Month 4 or wait for 1000 self-host users?
4. **Runner pricing** — Per-minute vs per-hour vs included in Pro/Team?

### Technical Decisions
5. **SQLite vs Postgres for Backstage** — Current: Postgres. SQLite+vec0 for simpler deploy?
6. **Vault volume encryption** — LUKS on host vs application-level AES-256?
7. **Tailscale sidecar** — Separate container vs baked into image?
8. **Orchestration job kinds** — Add `orchestrate-task`, `publish-post`, `notify-allies` now or Phase 3?

### Architecture
9. **Backstage as Cue subcommand** — `cue backstage serve` (same binary) or separate?
10. **Shared packages** — Git submodule vs npm workspace vs copy?
11. **Cue↔Stager API** — Define exact schemas now for Stager integration?

---

## 9. SUCCESS DEFINITION (The North Star)

> **In 6 months, Backstage is the answer to: "How do I get model-refined context + heavy orchestration + encrypted sync — without giving up my hardware, my privacy, or my wallet?"**

**Measured by:**
- 1000+ self-host deployments (Docker + Tailscale)
- 500+ Backstage Personal subscribers ($5/mo)
- 99.9% sync reliability (push/pull)
- 90%+ night shift quality rating
- Zero vault key loss incidents
- $10k+/mo recurring revenue

---

**This philosophy document is the contract. The implementation plan must trace every API endpoint, every job kind, every vault operation back to these principles. Any feature that makes Backstage a *dependency* instead of an *enhancement* gets cut.**

---

**NEXT: Upon your approval, I'll create `IMPLEMENTATION_backstage.md` with:**
- Phase 1: Repo extraction + Docker + Tailscale + CI/CD
- Phase 2: Vault API + Encrypted SQLite + Lease unlock
- Phase 3: Orchestration job kinds + OpenCode adapter
- Phase 4: Mobile push gateway + FCM/APNs
- Phase 5: Managed hosting infra + Billing + Personal launch
- Every task mapped to Philosophy Layer
- OpenAPI specs for Sync API + Vault API
- Verification cycle per phase