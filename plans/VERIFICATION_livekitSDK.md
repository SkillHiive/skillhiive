# SkillHive LiveKitSDK — End Goal & Verification Cycle

**Purpose:** This file defines the measurable end state and the verification loop that confirms the LiveKitSDK implementation matches the philosophy. Any AI (or human) can use this to verify completion.

---

## END GOAL: What "Done" Looks Like

### The North Star Metric
> **In 6 months, LiveKitSDK is the answer to: "How do I deploy a production LiveKit server for my app in 5 minutes?"**

### Quantitative Success Criteria (Non-Negotiable)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Deploy time (fresh VM)** | < 5 min | `docker compose up -d` → health green |
| **Config drift** | 0 | `livekit.yaml` in repo = deployed |
| **Room join success rate** | > 99.9% | LiveKit logs |
| **Simulcast adoption** | > 90% mobile | Client SDK stats |
| **TURN success rate** | > 95% | ICE candidate stats |
| **Uptime** | > 99.9% | Health check |
| **Resource usage** | CPU < 70%, RAM < 80% | Container metrics |
| **Zero config drift** | 0 manual changes | GitOps compliance |

### Qualitative Success Criteria (The "Vibe Check")

| Criterion | How to Verify |
|-----------|---------------|
| **5-minute deploy** | Fresh VM → `docker compose up -d` → `curl /health` = 200 |
| **Zero public exposure** | `nmap -p 7880 PUBLIC_IP` → filtered |
| **Simulcast works** | Mobile WiFi→LTE → bitrate adapts, no reconnect |
| **TURN works** | Corporate WiFi → room joins, video flows |
| **Room cap enforced** | 13th join → rejected at SFU |
| **Config = deployed** | `diff livekit.yaml <(docker exec livekit cat /etc/livekit.yaml)` → empty |
| **Logs are queryable** | `grep "room_started" logs` → valid JSON |

---

## VERIFICATION CYCLE: The Implementation Loop

### Cycle Definition
Every config change must pass through this cycle before "done":

```
┌─────────────────────────────────────────────────────────────────┐
│  1. SPECIFY          → Map config key to client feature        │
│  2. IMPLEMENT        → Edit livekit.yaml + docker-compose.yml  │
│  3. VERIFY (AUTO)    → Config validation + Docker build        │
│  4. VERIFY (CONTRACT)→ LiveKit schema validation               │
│  5. VERIFY (INTEGRATION) → Web + Mobile room join test        │
│  6. VERIFY (LOAD)    → k6 load test (100 concurrent)          │
│  7. VERIFY (CHAOS)   → Kill node → failover test               │
│  8. DECIDE           → Ship / Iterate / Kill                   │
└─────────────────────────────────────────────────────────────────┘
```

### Phase-Gate Verification (Per Implementation Plan Phase)

| Phase | Gate | Verification Method | Pass Criteria |
|-------|------|---------------------|---------------|
| **1: Config Hardening** | Staging deploy | 13th join rejected; simulcast bitrate adapts; TURN connects | All 4 client features work |
| **2: Observability** | Staging test | Prometheus metrics exposed; webhook received; JSON logs valid | Full observability stack works |
| **3: Scale Hardening** | Load test | 100 concurrent rooms; Redis failover < 5s; LB distributes | Production-ready at scale |
| **4: Advanced** | Feature test | Recording → S3; Ingest from OBS; Analytics JSON written | Advanced features work |

### Config-Level Verification (Per Key)

Every config change must include:

```markdown
## Config Change: [key.path]
**Philosophy Layer:** [1-5]
**Client Feature Enabled:** [e.g., "Mobile bandwidth adaptation"]
**Verification:**
- [ ] `livekit --config-check` passes
- [ ] `docker compose build` succeeds
- [ ] Staging deploy: `docker compose up -d` → health green
- [ ] Integration test: Web + Mobile room join → video flows
- [ ] Feature test: [specific client behavior]
- [ ] Metric impact: [which North Star metric this moves]
```

---

## AI VERIFICATION PROTOCOL

When an AI reviews this implementation, it must:

### 1. Trace Every YAML Key to Client Feature
```bash
# For each config key, the AI must answer:
grep -r "Philosophy Layer" IMPLEMENTATION_livekitSDK.md | grep "<key>"
# If no mapping exists → FAIL
```

### 2. Verify Config Validity
```bash
# LiveKit config validation
livekit --config-check --config livekit.yaml
# Must pass with zero errors
```

### 3. Verify Docker Compose Validity
```bash
# Compose validation
docker compose config -q
# Must pass with zero errors
```

### 4. Verify Client Feature Enablement
```bash
# For each config change, test the client feature it enables:
# max_participants: 13th join → rejected
# simulcast: WiFi→LTE → bitrate adapts, no reconnect
# TURN: Corporate WiFi → connects
# codecs: VP8/VP9 preferred over H264
# Prometheus: :9090/metrics exposes LiveKit metrics
# Webhook: Room start → Backstage receives event
# JSON logs: docker logs → valid JSON
# Health: :7881/health returns 200
# Resource limits: docker stats within limits
# Redis failover: Kill master → < 5s failover
# LB: HAProxy config matches requirements
# Egress: Recording → MP4 in S3
# Ingress: OBS stream → appears in room
```

### 5. Verify Config Drift Prevention
```bash
# GitOps compliance
git diff HEAD livekit.yaml | grep -v "^-.*SECRET\|^-.*PASSWORD"
# Any non-secret changes must be in git
```

### 6. Verify Tailscale-Only Binding
```bash
# Verify no public exposure
nmap -p 7880,7881,9090 PUBLIC_IP
# All ports must show "filtered" or "closed"
```

---

## CONTINUOUS VERIFICATION (CI/CD)

### Required Checks on Every PR
```yaml
# .github/workflows/verify.yml
jobs:
  config-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Validate LiveKit config
        run: |
          docker run --rm -v $(pwd):/config livekit/livekit-server:latest \
            livekit --config-check --config /config/livekit.yaml
  
  compose-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Validate Docker Compose
        run: docker compose config -q
  
  schema-check:
    runs-on: ubuntu-latest
    steps:
      - name: Validate YAML schema
        run: |
          # Custom schema validation if needed
          yamllint livekit.yaml
  
  philosophy-trace:
    runs-on: ubuntu-latest
    steps: [grep -r 'Philosophy Layer' changed-files]
```

### Required Checks on Every Release
```bash
# Release verification script
./scripts/verify-release.sh v0.2.0
# Runs:
# 1. Docker image built (multi-arch: linux/amd64, linux/arm64)
# 2. Config validation passes
# 3. Staging deploy: Fresh VM → docker compose up -d → health green
# 4. Client test: Web + Mobile room join → video + audio + screen share
# 5. Feature test: 13th join rejected; simulcast adapts; TURN works
# 6. Observability test: Metrics, webhooks, logs, health all work
# 7. Chaos test: Network partition → reconnect; Node kill → failover
# 7. Security scan: nmap, dependency check, SBOM
```

---

## KILL CRITERIA (When to Stop)

| Signal | Action |
|--------|--------|
| Config validation fails | **Fix config; don't deploy** |
| Health check fails post-deploy | **Rollback; investigate** |
| Simulcast causes reconnects | **Disable; debug client SDK** |
| TURN increases join latency > 2s | **Optimize TURN; add more servers** |
| Redis failover > 10s | **Tune sentinel; add more sentinels** |
| Config drift detected | **Block deploy; enforce GitOps** |
| Public port exposure | **Immediate rollback; audit firewall** |
| Resource limits exceeded | **Right-size containers; add nodes** |

---

## SUCCESS DEFINITION (The Only Thing That Matters)

> **A developer runs `docker compose up -d` on a fresh VM, waits 30 seconds, and their Web + Mobile apps can join rooms with video, audio, screen share — adaptive bitrate, NAT traversal, room limits enforced — without touching a single LiveKit config file.**

**If this works on a $5/mo VPS behind Tailscale, the philosophy is validated. Everything else is noise.**

---

## USAGE FOR AI REVIEWERS

```bash
# To verify this project:
1. Read PHILOSOPHY_livekitSDK.md → understand the contract
2. Read IMPLEMENTATION_livekitSDK.md → understand the plan
3. Read this file → understand the verification standard
4. Audit: Does every YAML key trace to a Web/Mobile feature?
5. Audit: Does `livekit --config-check` pass?
5. Audit: Does `docker compose config -q` pass?
6. Audit: Does staging deploy pass all integration tests?
7. Audit: Are kill criteria respected?
8. Report: PASS / FAIL with specific gaps
```

**This file is the contract. If the implementation doesn't satisfy this verification cycle, it's not done.**