# SkillHive Backend — Philosophy Mindmap & Strategic Brief

**Project:** `backend` (Express + Bun)
**Role:** **Infrastructure Glue** — LiveKit token server, Wakatime/Hackatime sync, health checks
**Status:** Working, deployed. Single Express server.
**Last Commit:** October 18, 2026

---

## 1. CORE PHILOSOPHY: WHY THIS EXISTS

### The Founding Insight
> **"The backend should be invisible. It exists only to let the frontend and Cue talk to LiveKit and Supabase."**

Backend is not a product. It's **plumbing** that:
- Mints LiveKit tokens (identity + room grants)
- Syncs Wakatime/Hackatime → Supabase (verified coding time)
- Exposes health endpoint for monitoring
- Runs on minimal resources (single container)

### The Philosophy Stack

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 3: SYNC ENGINE                                           │
│  ├─ Wakatime/Hackatime daily cron (03:00 UTC)                   │
│  ├─ Manual sync endpoint (debounced, forceable)                 │
│  ├─ Per-project mapping (tracker → SkillHive project)           │
│  └─ Aggregated stats (user + project level)                     │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 2: TOKEN SERVICE                                         │
│  ├─ /getToken → LiveKit JWT (room, identity, grants)           │
│  ├─ Validates Supabase JWT → extracts user → verifies username │
│  ├─ CORS + OPTIONS handling                                     │
│  └─ Rate limiting (future)                                      │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 1: INFRASTRUCTURE                                        │
│  ├─ Express + Bun (fast, native TS)                             │
│  ├─ Supabase service role (admin)                               │
│  ├─ LiveKit server SDK (token minting)                          │
│  ├─ Graceful shutdown (SIGTERM/SIGINT)                          │
│  ├─ Health endpoint (/health)                                   │
│  └─ Docker + Tailscale sidecar                                  │
└─────────────────────────────────────────────────────────────────┘
```

### The Golden Thread
**Every endpoint must answer: "Does this let the frontend/Cue do its job without knowing about infrastructure?"**

If yes → keep it. If no → remove it.

---

## 2. CURRENT STATE: WHAT EXISTS

### ✅ WORKING

| Endpoint | Purpose | Status |
|----------|---------|--------|
| `GET /health` | DB + llama.cpp + queue status | ✅ |
| `GET /getToken` | LiveKit JWT (room, identity, grants) | ✅ |
| `POST /sync-time-trackers` | Manual Wakatime/Hackatime sync | ✅ |
| Daily cron (03:00 UTC) | Auto-sync all active connections | ✅ |

### ⚠️ NEEDS ENHANCEMENT

| Gap | Impact | Fix |
|-----|--------|-----|
| **No rate limiting** | Abuse potential on `/getToken` | Add per-user/IP rate limit |
| **No Cue sync endpoint** | Web Phase 2.4 needs `/cue/push` | Add `/v1/cue/push` proxy to Backstage |
| **Single-threaded cron** | Blocks on slow Wakatime API | Parallelize with concurrency limit |
| **No metrics endpoint** | Can't monitor sync health | Add `/metrics` (Prometheus format) |
| **Hardcoded 03:00 UTC** | Not configurable per user | Use `day_tz` from config |

### ❌ MISSING (For Future)

| Missing | For |
|---------|-----|
| `/v1/cue/push` | Web Phase 2.4 (Cue → Web sync) |
| `/v1/cue/pull` | Cue → Backstage pull |
| Rate limiting middleware | Abuse prevention |
| Prometheus metrics | Monitoring |
| Structured logging (JSON) | Observability |

---

## 3. ARCHITECTURE: MINIMAL & FOCUSED

### Request Flow

```
Web/Mobile/Cue
      │
      ▼
┌──────────────────────────────────────────┐
│          Express (Bun)                   │
├──────────────────────────────────────────┤
│  /getToken     │  /sync-time-trackers    │
│  /health       │  /metrics (future)      │
│  /cue/push     │  /cue/pull (future)     │
└──────────────────────────────────────────┘
      │                    │
      ▼                    ▼
┌─────────────┐    ┌─────────────────┐
│  LiveKit    │    │  Supabase       │
│  (token)    │    │  (Wakatime sync)│
└─────────────┘    └─────────────────┘
```

### Data Flow: Wakatime Sync

```
Daily Cron (03:00 UTC)
      │
      ▼
Load all active connections (status='active')
      │
      ▼
For each connection (parallel, max 5):
  1. Test Wakatime/Hackatime API key
  2. Fetch projects + daily breakdown (90 days)
  3. Upsert to time_tracker_projects_raw
  4. Reaggregate user + project stats
      │
      ▼
Update time_tracker_connections (last_sync_at, status)
```

---

## 4. GO-TO-MARKET: INVISIBLE INFRASTRUCTURE

**Backend is not a product.** It's deployed once per environment.

| Environment | Deploy Target | Scale |
|-------------|---------------|-------|
| **Development** | Local (bun run dev) | 1 user |
| **Staging** | Fly.io / Railway (1 container) | 10 users |
| **Production** | Fly.io / Railway (2+ containers) | 10,000+ users |

**Scaling triggers:**
- CPU > 70% → add container
- `/getToken` latency > 200ms → add container
- Cron duration > 30 min → increase concurrency

---

## 5. SUCCESS DEFINITION

> **In 6 months, Backend is the answer to: "I never think about it. It just works."**

**Measured by:**
- `/getToken` p99 latency < 100ms
- Cron success rate > 99.9%
- Zero security incidents
- Zero manual interventions
- Infrastructure cost < $50/month at 10k users

---

**This philosophy document is the contract. The implementation plan must trace every endpoint, every cron job, every dependency back to these principles. Any feature that adds complexity without enabling the frontend/Cue gets cut.**

---

**NEXT: Upon your approval, I'll create `IMPLEMENTATION_backend.md` with:**
- Phase 1: Rate limiting + Cue sync endpoint + metrics
- Phase 2: Cron parallelization + configurable timezone + structured logging
- Phase 3: Docker hardening + health checks + Prometheus metrics
- Every task mapped to Philosophy Layer
- Verification cycle per phase