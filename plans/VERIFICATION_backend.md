# SkillHive Backend — End Goal & Verification Cycle

**Purpose:** This file defines the measurable end state and the verification loop that confirms the Backend implementation matches the philosophy. Any AI (or human) can use this to verify completion.

---

## END GOAL: What "Done" Looks Like

### The North Star Metric
> **In 6 months, Backend is the answer to: "I never think about it. It just works."**

### Quantitative Success Criteria (Non-Negotiable)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **`/getToken` p99 latency** | < 100ms | Prometheus histogram |
| **`/getToken` availability** | 99.99% | Uptime monitor |
| **Cron success rate** | > 99.9% | Successful syncs / total connections |
| **Cron duration** | < 15 min (5k connections) | Cron histogram |
| **Manual sync latency** | < 5s | Request duration histogram |
| **Error rate** | < 0.01% | HTTP 5xx / total requests |
| **Infrastructure cost** | < $50/mo at 10k users | Cloud billing |
| **Zero security incidents** | 0 | Incident log |

### Qualitative Success Criteria (The "Vibe Check")

| Criterion | How to Verify |
|-----------|---------------|
| **Invisible infrastructure** | Frontend/Cue developers never ask "how do I get a token?" |
| **Cron is silent on success** | Logs only show errors; success = no noise |
| **Rate limiting felt, not seen** | Legitimate users never hit 429; abusers do |
| **Cue sync "just works"** | Web team integrates `/v1/cue/push` in 1 hour |
| **Health check is trustworthy** | `/health` green = system works; red = actionable |
| **Logs are queryable** | `grep "requestId" logs` → full trace |
| **Deploy is boring** | `docker compose up -d` → green health check |

---

## VERIFICATION CYCLE: The Implementation Loop

### Cycle Definition
Every feature implementation must pass through this cycle before "done":

```
┌─────────────────────────────────────────────────────────────────┐
│  1. SPECIFY          → Map feature to Philosophy Layer (1-3)   │
│  2. IMPLEMENT        → Write code + tests + Docker             │
│  3. VERIFY (AUTO)    → Typecheck + Unit + Contract + Build    │
│  4. VERIFY (CONTRACT)→ OpenAPI schema + Rate limit behavior   │
│  5. VERIFY (LOAD)    → k6 / hey load test                     │
│  6. VERIFY (MANUAL)  → Dogfood: use in real workflow          │
│  7. VERIFY (METRIC)  → Does it move North Star metrics?       │
│  8. DECIDE           → Ship / Iterate / Kill                   │
└─────────────────────────────────────────────────────────────────┘
```

### Phase-Gate Verification (Per Implementation Plan Phase)

| Phase | Gate | Verification Method | Pass Criteria |
|-------|------|---------------------|---------------|
| **1: Hardening + Cue Proxy** | Deploy to staging | `hey -n 1000 -c 10 /getToken` → 0 429s for legit traffic | Rate limit works; Cue proxy returns 200; `/metrics` exposes data |
| **2: Sync Hardening** | Cron test | Run cron against 100 test connections | All succeed; duration < 5min; user timezone respected |
| **3: Deployment Hardening** | Fresh VM deploy | `docker compose up -d` → health green | Self-host works in < 5 min |
| **4: Observability** | Chaos test | Kill Backstage → Cue sync queues locally | Local outbox fills; recovers on Backstage return |

### Feature-Level Verification (Per Task)

Every task in the implementation plan must include:

```markdown
## Task: [Name]
**Philosophy Layer:** [1-3]
**Endpoint/Component:** [e.g., GET /getToken, Cron job]
**Verification:**
- [ ] Typecheck passes (`bun run typecheck`)
- [ ] Unit tests pass (`bun test`)
- [ ] Contract test: OpenAPI schema matches implementation
- [ ] Load test: `hey -n 1000 -c 10 <endpoint>` passes thresholds
- [ ] Manual test: [specific workflow]
- [ ] Metric impact: [which North Star metric this moves]
```

---

## AI VERIFICATION PROTOCOL

When an AI reviews this implementation, it must:

### 1. Trace Every Endpoint to Philosophy
```bash
# For each endpoint, the AI must answer:
grep -r "Philosophy Layer" IMPLEMENTATION_backend.md | grep "<endpoint>"
# If no mapping exists → FAIL
```

### 2. Verify Rate Limiting Behavior
```bash
# Test rate limiter
hey -n 50 -c 5 http://localhost:3000/getToken
# Must return 429 after 30 requests/minute
# Legitimate burst (10 req) should pass
```

### 3. Verify Contract Compliance
```bash
# OpenAPI schema matches implementation
cat docs/openapi.yaml | grep -A 20 "/getToken"
# Compare with server.js route handler
```

### 4. Verify Cron Behavior
```bash
# Test cron with mock connections
bun run test:cron --connections=10
# All must succeed; duration < 30s for 10 connections
```

### 4. Verify Rate Limiter Behavior
```bash
# Test rate limiter
hey -n 50 -c 5 http://localhost:3000/getToken
# Must return 429 after 30 requests/minute
```

### 5. Verify Cue Proxy Contract
```bash
# Test Cue proxy
curl -X POST http://localhost:3000/v1/cue/push \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"test","threads":[],"threadKeys":[],"events":[],"captures":[],"ops":[],"saveStates":[],"sessions":[],"excerpts":[],"jobs":[]}'
# Must return 200 or 202 (queued)
```

### 6. Verify Health Check
```bash
curl http://localhost:3000/health
# Must return 200 with {ok: true, dependencies: {...}}
```

### 7. Verify Metrics Endpoint
```bash
curl http://localhost:3000/metrics
# Must return Prometheus format with http_requests_total, etc.
```

### 8. Verify Structured Logging
```bash
# Check log format
grep "requestId" logs/backend.log | head -1
# Must be valid JSON with level, message, timestamp, requestId
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
      - diff generated.yaml docs/openapi.yaml
  
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
# 1. Docker image built + pushed (linux/amd64, linux/arm64)
# 2. Self-host test: Fresh VM → docker compose up → health green
# 3. Cue sync test: `cue sync push/pull` against deployed Backstage
# 4. Load test: 1000 req/s on /getToken for 60s
# 5. Cron test: 1000 mock connections
# 6. Chaos test: Network partition → outbox flushes
# 7. Security scan: bun audit, dependency check, SBOM
```

---

## KILL CRITERIA (When to Stop)

| Signal | Action |
|--------|--------|
| `/getToken` p99 > 200ms | **Optimize: profile, cache, scale** |
| Cron success rate < 99.5% | **Investigate: Wakatime API, timeouts, concurrency** |
| Rate limiter false positives > 1% | **Tune: increase limits, add allowlist** |
| Docker image > 100MB | **Optimize: distroless, strip deps** |
| Health check false negatives | **Fix: improve dependency checks** |
| Log volume > 1GB/day | **Optimize: sampling, structured logging** |
| Infrastructure cost > $100/mo at 10k users | **Optimize: right-size containers** |

---

## SUCCESS DEFINITION (The Only Thing That Matters)

> **A developer calls `/getToken` and gets a valid LiveKit JWT in < 50ms. The cron runs at 3 AM their time, syncs 5000 Wakatime connections in 8 minutes, and they never check the logs because everything is green. When Backstage goes down for maintenance, Cue sync queues locally and flushes automatically when it returns. The backend is infrastructure they never think about.**

**If this loop works for 10,000 developers, the philosophy is validated. Everything else is noise.**

---

## USAGE FOR AI REVIEWERS

```bash
# To verify this project:
1. Read PHILOSOPHY_backend.md → understand the contract
2. Read IMPLEMENTATION_backend.md → understand the plan
3. Read this file → understand the verification standard
4. Audit: Does every endpoint trace to a Philosophy Layer?
5. Audit: Does every endpoint have rate limiting + metrics?
5. Audit: Does cron handle 5000 connections in < 15 min?
6. Audit: Does health check actually verify dependencies?
7. Audit: Are kill criteria respected?
8. Report: PASS / FAIL with specific gaps
```

**This file is the contract. If the implementation doesn't satisfy this verification cycle, it's not done.**