# SkillHive Backend — Implementation Plan

**Project:** `backend` (Express + Bun)
**Role:** Infrastructure Glue — LiveKit token server, Wakatime/Hackatime sync, Cue sync proxy
**Strategy:** Invisible infrastructure; enable frontend/Cue without infrastructure awareness
**Constraint:** Single Express server; minimal deps; Docker + Tailscale deployable

---

## PHASE 1: HARDENING + CUE SYNC ENDPOINT (Week 1) — "Production Ready"

*Add rate limiting, Cue sync proxy, metrics; make it production-grade.*

### 1.1 Rate Limiting Middleware (2 hrs)
**Files:** `src/middleware/rateLimit.ts` (new), `server.js` (modify)
**Implementation:**
```typescript
// src/middleware/rateLimit.ts
import { RateLimiterMemory } from 'rate-limiter-flexible';

const tokenLimiter = new RateLimiterMemory({
  points: 30,        // 30 requests
  duration: 60,      // per minute
  blockDuration: 60, // block for 1 minute if exceeded
});

const syncLimiter = new RateLimiterMemory({
  points: 10,        // 10 requests
  duration: 300,     // per 5 minutes
  blockDuration: 300,
});

export const rateLimitToken = async (req, res, next) => {
  try {
    const key = req.ip || 'unknown';
    await tokenLimiter.consume(key);
    next();
  } catch {
    res.status(429).json({ error: 'Too many requests', retryAfter: 60 });
  }
};

export const rateLimitSync = async (req, res, next) => {
  try {
    const key = req.ip || 'unknown';
    await syncLimiter.consume(key);
    next();
  } catch {
    res.status(429).json({ error: 'Too many sync requests', retryAfter: 300 });
  }
};
```
**Integration:** Apply `rateLimitToken` to `/getToken`, `rateLimitSync` to `/sync-time-trackers`
**Philosophy Layer:** 2 (Token Service) — Protect infrastructure
**Risk:** Low. Standard middleware.

### 1.2 Cue Sync Proxy Endpoint (3 hrs)
**Files:** `server.js` (add route), `src/proxy/cueSync.ts` (new)
**Purpose:** Web Phase 2.4 needs `/cue/push` to forward Cue PushBody to Backstage
**Implementation:**
```typescript
// src/proxy/cueSync.ts
export async function setupCueSyncProxy(app, backstageUrl) {
  app.post('/v1/cue/push', async (req, res) => {
    try {
      // Validate auth (same as /getToken)
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const token = authHeader.slice(7);
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) return res.status(401).json({ error: 'Invalid session' });
      
      // Forward to Backstage
      const response = await fetch(`${BACKSTAGE_URL}/v1/push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${BACKSTAGE_TOKEN}`,
        },
        body: JSON.stringify(req.body),
      });
      
      if (!response.ok) {
        return res.status(502).json({ error: 'Backstage unavailable' });
      }
      
      const data = await response.json();
      res.json(data);
    } catch (err) {
      console.error('Cue sync proxy error:', err);
      res.status(500).json({ error: 'Proxy error' });
    }
  });
}
```
**Environment Variables:** `BACKSTAGE_URL`, `BACKSTAGE_TOKEN`
**Philosophy Layer:** 2 (Token Service) → enables Layer 4 (Cue Integration)
**Risk:** Medium. Auth flow must match Cue's expectations.

### 1.3 Prometheus Metrics Endpoint (2 hrs)
**Files:** `src/metrics.ts` (new), `server.js` (add `/metrics`)
**Metrics to Export:**
```typescript
// src/metrics.ts
import { Registry, Counter, Histogram, Gauge } from 'prom-client';

const register = new Registry();

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'path', 'status'],
  registers: [register],
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'path'],
  registers: [register],
});

export const syncDuration = new Histogram({
  name: 'sync_duration_seconds',
  help: 'Wakatime sync duration',
  labelNames: ['provider', 'status'],
  registers: [register],
});

export const activeConnections = new Gauge({
  name: 'active_connections',
  help: 'Active Wakatime connections',
  registers: [register],
});

export const cronDuration = new Histogram({
  name: 'cron_duration_seconds',
  help: 'Daily cron duration',
  registers: [register],
});

// Middleware
export function metricsMiddleware(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    httpRequestsTotal.inc({ method: req.method, path: req.path, status: res.statusCode });
    httpRequestDuration.observe({ method: req.method, path: req.path }, (Date.now() - start) / 1000);
  });
  next();
}

// /metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.send(await register.metrics());
});
```
**Philosophy Layer:** 1 (Infrastructure) — Observability
**Risk:** Low. Standard Prometheus client.

### 1.4 Structured JSON Logging (2 hrs)
**Files:** `src/logger.ts` (new), `server.js` (replace console.log)
**Implementation:**
```typescript
// src/logger.ts
export const logger = {
  info: (msg, meta = {}) => console.log(JSON.stringify({ level: 'info', message: msg, timestamp: new Date().toISOString(), ...meta })),
  warn: (msg, meta = {}) => console.warn(JSON.stringify({ level: 'warn', message: msg, timestamp: new Date().toISOString(), ...meta })),
  error: (msg, meta = {}) => console.error(JSON.stringify({ level: 'error', message: msg, timestamp: new Date().toISOString(), ...meta })),
  debug: (msg, meta = {}) => console.debug(JSON.stringify({ level: 'debug', message: msg, timestamp: new Date().toISOString(), ...meta })),
};
```
**Integration:** Replace all `console.log/error/warn` in `server.js`, `timeTrackerSync.js`
**Philosophy Layer:** 1 (Infrastructure) — Observability
**Risk:** Low. Drop-in replacement.

---

## PHASE 2: SYNC ENGINE HARDENING (Week 2) — "Reliable at Scale"

*Parallelize cron, configurable timezone, better error handling.*

### 2.1 Parallel Cron with Concurrency Control (4 hrs)
**Files:** `timeTrackerSync.js` (modify `syncAllConnections`)
**Current:** Sequential loop
**New:** Controlled concurrency
```javascript
// timeTrackerSync.js
import pLimit from 'p-limit';

const CONCURRENCY = 5; // Max 5 parallel syncs

async function syncAllConnections() {
  const connections = await loadConnections(null);
  const limit = pLimit(CONCURRENCY);
  
  const results = await Promise.allSettled(
    connections.map(conn => limit(() => syncConnection(conn)))
  );
  
  const failed = results.filter(r => r.status === 'rejected' || !r.value.ok).length;
  const succeeded = results.filter(r => r.status === 'fulfilled' && r.value.ok).length;
  
  if (failed > 0) {
    console.warn(`[timeTracker] daily sync completed with ${failed} failures, ${succeeded} succeeded`);
  } else {
    console.log(`[timeTracker] daily sync completed successfully for ${succeeded} connections`);
  }
  
  return results.map(r => r.status === 'fulfilled' ? r.value : { ok: false, error: r.reason?.message });
}
```
**Philosophy Layer:** 3 (Sync Engine) — Reliability at scale
**Risk:** Medium. Concurrency tuning needed.

### 2.2 Configurable User Timezone (3 hrs)
**Files:** `timeTrackerSync.js` (modify `startOfLocalDay`), `config.ts` (if needed)
**Current:** Hardcoded UTC
**New:** Per-user `day_tz` from `time_tracker_connections` or config
```javascript
// timeTrackerSync.js
function startOfLocalDay(timestamp, timezone) {
  const date = new Date(timestamp);
  const options = { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' };
  const parts = new Intl.DateTimeFormat('en-CA', options).formatToParts(date);
  const year = parts.find(p => p.type === 'year').value;
  const month = parts.find(p => p.type === 'month').value;
  const day = parts.find(p => p.type === 'day').value;
  return new Date(`${year}-${month}-${day}T00:00:00`, timezone).getTime();
}

// In cron: fetch user's day_tz from time_tracker_connections or default to UTC
```
**Philosophy Layer:** 3 (Sync Engine) — User-centric sync timing
**Risk:** Low. Timezone handling is well-tested.

### 2.3 Improved Error Handling + Retry Logic (3 hrs)
**Files:** `timeTrackerSync.js` (modify `syncConnection`)
**Enhancements:**
- Exponential backoff on Wakatime API 429/5xx
- Dead letter queue for permanently failed connections
- Alert on repeated failures (log + metric)
```javascript
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

async function fetchWithRetry(url, options, retries = MAX_RETRIES) {
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      if (response.status === 429 || response.status >= 500) {
        const delay = BASE_DELAY_MS * Math.pow(2, i) + Math.random() * 1000;
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      return response;
    } catch (err) {
      if (i === retries) throw err;
      const delay = BASE_DELAY_MS * Math.pow(2, i);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}
```
**Philosophy Layer:** 3 (Sync Engine) — Resilience
**Risk:** Low. Standard retry patterns.

### 2.4 Manual Sync Endpoint Enhancement (2 hrs)
**Files:** `timeTrackerSync.js` (modify `handleManualSync`)
**Enhancements:**
- Return per-connection status
- Support `?provider=wakatime|hackatime` filter
- Add `X-Request-ID` for tracing
```javascript
async function handleManualSync(req, res) {
  const requestId = crypto.randomUUID();
  console.log(`[timeTracker] manual sync started`, { requestId, user: user.id });
  
  const provider = req.query.provider;
  const connections = await loadConnections(user.id, true);
  const filtered = provider ? connections.filter(c => c.provider === provider) : connections;
  
  const results = await Promise.allSettled(
    filtered.map(conn => limit(() => syncConnection(conn)))
  );
  
  res.json({
    requestId,
    synced: results.filter(r => r.status === 'fulfilled' && r.value.ok).length,
    failed: results.filter(r => r.status === 'rejected' || !r.value?.ok).length,
    results: results.map(r => r.status === 'fulfilled' ? r.value : { ok: false, error: r.reason?.message })
  });
}
```
**Philosophy Layer:** 2 (Token Service) — User control
**Risk:** Low. Incremental improvement.

---

## PHASE 3: DEPLOYMENT HARDENING (Week 3) — "Deploy Anywhere"

### 3.1 Dockerfile Hardening (2 hrs)
**Files:** `Dockerfile` (modify)
**Enhancements:**
```dockerfile
# Use distroless for smaller attack surface
FROM oven/bun:1.1-alpine AS builder
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production
COPY . .
RUN bun run build

FROM gcr.io/distroless/nodejs20-debian12
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/src ./src
COPY --from=builder /app/ecosystem.config.js ./
ENV NODE_ENV=production
EXPOSE 3000
CMD ["src/server.js"]
```
**Philosophy Layer:** 1 (Infrastructure) — Security, size
**Risk:** Low. Standard distroless pattern.

### 3.2 Health Check Enhancement (1 hr)
**Files:** `server.js` (modify `/health`)
**Enhancement:** Include dependency checks
```javascript
app.get('/health', async (req, res) => {
  const checks = await Promise.allSettled([
    supabase.from('profiles').select('id').limit(1), // DB
    fetch(`${LLAMA_BASE_URL}/health`).then(r => r.ok), // llama.cpp
    fetch(`https://api.wakatime.com/api/v1/users/current`, { headers: { Authorization: `Bearer ${TEST_WAKATIME_KEY}` } }).then(r => r.ok), // Wakatime API
  ]);
  
  const [db, llama, wakatime] = checks.map(c => c.status === 'fulfilled' && c.value);
  
  res.status(db && llama ? 200 : 503).json({
    ok: db && llama,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    dependencies: { database: db, llama: llama, wakatime: wakatime },
  });
}
```
**Philosophy Layer:** 1 (Infrastructure) — Reliability
**Risk:** Low. Standard health check pattern.

### 3.3 Docker Compose for Self-Host (2 hrs)
**Files:** `docker-compose.yml` (new), `.env.example` (update)
**Compose:**
```yaml
services:
  backend:
    build: .
    ports: ["3000:3000"]
    environment:
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - LIVEKIT_API_KEY=${LIVEKIT_API_KEY}
      - LIVEKIT_API_SECRET=${LIVEKIT_API_SECRET}
      - NIM_API_KEY=${NIM_API_KEY}
      - BACKSTAGE_URL=http://backstage:7420
      - BACKSTAGE_TOKEN=${BACKSTAGE_TOKEN}
    depends_on: [db]
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  db:
    image: pgvector/pgvector:pg16
    environment:
      - POSTGRES_DB=skillhiive
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  pgdata:
```
**Philosophy Layer:** 1 (Infrastructure) — Self-host simplicity
**Risk:** Low. Standard compose pattern.

---

## PHASE 4: OBSERVABILITY + FUTURE-PROOFING (Week 4) — "Operable"

### 4.1 Cue Sync Proxy Enhancement (3 hrs)
**Files:** `src/proxy/cueSync.ts` (enhance)
**Future-proofing:**
- Add `/v1/cue/pull` proxy
- Request/response validation (Zod)
- Request ID propagation
- Timeout configuration
```typescript
// Future: /v1/cue/pull
app.get('/v1/cue/pull', async (req, res) => {
  const since = req.query.since;
  const response = await fetch(`${BACKSTAGE_URL}/v1/pull?since=${since}`, {
    headers: { Authorization: `Bearer ${BACKSTAGE_TOKEN}` },
  });
  const data = await response.json();
  res.json(data);
});
```
**Philosophy Layer:** 2 (Token Service) → Layer 4 (Cue Integration)
**Risk:** Low. Incremental.

### 4.2 Request ID + Tracing (2 hrs)
**Files:** `src/middleware/requestId.ts` (new), `server.js`
**Implementation:**
```typescript
// src/middleware/requestId.ts
import { randomUUID } from 'crypto';

export function requestIdMiddleware(req, res, next) {
  req.id = req.headers['x-request-id'] || randomUUID();
  res.setHeader('X-Request-ID', req.id);
  next();
}

// Logger includes requestId
logger.info(msg, { requestId: req.id, ...meta });
```
**Philosophy Layer:** 1 (Infrastructure) — Traceability
**Risk:** Low. Standard middleware.

### 4.3 Graceful Degradation (2 hrs)
**Files:** `server.js` (modify error handling)
**Pattern:** If Backstage unavailable, cache Cue sync locally → retry later
```javascript
// In cue sync proxy
if (!response.ok && response.status >= 500) {
  // Store in local outbox table
  await supabase.from('cue_sync_outbox').insert({
    payload: req.body,
    created_at: new Date().toISOString(),
    retries: 0,
  });
  return res.status(202).json({ ok: true, queued: true });
}
```
**Philosophy Layer:** 1 (Infrastructure) — Resilience
**Risk:** Low. Standard outbox pattern.

---

## TECHNICAL DEBT: ACCEPTED

| Item | Reason | Revisit |
|------|--------|---------|
| Single-threaded Express | Simplicity; Bun handles concurrency | Month 3 |
| In-memory rate limiter | Single container; Redis for scale | Month 3 |
| No request tracing (OpenTelemetry) | Overhead for now | Month 6 |
| Single Postgres instance | Simplicity; read replicas later | Month 6 |

---

## RISK MITIGATION

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| `/getToken` abuse | Medium | High | Rate limiting (Phase 1.1) |
| Wakatime API changes | Low | High | Version pin; test weekly |
| Cron blocks on slow sync | Medium | Medium | Parallel + timeout (Phase 2.1) |
| Backstage unavailable | Low | High | Local outbox + retry (Phase 4.3) |
| Supabase connection exhaustion | Low | High | PgBouncer (Month 3) |
| Rate limiter memory leak | Low | Medium | `rate-limiter-flexible` cleanup |

---

## DEPENDENCIES ON OTHER REPOS

| Repo | What Backend Provides | When |
|------|----------------------|------|
| **Web** | `/getToken`, `/sync-time-trackers`, `/v1/cue/push` | **Phase 1** |
| **Mobile** | `/getToken`, `/sync-time-trackers` | Phase 1 |
| **Cue** | `/v1/push`, `/v1/pull` (via Backstage) | Phase 3 |
| **Backstage** | Token validation, sync target | Phase 3 |
| **Stager** | `/getToken` (via Web) | Phase 3 |

---

## DEFINITION OF DONE (Per Phase)

| Phase | Done When |
|-------|-----------|
| 1 | Rate limited; `/cue/push` proxies to Backstage; `/metrics` exposes Prometheus; JSON logs |
| 2 | Cron parallel; user timezone respected; retries work; manual sync returns detail |
| 3 | Distroless Docker; health checks deps; docker-compose self-host works |
| 4 | Cue pull proxy; request IDs in logs; Backstage down → local queue |

---

## QUESTIONS RESOLVED

| # | Question | Decision |
|---|----------|----------|
| 1 | Rate limiter storage | In-memory (single container); Redis at scale |
| 2 | Metrics format | Prometheus (standard) |
| 3 | Logging format | JSON (structured) |
| 4 | Cron concurrency | 5 parallel (configurable) |
| 4 | User timezone | Per-connection `day_tz` column |
| 5 | Cue sync proxy | Required for Web Phase 2.4 |

---

## NEXT STEPS

1. **You approve this plan** → I create task breakdown with file-level details
2. **Week 1 sprint** → Phase 1: Rate limiting, Cue proxy, metrics, JSON logging
3. **Daily sync** → Blockers, decisions, progress
4. **Phase 2 kickoff** → Only after Phase 1 deployed and verified

**Ready to proceed with Phase 1 task breakdown?**