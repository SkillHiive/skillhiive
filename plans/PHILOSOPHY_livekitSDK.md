# SkillHive LiveKitSDK — Philosophy Mindmap & Strategic Brief

**Project:** `livekitSDK` (LiveKit Server Configuration)
**Role:** **Real-Time Infrastructure Config** — LiveKit SFU config for Web + Mobile rooms
**Status:** Single YAML config file + README. Deployed via Docker/Tailscale.
**Last Commit:** October 18, 2026

---

## 1. CORE PHILOSOPHY: WHY THIS EXISTS

### The Founding Insight
> **"Real-time communication should be invisible infrastructure. Config once, deploy everywhere, forget it exists."**

LiveKitSDK is not a product. It's **one YAML file** that defines how LiveKit SFU behaves for SkillHive's rooms. It's the contract between:
- **Clients** (Web + Mobile) → expect certain room behaviors
- **Backend** (Token Server) → mints tokens matching these grants
- **Infrastructure** (Docker/Tailscale) → deploys this config

### The Philosophy Stack

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 3: ROOM BEHAVIOR CONTRACT                                │
│  ├─ Auto-create rooms (no pre-provisioning)                     │
│  ├─ Empty timeout: 5 min (cleanup idle rooms)                   │
│  ├─ Departure timeout: 20s (graceful reconnect)                │
│  └─ Max participants: 12 (enforced by token server)            │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 2: NETWORK & MEDIA                                       │
│  ├─ UDP port range (media) + TCP fallback (reliability)        │
│  ├─ External IP discovery (NAT traversal)                       │
│  ├─ Redis clustering (horizontal scale)                         │
│  └─ Tailscale-only binding (zero public exposure)              │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 1: SECURITY & OPERATIONS                                 │
│  ├─ API keys via env vars (never in config)                    │
│  ├─ JSON structured logging (observability)                    │
│  ├─ Pion logging at error only (noise reduction)               │
│  └─ Tailscale sidecar (zero-trust network)                     │
└─────────────────────────────────────────────────────────────────┘
```

### The Golden Thread
**Every config value must answer: "Does this enable Web + Mobile rooms to work reliably without manual intervention?"**

If yes → keep it. If no → remove it.

---

## 2. CURRENT STATE: WHAT EXISTS

### ✅ WORKING

| Config Section | Purpose | Status |
|----------------|---------|--------|
| `port` | Server port (7880) | ✅ |
| `redis` | Clustering address + auth | ✅ |
| `rtc.port_range_start/end` | UDP media ports | ✅ |
| `rtc.tcp_port` | TCP fallback | ✅ |
| `rtc.use_external_ip` | NAT traversal | ✅ |
| `keys` | API key pair | ✅ |
| `logging.json: true` | Structured logs | ✅ |
| `room.auto_create` | No pre-provisioning | ✅ |
| `room.empty_timeout: 300` | 5 min cleanup | ✅ |

### ⚠️ NEEDS ENHANCEMENT

| Gap | Impact | Fix |
|-----|--------|-----|
| **No `max_participants`** | Room cap not enforced at SFU level | Add `room.max_participants: 12` |
| **No `simulcast` config** | Bandwidth adaptation for mobile | Add `rtc.simulcast: true` |
| **No `egress` config** | Recording/streaming not configured | Add when needed |
| **No `turn` config** | NAT traversal for restrictive networks | Add TURN server config |
| **No resource limits** | Container OOM risk | Add `limit` section |

### ❌ MISSING (For Scale)

| Missing | For |
|---------|-----|
| `analytics` section | Room/participant metrics |
| `webhook` callbacks | Room events → Backstage |
| `ingress` config | RTMP/SIP ingest |

---

## 3. STRATEGIC POSITIONING

### LiveKitSDK = One Config File

| What it is | What it's not |
|------------|---------------|
| Single YAML source of truth | LiveKit server code |
| Deployed via Docker Compose | LiveKit client SDK |
| Parameterized by env vars | Application code |
| Versioned with infrastructure | Application version |

### The Wedge
**One config file, deployed via Docker Compose, behind Tailscale, zero public exposure.**

---

## 4. GO-TO-MARKET: INFRASTRUCTURE AS CODE

**Target:** Self-hosters (Proxmox, homelab, small VPS)

### Deploy Checklist
- [ ] Docker + Docker Compose installed
- [ ] Tailscale installed + auth key
- [ ] `.env` with all required vars
- [ ] `docker compose up -d`
- [ ] `curl http://localhost:7880/health` → 200

### Success Criteria
- Deploy time < 5 minutes
- Zero manual config after `.env`
- Health check green on first try

---

## 5. SUCCESS DEFINITION

> **In 6 months, LiveKitSDK is the answer to: "How do I deploy a production LiveKit server for my app in 5 minutes?"**

**Measured by:**
- Deploy time < 5 min (fresh VM)
- Zero config drift (config = deployed)
- Zero manual LiveKit admin
- Uptime > 99.9%

---

**This philosophy document is the contract. The implementation plan must trace every YAML key to a Web/Mobile requirement. Any config that doesn't enable a client feature gets cut.**

---

**NEXT: Upon your approval, I'll create `IMPLEMENTATION_livekitSDK.md` with:**
- Phase 1: Config hardening (room limits, simulcast, TURN)
- Phase 2: Observability (metrics, webhooks, structured logs)
- Phase 3: Scale hardening (resource limits, clustering, TURN)
- Phase 4: Advanced (egress, ingress, analytics)
- Verification cycle per phase