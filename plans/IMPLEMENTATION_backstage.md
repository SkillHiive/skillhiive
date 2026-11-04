# SkillHive Backstage — Implementation Plan

**Project:** `backstage` (Bun + Postgres, HTTP API + Worker)
**Role:** Remote Orchestration Service — Night shift, sync API, orchestration engine
**Strategy:** Extract from Cue repo → Standalone → Self-host → Managed hosting
**Constraint:** Optional dependency (Cue works without it); Self-host first, managed later

---

## PHASE 1: REPO EXTRACTION + DOCKER + CI/CD (Week 1) — "Standalone & Deployable"

*Backstage currently lives in `cue/apps/backstage/`. Must extract to independent workspace.*

### 1.1 Repository Extraction (2 hrs)
**Files:** New `backstage/` repo root with own `package.json`, `tsconfig.json`, `bunfig.toml`
**Structure:**
```
backstage/
├── package.json              # Bun workspace root (apps/backstage only)
├── tsconfig.json
├── bunfig.toml
├── docker/
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── config.example.toml
│   └── README.md
├── apps/backstage/           # Moved from cue/apps/backstage/
│   ├── src/
│   │   ├── main.ts
│   │   ├── api.ts
│   │   ├── sync.ts
│   │   ├── sync-schema.ts
│   │   ├── queue.ts
│   │   ├── worker.ts
│   │   ├── config.ts
│   │   └── *.test.ts
│   ├── package.json
│   └── tsconfig.json
├── infra/
│   ├── backstage.service
│   ├── backstage-nightly.timer
│   └── deploy-backstage.sh
├── .github/workflows/
│   ├── build.yml
│   ├── verify.yml
│   └── self-host-test.yml
├── docs/
│   ├── openapi.yaml          # Generated from code
│   ├── DEPLOY.md
│   └── VAULT.md
└── README.md
```

**Migration Steps:**
1. Create new `backstage/` directory
2. Copy `cue/apps/backstage/` → `backstage/apps/backstage/`
3. Create root `package.json` with workspace: `["apps/backstage"]`
4. Update imports: `@prompter/*` → `../../packages/*` (or npm link)
5. Verify `bun test` passes in new location

**Philosophy Layer:** 1 (Infrastructure) — Independent deployability
**Risk:** Medium. Import paths, shared packages, test fixtures.

### 1.2 Docker + Tailscale Sidecar (4 hrs)
**Files:** `docker/Dockerfile`, `docker/docker-compose.yml`, `docker/config.example.toml`
**Dockerfile:**
```dockerfile
FROM oven/bun:1.1-alpine
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY apps/backstage/src ./src
COPY apps/backstage/package.json ./package.json
RUN bun run build
EXPOSE 7420
CMD ["bun", "run", "src/main.ts", "serve"]
```

**docker-compose.yml:**
```yaml
services:
  backstage:
    build: .
    ports: ["7420:7420"]
    environment:
      - DATABASE_URL=postgres://postgres:password@db:5432/backstage
      - NIM_API_KEY=${NIM_API_KEY}
      - BACKSTAGE_TOKEN=${BACKSTAGE_TOKEN}
    volumes:
      - backstage-data:/data
    depends_on: [db]
    restart: unless-stopped

  db:
    image: pgvector/pgvector:pg16
    environment:
      - POSTGRES_DB=backstage
      - POSTGRES_PASSWORD=password
    volumes:
      - pgdata:/var/lib/postgresql/data
    restart: unless-stopped

  tailscale:
    image: tailscale/tailscale:latest
    environment:
      - TS_AUTHKEY=${TS_AUTHKEY}
      - TS_HOSTNAME=backstage
    volumes:
      - tailscale-state:/var/lib/tailscale
    cap_add: [NET_ADMIN, SYS_MODULE]
    devices: [/dev/net/tun]
    restart: unless-stopped

volumes:
  backstage-data:
  pgdata:
  tailscale-state:
```

**Philosophy Layer:** 1 (Infrastructure) — Self-host simplicity
**Risk:** Medium. Tailscale sidecar networking, Postgres init.

### 1.3 CI/CD Pipeline (3 hrs)
**Files:** `.github/workflows/build.yml`, `verify.yml`, `self-host-test.yml`
**Build Workflow:**
```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install --frozen-lockfile
      - run: bun run typecheck
      - run: bun test
      - run: docker build -t backstage:test -f docker/Dockerfile .
      - run: docker run --rm backstage:test --version
```

**Verify Workflow:**
```yaml
jobs:
  contract-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install --frozen-lockfile
      - run: bun run build
      - run: bun run generate-openapi
      - run: diff generated.yaml docs/openapi.yaml
  
  canary-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install --frozen-lockfile
      - run: bun test --filter=canary
```

**Self-Host Test Workflow (Critical):**
```yaml
jobs:
  self-host-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Start Backstage
        run: |
          docker compose -f docker/docker-compose.yml up -d
          sleep 10
      - name: Health Check
        run: |
          curl -f http://localhost:7420/v1/health
      - name: Cue Doctor Integration
        run: |
          # Install Cue, configure Backstage URL, run doctor
          curl -fsSL cue.skillhiive.com/install.sh | bash
          echo "backstage_url = 'http://localhost:7420'" >> ~/.config/cue/config.toml
          cue doctor --check-backstage
```

**Philosophy Layer:** 1 (Infrastructure) — Self-host verification in CI
**Risk:** Medium. GitHub Actions runner resources, Tailscale in CI.

### 1.4 Config & Secrets Management (2 hrs)
**Files:** `docker/config.example.toml`, `apps/backstage/src/config.ts` (enhance)
**Config Schema (TOML):**
```toml
[api]
listen = "100.64.0.1:7420"  # Tailnet IP enforced

[db]
url = "postgres://postgres:password@db:5432/backstage"

[llama]
base_url = "http://127.0.0.1:8081/v1"  # Loopback only

[providers.nim]
base_url = "https://integrate.api.nvidia.com/v1"
model = ["gpt-oss-20b"]
cost = "free"
rpm = 30
timeout_ms = 60000
max_requests_per_day = 2000

[providers.local]
model = "local"
cost = "free"
rpm = 1
timeout_ms = 120000

day_tz = "UTC"
```

**Secrets (env vars):**
- `DATABASE_URL` — Postgres connection
- `NIM_API_KEY` — NVIDIA NIM key
- `BACKSTAGE_TOKEN` — Bearer token for device auth (SHA256 stored)
- `TS_AUTHKEY` — Tailscale auth key

**Philosophy Layer:** 1 (Infrastructure) — Tailnet-only, loopback LLM
**Risk:** Low. Standard config.

---

## PHASE 2: VAULT API + ENCRYPTED STORAGE + LEASE UNLOCK (Week 2) — "Privacy as Product"

### 2.1 Vault Database Schema (3 hrs)
**Files:** `apps/backstage/src/vault.ts` (new), `apps/backstage/src/vault.test.ts`, Postgres migration
**Tables:**
```sql
-- Encrypted vault storage (AES-256-GCM)
CREATE TABLE vault_data (
  key TEXT PRIMARY KEY,
  ciphertext BYTEA NOT NULL,
  nonce BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lease management
CREATE TABLE vault_leases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('night_shift', 'manual', 'orchestration')),
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  data_key_wrapped BYTEA NOT NULL,  -- AES key wrapped with device key
  revoked_at TIMESTAMPTZ,
  UNIQUE (device_id, purpose)
);

-- Device keys (envelope encryption)
CREATE TABLE vault_devices (
  device_id TEXT PRIMARY KEY,
  device_name TEXT,
  public_key BYTEA NOT NULL,  -- Device's public key for key wrapping
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);
```

**Philosophy Layer:** 2 (Sync & Vault) — Encrypted at rest, envelope encryption
**Risk:** Medium. Crypto implementation, key rotation.

### 2.2 Vault API Endpoints (4 hrs)
**Files:** `apps/backstage/src/api.ts` (add routes), `apps/backstage/src/vault.ts`
**Endpoints:**
| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/v1/vault/unlock` | Request lease → returns wrapped data key |
| `POST` | `/v1/vault/lock` | Revoke lease early → wipes key |
| `GET` | `/v1/vault/status` | Lease status, expiry, device info |
| `POST` | `/v1/vault/device/register` | Register device public key |
| `POST` | `/v1/vault/device/revoke` | Revoke device (from another device) |

**Unlock Request:**
```json
POST /v1/vault/unlock
{
  "device_id": "macbook-pro-1",
  "purpose": "night_shift",
  "duration_hours": 3
}
```

**Unlock Response:**
```json
{
  "lease_id": "uuid",
  "wrapped_data_key": "base64...",  // AES-256 key wrapped with device public key
  "expires_at": "2026-10-18T04:00:00Z",
  "vault_url": "postgres://..."  // Connection string for unlocked vault
}
```

**Lease Expiry Job (Cron):**
- Runs every 5 min via `cue tick` equivalent
- Finds expired leases → wipes `data_key_wrapped` → marks revoked
- Logs audit entry

**Philosophy Layer:** 2 (Sync & Vault) — Lease-based unlock, key wipe on expiry
**Risk:** High. Crypto, key management, lease expiry reliability.

### 2.3 Vault Integration with Night Shift (3 hrs)
**Files:** `apps/backstage/src/worker.ts` (modify), `apps/backstage/src/vault.ts`
**Integration:**
1. Worker starts → requests `night_shift` lease via internal API
2. Uses unwrapped data key to decrypt vault for job processing
3. On lease expiry → key wiped from memory, vault relocks
4. Hard max lease: 8h (configurable). Indefinite = explicit opt-in.

**Philosophy Layer:** 3 (Night Shift) — Vault unlock only for night shift window
**Risk:** Medium. Key in memory, lease expiry coordination.

### 2.4 Vault Canary Tests (2 hrs)
**Files:** `apps/backstage/src/vault.canary.test.ts`
**Tests:**
```typescript
// Local-tier leak test
test('local-tier content never in outbound payload', async () => {
  const canary = 'LOCAL_TIER_CANARY_' + crypto.randomUUID()
  await storeLocalTierContent(canary)
  const payload = await prepareOutboundPayload()
  expect(payload).not.toContain(canary)
})

// Vault leak test
test('vault key wiped on lease expiry', async () => {
  const lease = await unlockVault('night_shift', 1) // 1 hour
  await advanceTime(2_hours)
  await runLeaseExpiryJob()
  const key = await getWrappedKey(lease.id)
  expect(key).toBeNull() // Wiped!
})

// Recovery key test
test('printed recovery key restores vault', async () => {
  const recoveryKey = generateRecoveryKey()
  await corruptVault()
  await restoreWithRecoveryKey(recoveryKey)
  expect(vaultAccessible()).toBe(true)
})
```

**Philosophy Layer:** 2 (Sync & Vault) — Privacy enforced in code, not prompts
**Risk:** Low. Test infrastructure.

---

## PHASE 3: ORCHESTRATION JOB KINDS + OPENCODE ADAPTER (Week 3) — "Heavy Lifting Remote"

### 3.1 New Job Kinds for Orchestration (4 hrs)
**Files:** `apps/backstage/src/queue.ts`, `apps/backstage/src/worker.ts`, `apps/backstage/src/orchestration.ts` (new)
**New Job Kinds:**
| Kind | Purpose | Payload |
|------|---------|---------|
| `orchestrate-task` | Run OpenCode/Codex in worktree | `{taskId, brief, projectThreadId, agent, worktreePath}` |
| `publish-post` | Write to SkillHive web (posts, project updates) | `{projectId, type, body, visibility}` |
| `notify-allies` | Push to ally feeds | `{captureId, threadId, allyUserIds}` |
| `review-diff` | Prepare diff for Stager review | `{taskId, worktreePath, baseCommit}` |

**Queue Lane:** New `orchestration` lane (separate from local/nim/control)
- Dedicated worker pool for orchestration
- Higher priority than night shift
- Budget: separate token bucket

**Philosophy Layer:** 4 (Orchestration Engine) — Heavy lifting remote
**Risk:** High. OpenCode integration, worktree management.

### 3.2 OpenCode Adapter for Backstage (6 hrs)
**Files:** `apps/backstage/src/orchestration/opencode.ts` (new), `apps/backstage/src/orchestration/worktree.ts` (new)
**Adapter Responsibilities:**
1. **Worktree Creation**: `git worktree add ../project-task-123 -b task/123`
2. **Lock File**: Write `.cue.lock` in project root with task metadata
3. **OpenCode Execution**: Spawn OpenCode in worktree with brief + context
3. **Progress Streaming**: Emit events → Backstage job updates → Stager WS
4. **Diff Generation**: `git diff main..task/123` → structured diff
5. **Check Execution**: Run project tests → parse results
6. **Cleanup**: On approval → merge; on rejection → discard worktree

**OpenCode Spawn:**
```typescript
const opencode = spawn('opencode', ['run', '--brief', brief, '--model', model], {
  cwd: worktreePath,
  env: { ...process.env, OPencode_API_KEY: apiKey },
  stdio: ['pipe', 'pipe', 'pipe']
})
```

**Progress Events:**
```typescript
// Emitted to job payload for Stager polling
{ type: 'step_start', step: 3, action: 'writing tests' }
{ type: 'check_result', step: 3, passed: true, output: '...' }
{ type: 'diff_ready', files: ['src/auth.ts', 'tests/auth.test.ts'] }
```

**Philosophy Layer:** 4 (Orchestration Engine) — You direct, agents execute
**Risk:** High. OpenCode CLI stability, worktree cleanup, diff parsing.

### 3.3 Orchestration Review Gate (4 hrs)
**Files:** `apps/backstage/src/orchestration/review.ts` (new)
**Review Flow:**
1. Job completes → status `diff_ready` → emits `diff_ready` event
2. Stager polls → shows diff in Orchestrate surface
3. User clicks "Approve" → Stager calls `cue approve <taskId>` → Backstage `approve` job
4. Backstage merges worktree → pushes branch → cleans up worktree → removes `.cue.lock`
5. Emits `task_completed` → Stager shows "Merged!"

**Approval Job:**
```typescript
// Payload from Stager approve
{ taskId, action: 'approve' | 'request_changes', comments: string }
```

**Philosophy Layer:** 5 (Trust Economy) — Diffs before decisions, approval before publishing
**Risk:** Medium. Git merge conflicts, worktree cleanup.

---

## PHASE 4: MOBILE PUSH GATEWAY (Week 4) — "Stager in Your Pocket"

### 4.1 FCM/APNs Integration (4 hrs)
**Files:** `apps/backstage/src/push.ts` (new), `apps/backstage/src/push.test.ts`
**Providers:**
- **FCM (Android)**: `firebase-admin` SDK
- **APNs (iOS)**: `apn` package with `.p8` key

**Device Registration:**
```typescript
// Called by Stager via Cue API → Backstage
POST /v1/push/device/register
{
  "device_token": "fcm_token_or_apns_token",
  "platform": "android" | "ios",
  "user_id": "uuid"
}
```

**Push Trigger Events:**
| Event | Payload | Deep Link |
|-------|---------|-----------|
| `task_completed` | `{taskId, projectId, summary}` | `stager://task/{taskId}` |
| `approval_needed` | `{taskId, projectId, diffUrl}` | `stager://review/{taskId}` |
| `error` | `{taskId, error, action}` | `stager://task/{taskId}` |
| `overnight_brief` | `{count, summary}` | `stager://today` |

**Philosophy Layer:** 5 (Orchestration Ecosystem) — Stager in your pocket
**Risk:** Medium. FCM/APNs cert management, token rotation.

### 4.2 Push Preferences & Quiet Hours (2 hrs)
**Files:** `apps/backstage/src/push.ts` (enhance), user preferences table
**Preferences:**
- Quiet hours (e.g., 22:00-07:00 local TZ)
- Event types to notify
- Per-project opt-out

**Philosophy Layer:** 1 (Atmosphere) — Respectful notifications
**Risk:** Low. Standard prefs.

---

## PHASE 5: MANAGED HOSTING + BILLING + PERSONAL LAUNCH (Month 2) — "Revenue"

### 5.1 Managed Hosting Infrastructure (8 hrs)
**Files:** `infra/terraform/` (new), `infra/k8s/` (new), `apps/backstage/src/provisioning.ts` (new)
**Architecture:**
- **Control Plane**: Kubernetes (managed GKE/EKS or self-managed k3s)
- **Data Plane**: Per-tenant Backstage pods + shared Postgres + shared Vault
- **Networking**: Tailscale subnet router for tailnet access
- **Storage**: Per-tenant encrypted volumes (CSI driver)

**Provisioning Flow:**
1. User signs up → Stripe checkout → webhook triggers provisioning
2. Create namespace + Postgres schema + Vault volume
3. Deploy Backstage pod with tenant config
4. Register Tailscale auth key for tenant
5. Return connection info to user (`backstage_url`, `token`)

**Philosophy Layer:** 5 (Trust Economy) — Pay for convenience, not capability
**Risk:** High. Multi-tenancy, k8s complexity, cost management.

### 5.2 Billing + Stripe Integration (4 hrs)
**Files:** `apps/backstage/src/billing.ts` (new), `apps/backstage/src/stripe-webhook.ts` (new)
**Plans:**
| Plan | Price | Quota |
|------|-------|-------|
| Personal | $5/mo | 1 microVM runner, 10GB vault |
| Pro | $20/mo | Unlimited runners, 100GB vault |
| Team | $50/mo | 5 seats, shared runners, admin |

**Stripe Webhooks:**
- `customer.subscription.created` → provision tenant
- `customer.subscription.updated` → update quota
- `customer.subscription.deleted` → grace period → deprovision
- `invoice.payment_failed` → notify → retry → suspend

**Philosophy Layer:** 5 (Trust Economy) — Pay for infrastructure, not capability
**Risk:** Medium. Stripe integration, proration, grace periods.

### 5.3 Admin Dashboard (3 hrs)
**Files:** `apps/backstage/src/admin.ts` (new), simple HTML/JS or React
**Features:**
- Tenant list, status, usage
- Runner utilization, costs
- Vault lease audit log
- Manual tenant operations (suspend, extend, migrate)

**Philosophy Layer:** 5 (Trust Economy) — Operational visibility
**Risk:** Low. Internal tool.

---

## TECHNICAL DEBT: ACCEPTED (Not Blocking)

| Item | Reason | Revisit |
|------|--------|---------|
| Postgres only (no SQLite+vec0) | Simpler for now | Month 2 |
| Single-region deployment | Cost control | Month 6 |
| No auto-failover for Backstage | Simplicity | Month 4 |
| Manual Tailscale authkey rotation | Low frequency | Month 3 |
| No Prometheus/Grafana yet | Logging sufficient for now | Month 2 |

---

## RISK MITIGATION

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Vault key wipe fails on expiry | Medium | Critical | Idempotent wipe job; audit log; alert on failure |
| OpenCode CLI breaks in worktree | High | High | Version pin; health check; fallback to local runner |
| Tailscale authkey expires | Medium | High | `cue doctor` alerts; auto-renew script |
| Multi-tenant cost overrun | Low | High | Per-tenant resource quotas; billing alerts |
| FCM/APNs token invalidation | Medium | Medium | Automatic re-registration; silent push test |
| Orchestration diff too large | Medium | High | Streaming diff; "View in editor" fallback |
| Postgres connection exhaustion | Low | High | PgBouncer; connection pooling |

---

## DEPENDENCIES ON OTHER REPOS

| Repo | What Backstage Provides | When |
|------|-------------------------|------|
| **Cue Core** | Sync API (`/v1/push`, `/v1/pull`), Vault API, Orchestration jobs | **Phase 1-2** |
| **Stager** | Orchestration events (WS), Push notifications, Diff review data | Phase 3-4 |
| **Web** | Overnight brief → posts, Project updates, Ally signals | Phase 5 |
| **Teams** | Shared runners, Team vault, Admin dashboard | Month 3 |

---

## DEFINITION OF DONE (Per Phase)

| Phase | Done When |
|-------|-----------|
| 1 | Standalone repo; Docker + Tailscale; CI/CD green; `cue doctor --check-backstage` passes |
| 2 | Vault unlock/lock/status works; lease expiry wipes key; canary tests pass |
| 3 | Stager brief → OpenCode in worktree → diff → approve → merge works E2E |
| 4 | FCM/APNs push delivered; deep-link opens Stager; quiet hours respected |
| 5 | Stripe checkout → provisioned tenant → `cue init --tier managed` works |

---

## QUESTIONS RESOLVED (From Your Calls)

| # | Question | Decision |
|---|----------|----------|
| 1 | Vault unlock UX | `cue vault unlock` CLI + API; lease 3h default (01:00-04:00) |
| 2 | Lease duration | 3h default, configurable up to 8h max |
| 3 | Managed hosting timeline | Personal launch Month 4 (after 1000 self-host) |
| 4 | Runner pricing | Included in Pro/Team; usage-based for Personal |
| 5 | SQLite vs Postgres | Postgres for now; SQLite+vec0 Month 2 |
| 6 | Orchestration job kinds | Add `orchestrate-task`, `publish-post`, `notify-allies` Phase 3 |
| 7 | Mobile push | FCM/APNs Phase 4; device token via Cue API |
| 8 | Backstage binary | Same `cue` binary: `cue backstage serve` |

---

## NEXT STEPS

1. **You approve this plan** → I create task breakdown with file-level details
2. **Week 1 sprint** → Phase 1: Repo extraction, Docker, CI/CD, self-host test
3. **Daily sync** → Blockers, decisions, progress
4. **Phase 2 kickoff** → Only after Phase 1 self-host test passes

**Ready to proceed with Phase 1 task breakdown?**