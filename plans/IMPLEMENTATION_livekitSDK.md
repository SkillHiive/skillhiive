# SkillHive LiveKitSDK — Implementation Plan

**Project:** `livekitSDK` (LiveKit Server Configuration)
**Role:** Real-Time Infrastructure Config — Single YAML, Docker Compose deployed
**Strategy:** Config hardening → Observability → Scale hardening → Advanced features
**Constraint:** Single YAML file; Docker Compose deployed; Tailscale-only; Zero public exposure

---

## PHASE 1: CONFIG HARDENING (Week 1) — "Enable Client Features"

*Add config that Web + Mobile clients depend on but currently missing.*

### 1.1 Room Participant Limit (1 hr)
**File:** `livekit.yaml`
**Change:** Add room-level participant cap
```yaml
room:
  auto_create: true
  empty_timeout: 300
  departure_timeout: 20
  max_participants: 12  # NEW: Enforce at SFU level
```
**Why:** Token server enforces 12, but SFU should also enforce as safety net
**Philosophy Layer:** 3 (Room Behavior Contract)
**Risk:** Zero. Single line addition.

### 1.2 Simulcast for Bandwidth Adaptation (1 hr)
**File:** `livekit.yaml`
**Change:** Enable simulcast for adaptive bitrate
```yaml
rtc:
  # ... existing ...
  simulcast: true  # NEW: Enable simulcast
```
**Why:** Mobile clients need adaptive bitrate (WiFi → cellular). Web benefits too.
**Philosophy Layer:** 2 (Network & Media) — Mobile-first bandwidth adaptation
**Risk:** Low. LiveKit handles simulcast automatically.

### 1.3 TURN Server Configuration (2 hrs)
**File:** `livekit.yaml`
**Change:** Add TURN server for restrictive NATs
```yaml
rtc:
  # ... existing ...
  turn:
    - urls: "turn:turn.skillhiive.com:3478?transport=udp"
      username: "skillhiive"
      credential: "TURNSERVER_CREDENTIAL"
    - urls: "turn:turn.skillhiive.com:3478?transport=tcp"
      username: "skillhiive"
      credential: "TURNSERVER_CREDENTIAL"
```
**Why:** Corporate/school networks block UDP; TURN over TCP enables connectivity
**Philosophy Layer:** 2 (Network & Media) — Universal connectivity
**Risk:** Medium. Requires TURN server deployment (coturn on separate VM).

### 1.4 Simulcast + Codec Preferences (1 hr)
**File:** `livekit.yaml`
**Change:** Optimize codec selection
```yaml
rtc:
  # ... existing ...
  codec:
    - name: "VP8"
      mime_type: "video/VP8"
      simulcast: true
    - name: "VP9"
      mime_type: "video/VP9"
      simulcast: true
    - name: "H264"
      mime_type: "video/H264"
      simulcast: false  # H264 doesn't support simulcast well
    - name: "opus"
      mime_type: "audio/opus"
```
**Why:** Explicit codec order ensures VP8/VP9 preferred for simulcast; opus for audio
**Philosophy Layer:** 2 (Network & Media) — Optimal codec selection
**Risk:** Low. Standard LiveKit config.

---

## PHASE 2: OBSERVABILITY (Week 2) — "See What's Happening"

### 2.1 Prometheus Metrics Endpoint (1 hr)
**File:** `livekit.yaml`
**Change:** Enable Prometheus metrics
```yaml
prometheus:
  port: 9090
  path: "/metrics"
```
**Why:** Prometheus scraping for room/participant/bandwidth metrics
**Philosophy Layer:** 1 (Security & Operations) — Observability
**Risk:** Low. Standard LiveKit feature.

### 2.2 Webhook Callbacks (2 hrs)
**File:** `livekit.yaml`
**Change:** Room event webhooks → Backstage
```yaml
webhook:
  urls:
    - "https://api.skillhiive.com/v1/livekit/webhook"
  events:
    - "room_started"
    - "room_finished"
    - "participant_joined"
    - "participant_left"
    - "track_published"
    - "track_unpublished"
  api_key: "LIVEKIT_WEBHOOK_API_KEY"
```
**Why:** Backstage needs room events for analytics, billing, moderation
**Philosophy Layer:** 1 (Security & Operations) — Event-driven architecture
**Risk:** Medium. Requires Backstage endpoint.

### 2.3 Structured Logging Enhancement (1 hr)
**File:** `livekit.yaml`
**Change:** Enhanced JSON logging
```yaml
logging:
  level: info
  pion_level: error
  json: true
  format: json
  output: stdout
```
**Why:** Structured logs → Loki/Grafana for debugging
**Philosophy Layer:** 1 (Security & Operations) — Debuggability
**Risk:** Low. Standard config.

### 2.4 Health Check Enhancement (1 hr)
**File:** `livekit.yaml`
**Change:** Enhanced health endpoint
```yaml
health:
  port: 7881
  path: "/health"
```
**Why:** Separate health port for load balancer probes
**Philosophy Layer:** 1 (Security & Operations) — Reliability
**Risk:** Low. Standard feature.

---

## PHASE 3: SCALE HARDENING (Week 3) — "Handle Growth"

### 3.1 Resource Limits (1 hr)
**File:** `livekit.yaml`
**Change:** Container resource limits
```yaml
limit:
  cpu: "2000m"      # 2 CPU cores
  memory: "4Gi"     # 4 GB RAM
  file_descriptors: 100000
```
**Why:** Prevent OOM kills; predictable resource usage
**Philosophy Layer:** 1 (Security & Operations) — Resource predictability
**Risk:** Low. Standard container limits.

### 3.2 Redis Clustering Config (2 hrs)
**File:** `livekit.yaml`
**Change:** Redis sentinel/cluster support
```yaml
redis:
  address: "redis://redis-master:6379"
  username: "default"
  password: "REDIS_PASSWORD"
  sentinel:
    master_name: "mymaster"
    addresses:
      - "redis-sentinel-1:26379"
      - "redis-sentinel-2:26379"
      - "redis-sentinel-3:26379"
  db: 0
  max_retries: 3
  pool_size: 20
```
**Why:** High availability Redis for clustering multiple LiveKit nodes
**Philosophy Layer:** 1 (Security & Operations) — HA infrastructure
**Risk:** Medium. Requires Redis Sentinel setup.

### 3.3 Load Balancer Config (1 hr)
**File:** `livekit.yaml` (docs only)
**Change:** Document LB requirements
```yaml
# Load Balancer Requirements (for documentation)
# - Layer 4 (TCP/UDP) passthrough
# - Preserve client IP (proxy_protocol v2)
# - UDP port range: RANGE_START-RANGE_END
# - TCP fallback: FALLBACK_PORT
# - Health check: /health on port 7881
```
**Why:** Document LB requirements for infra team
**Philosophy Layer:** 1 (Security & Operations) — Deployability
**Risk:** Low. Documentation only.

---

## PHASE 4: ADVANCED FEATURES (Month 2) — "Next Level"

### 4.1 Egress (Recording/Streaming) (3 hrs)
**File:** `livekit.yaml`
**Change:** Enable recording to S3
```yaml
egress:
  s3:
    bucket: "skillhiive-recordings"
    region: "us-east-1"
    credentials:
      access_key: "S3_ACCESS_KEY"
      secret_key: "S3_SECRET_KEY"
  default:
    file_type: "mp4"
    audio_only: false
```
**Why:** Record rooms for replay, compliance, content
**Philosophy Layer:** 5 (Advanced Features) — Content capture
**Risk:** High. Requires S3 bucket + permissions.

### 4.2 Ingress (RTMP/SIP Ingest) (3 hrs)
**File:** `livekit.yaml`
**Change:** Accept external streams
```yaml
ingress:
  rtmp:
    enabled: true
    ports:
      - 1935
  whip:
    enabled: true
  sip:
    enabled: false
```
**Why:** Stream from OBS, Zoom, SIP phones into LiveKit rooms
**Philosophy Layer:** 5 (Advanced Features) — Interoperability
**Risk:** High. Complex media pipeline.

### 4.3 Analytics Export (2 hrs)
**File:** `livekit.yaml`
**Change:** Export room analytics
```yaml
analytics:
  enabled: true
  interval: 60  # seconds
  output:
    - type: prometheus
    - type: json
      path: "/var/log/livekit/analytics.json"
```
**Why:** Room utilization, bandwidth, participant metrics
**Philosophy Layer:** 1 (Security & Operations) — Business intelligence
**Risk:** Medium. Storage considerations.

---

## DEPLOYMENT CONFIGURATION

### Docker Compose (Production)
```yaml
# docker-compose.yml
services:
  livekit:
    image: livekit/livekit-server:latest
    ports:
      - "7880:7880"   # Main
      - "7881:7881"   # Health
      - "9090:9090"   # Prometheus
    environment:
      - LIVEKIT_CONFIG_FILE=/etc/livekit.yaml
    volumes:
      - ./livekit.yaml:/etc/livekit.yaml:ro
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:7881/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
    networks:
      - skillhiive-tailnet

  turn:
    image: coturn/coturn:latest
    command: >
      -n -a -v
      -u skillhiive:TURNSERVER_CREDENTIAL
      -r skillhiive.com
      -p 3478
      -t 3478
      --external-ip=PUBLIC_IP
    ports:
      - "3478:3478/udp"
      - "3478:3478/tcp"
      - "5349:5349/udp"
      - "5349:5349/tcp"
    restart: unless-stopped
    networks:
      - skillhiive-tailnet

networks:
  skillhiive-tailnet:
    external: true
```

### Environment Variables (`.env`)
```bash
# LiveKit
PORT=7880
RANGE_START=50000
RANGE_END=60000
FALLBACK_PORT=7882
PUBLIC_IP=100.x.x.x
KEY=API_KEY
SECRET=API_SECRET

# Redis
IP=redis
REDIS_PORT=6379
REDIS_PASSWORD=secure_password

# TURN
TURNSERVER_CREDENTIAL=turn_password

# S3 (for egress)
S3_ACCESS_KEY=xxx
S3_SECRET_KEY=xxx

# Webhook
LIVEKIT_WEBHOOK_API_KEY=webhook_secret
```

---

## VERIFICATION CHECKLIST

| Phase | Config Change | Test |
|-------|---------------|------|
| 1.1 | `max_participants: 12` | 13th join → rejected |
| 1.2 | `simulcast: true` | Mobile switches WiFi→LTE → bitrate adapts |
| 1.3 | TURN config | Join from corporate WiFi → connects |
| 1.4 | Codec prefs | VP8/VP9 preferred over H264 |
| 2.1 | Prometheus port | `curl :9090/metrics` → LiveKit metrics |
| 2.2 | Webhook | Room start → Backstage receives event |
| 2.3 | JSON logs | `docker logs livekit` → valid JSON |
| 2.4 | Health port | `curl :7881/health` → 200 OK |
| 3.1 | Resource limits | `docker stats livekit` → within limits |
| 3.2 | Redis cluster | Kill master → failover < 5s |
| 3.3 | LB config | HAProxy config matches requirements |
| 4.1 | Egress | Start recording → MP4 in S3 |
| 4.2 | Ingress | OBS stream → appears in room |
| 4.3 | Analytics | JSON file written every 60s |

---

## DEFINITION OF DONE (Per Phase)

| Phase | Done When |
|-------|-----------|
| 1 | All client features work: room cap, simulcast, TURN, codec prefs |
| 2 | Full observability: metrics, webhooks, logs, health |
| 3 | Production-hardened: limits, HA Redis, LB docs |
| 4 | Advanced features: recording, streaming, analytics |

---

## RISK MITIGATION

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| TURN server down | Medium | High | Monitor; fallback to relay |
| Redis sentinel failover | Low | High | Test monthly; alert on failover |
| Egress S3 permissions | Medium | Medium | IAM least privilege; test monthly |
| Config drift | Low | High | GitOps: config in repo = deployed |

---

## NEXT STEPS

1. **You approve this plan** → I create task breakdown with exact YAML diffs
2. **Week 1 sprint** → Phase 1: Room limits, simulcast, TURN, codecs
3. **Daily sync** → Blockers, decisions, progress
4. **Phase 2 kickoff** → Only after Phase 1 deployed and verified on staging

**Ready to proceed with Phase 1 task breakdown?**