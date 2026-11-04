# SkillHive Web — Philosophy Mindmap & Strategic Brief

**Project:** `web` (React + Vite + Tailwind + Supabase + LiveKit)
**Role:** Primary consumer-facing web application — the "social layer" of SkillHive
**Status:** Feature-complete for v1, unvalidated with real users
**Last Deploy:** October 18, 2026 (commit 84f6790)

---

## 1. CORE PHILOSOPHY: WHY THIS EXISTS

### The Founding Insight
> **"Students and developers are exploited by gatekeepers who sell fake internships, garbage courses, and empty promises. The antidote isn't better content — it's verified proof of work that no one can buy, only earn."**

### The Philosophy Stack (Bottom to Top)

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 5: TRUST ECONOMY                                         │
│  ├─ Verified portfolios → employers hire from proof, not resumes│
│  ├─ Creator revenue share → teachers earn from audiences        │
│  ├─ Institution rooms → colleges/clubs pay for private spaces   │
│  └─ Premium stats history → users pay for their own data depth  │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 4: SOCIAL PROOF                                          │
│  ├─ Public profiles with heatmaps, streaks, shipped notes      │
│  ├─ Allies (mutual, intentional) → high-signal micro-network   │
│  ├─ Project pages → living documents of work + insight         │
│  └─ Feed → ally activity only, no algorithm, no strangers      │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 3: STRUCTURED FOCUS                                      │
│  ├─ Workrooms: 50/10 cycles, shared rhythm, server-enforced   │
│  ├─ Cubicles: private 1:1 pair programming, true privacy       │
│  ├─ Presence: "I'm here, you're here, we're doing this"        │
│  └─ Notifications: only what matters, batched, respectful      │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 2: PERSONAL WORK SYSTEM                                  │
│  ├─ Today: intent → focus → capture → review (daily loop)      │
│  ├─ Projects: tagged sessions, heatmaps, streaks, insights     │
│  ├─ Time tracking: **Cue local sync** → verified full-context work (editor + terminal + git + browser + AI sessions) │
│  └─ Captures: blockers, shipped, unplanned → narrative trail   │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 1: ATMOSPHERE (THE NON-NEGOTIABLE FOUNDATION)           │
│  ├─ Zero friction: no dashboards to nurture, no performative UI│
│  ├─ Breathable: UI adapts to work mode (intent/focus/review)   │
│  ├─ Calm tech: noise overlay, custom cursor, ambient audio     │
│  └─ Identity: "Built for the work, not the feed"               │
└─────────────────────────────────────────────────────────────────┘
```

### The Golden Thread
**Every feature must answer: "Does this help a builder prove their work without performing?"**

If yes → build it. If no → kill it.

---

## 2. USER ARCHETYPES & THEIR JOURNEYS

### Primary: The Solo Builder (Developer/Student)
- **Pain:** No way to prove skills without gatekeepers; context switching kills momentum
- **Journey:** 
  1. Lands on Landing → "Your coding time, verified. Your focus, structured. Your people, intentional."
  2. Registers → **connects Cue (local orchestrator) → sees their full-context heatmap instantly (editor + terminal + git + browser + AI sessions)**
  3. Creates first project → "Rust OS" / "React Dashboard" / "ML Pipeline"
  4. Joins 9am fixed-time room → 50/10 cycles with 8 others → mic locked, shared rhythm
  5. `cue stop` in terminal → captures shipped + blockers → auto-publishes to project
  6. Opens Stager next morning → exact context restored → overnight orchestration results
  7. Profile accumulates: heatmap + streaks + shipped notes + ally replies
  8. Employer views profile → sees verified work, not resume → hires

### Secondary: The Ally Circle (3-5 intentional connections)
- **Pain:** Twitter is noise; Discord is chaos; LinkedIn is theater
- **Journey:**
  1. Follows builder's project → sees captures in real-time
  2. Replies to blocker: "Same bug bit me — here's the fix" (threaded, contextual)
  3. Bookmarks insight: "no_std + alloc pattern" → references in own project
  4. Gets notified when ally freezes thread → knows they're deep in work
  5. Zero algorithm — only chosen signals

### Tertiary: The Institution (College/Club/Company)
- **Pain:** No way to run structured focus programs; Zoom fatigue; no visibility
- **Journey:**
  1. Creates TeamOffice → private rooms, shared rhythm, calendar integration
  2. Announcements + rituals + break room → culture, not just meetings
  3. Admin sees aggregate focus hours (privacy-preserving) → program health
  4. Pays for institution rooms → revenue stream independent of courses

---

## 3. FEATURE MAP: WHAT EXISTS vs. WHAT'S NEEDED

### ✅ FULLY BUILT & WORKING (Code Reality)

| Feature | Location | Key Files | Status |
|---------|----------|-----------|--------|
| **Landing Page** | `src/pages/Landing.tsx` | Hero, Features, OpenSource, Footer | ✅ Beautiful, 3D, video background |
| **Auth (Supabase)** | `src/pages/Sign.tsx`, `Register.tsx` | OAuth, email, profile creation | ✅ Works |
| **Workrooms** | `src/pages/Room.tsx` (3058 lines) | LiveKit, 50/10 phases, cubicles, presence | ✅ Core works, **clock sync broken** |
| **Cubicles** | `Room.tsx` + signaling | 1:1 private rooms, signaling via Supabase Realtime | ⚠️ **Not private** (public broadcast) |
| **Today System** | `src/pages/Home.tsx` (1799 lines) | Intent → focus → capture → review, drag-drop tasks | ✅ Feature-complete |
| **Projects** | `Home.tsx` + `Project.tsx` | Create, tag sessions, heatmaps, public pages | ✅ Works |
| **Cue Local Sync** | `src/hooks/useCueSync.ts` (new) + backend | **Cue CLI** pushes full-context events (editor, terminal, git, browser, AI) → Supabase; replaces Wakatime/Hackatime | 🔄 **Migration needed** |
| **Heatmaps/Streaks** | `src/components/ui/Heatmap.tsx` + RPCs | 365-day, 7-day, current streak, stats | ✅ Works |
| **Allies System** | `src/pages/Profile.tsx`, `PublicProfile.tsx` | Mutual follow, visibility toggles | ✅ Works |
| **Feed** | `src/pages/Feed.tsx`, `PostCards.tsx` | Ally-only, captures + shipped notes | ✅ Works |
| **Public Profiles** | `PublicProfile.tsx` + RPCs | Heatmap, stats, projects, shipped notes | ✅ Works |
| **Themes** | `src/theme/` + `ThemeSwitcher` | 12+ themes, CSS variables, localStorage | ✅ Works |
| **Notifications** | `NotificationBell.tsx`, `NotificationList.tsx` | Real-time, grouped, mark-read | ✅ Works |
| **Settings** | `SettingsTrackers.tsx` | Tracker connections, visibility, preferences | ✅ Works |
| **3D/Cinematic UI** | `Hero.tsx`, `CubeScene.tsx`, `Cursor.tsx` | Noise, custom cursor, video, easter egg | ✅ Beautiful |

### ⚠️ BUILT BUT BROKEN / INCOMPLETE

| Issue | Impact | Fix Required |
|-------|--------|--------------|
| **Room cap not enforced** | >12 people can join, breaks philosophy | Server-side RPC + LiveKit `max_participants` |
| **Clock skew breaks shared rhythm** | Users see different phases, mic lock fails | Server time offset at join + server-enforced mic lock |
| **Cubicles not private** | Signaling on public broadcast channel | Private LiveKit channels + token auth |
| **vercel.json blocks camera/mic** | **Production video broken** | `camera=(self), microphone=(self)` |
| **Lenis smooth-scroll memory leak** | Scrolling degrades over time | Move to `useEffect` with cleanup |
| **AuthGate flicker** | Blank screen on every route | Single auth provider at root |
| **Terms/Privacy pages missing** | Legal exposure, blocks launch | Write minimal versions |
| **Wakatime keys in plaintext** | Security risk | **Removed** — Cue sync uses local-first auth, no external API keys |
| **No fixed-time rooms** | Cold start: 10 users = 5 rooms of 2 | 3 daily fixed times + "starts in 10min" notifications |
| **Cue ↔ Web sync not built** | Web shows stale/empty heatmaps without Stager/Cue integration | Cue CLI push endpoint + Supabase RPCs + web hook `useCueSync` |

### ❌ MISSING ENTIRELY (From Philosophy)

| Missing Feature | Philosophy Layer | Revenue Potential |
|-----------------|------------------|-------------------|
| **Premium workroom tiers** (₹199/mo) | Layer 3 | ₹1-2L/mo by month 12 |
| **Theme marketplace** (70/30 split) | Layer 5 | Zero marginal cost |
| **Creator revenue share** (20% of course sales) | Layer 5 | ₹2L+ at 10 creators |
| **Verified portfolio for employers** | Layer 5 | Placement fees |
| **Institution rooms** (Teams product) | Layer 5 | B2B recurring |
| **Data insights API** (aggregated) | Layer 5 | Year 2 play |
| **Mobile parity** (React Native) | Layer 1-3 | Mobile retention |
| **Stager integration** (desktop IPC) | Layer 2+4 | Unified loop |

---

## 4. STRATEGIC POSITIONING: THE THREE COMPANIES PROBLEM

### Current Reality
| Source | Company Description | TAM |
|--------|---------------------|-----|
| **Deck** | EdTech + placement for 40M students | ₹10,000Cr+ |
| **Conversation** | Desktop AI workspace orchestrator + autopilot | Developer tools |
| **Web Repo (Truth)** | **Developer focus tool: rooms + verified work + intentional allies** | **Developers (50M+)** |

### The Verdict
**The web repo's version is the strongest.** It's differentiated, honest, and each part is a real mechanism. 

**Rewrite the deck from the repo's truth.** This narrows TAM to developers — which is *correct for pre-seed*. The 40M student TAM is a fantasy that dilutes focus.

### Positioning Statement
> **SkillHive is the only platform where developers build verified proof of work through structured focus sessions, and that proof becomes their professional identity — no gatekeepers, no performative content, no algorithm.**

---

## 5. MONETIZATION PHILOSOPHY: NEVER COMPROMISE THE CORE

### The Revenue Concentration Reality (From Earlier Analysis)
- **Courses = 72% of projected revenue** → Fragile, dependent on cohort fill
- **Employer fees = lagging indicator of courses** → Not independent
- **Bridge revenue = survival money** → Not a stream

### The Fix: Monetize the Workroom (Layer 3) Independently

| Monetization | Philosophy Alignment | Implementation |
|--------------|---------------------|----------------|
| **Workroom Premium (₹199/mo)** | Enhances focus, not distracts | Private rooms, advanced analytics, custom themes, priority entry |
| **Theme Marketplace (70/30)** | Community-built, zero marginal cost | Creators build themes → users buy → platform takes 30% |
| **Institution Rooms (Teams)** | Private spaces for orgs | B2B SaaS, ₹50k-2L/yr per org |
| **Verified Portfolios** | Employers pay for signal, not resume | ₹10k-50k per hire / subscription |
| **Premium Stats History** | Users pay for their own data depth | ₹99/mo for 365-day heatmap + insights |

**Rule: No monetization until retention proves the core loop works.** 
- Target: ≥40% Day-7 return on fixed-time rooms
- Then: Soft launch premium at Month 4
- Then: Scale what works

---

## 6. THE "BREATHABLE UI" PHILOSOPHY (Layer 1)

### What It Means Practically
| Mode | UI Behavior | Why |
|------|-------------|-----|
| **Intent (Planning)** | Wide layout, sidebar visible, task drag-drop, project panel | Cognitive load: organizing |
| **Focus (50min)** | Full-screen, timer ring center, mic locked indicator, ambient audio | Cognitive load: deep work |
| **Break (10min)** | Mic unlocked, chat enabled, stretch prompt, hydration reminder | Cognitive load: recovery |
| **Review (Post-session)** | Capture modal, shipped/blockers, project link, ally preview | Cognitive load: synthesis |

### The Adaptation Principles
1. **No mode has unused UI** — every pixel serves the current cognitive task
2. **Transitions are meaningful** — intent→focus = commitment animation; focus→break = release
3. **User controls the breath** — can extend focus, skip break, but system gently guides
4. **Ambient persistence** — noise overlay, cursor, theme persist across modes

---

## 7. TECHNICAL ARCHITECTURE PHILOSOPHY

### Current Stack (Validated)
```
Frontend: React 19 + Vite + Tailwind 4 + React Router 7
State: React Context + Custom Hooks (no Redux/Zustand)
Real-time: LiveKit (video/audio) + Supabase Realtime (signaling/presence)
Backend: Supabase (Postgres + RLS + RPCs) + Express (token server + **Cue sync receiver**)
Auth: Supabase Auth (JWT, OAuth providers)
Deploy: Vercel (web) + Self-hosted (backend + LiveKit)
```

### Architectural Principles (Non-Negotiable)
1. **RLS on everything** — Owner-scoped policies, additive (OR'd), never permissive by default
2. **Security definer RPCs** — `search_path = public`, keys never echoed, anon-safe reads
3. **Local-first mindset** — Today system works offline, syncs when online
4. **No client secrets** — API keys in Vault/edge functions, never in client bundle
5. **Server-authoritative** — Phase, mic lock, room cap, presence = server truth

### Technical Debt to Accept vs. Fix
| Accept (Not Blocking) | Fix Before Launch |
|------------------------|-------------------|
| Room.tsx 3058 lines (refactor later) | vercel.json Permissions-Policy |
| 58 lint errors (cleanup sprint) | Clock skew / shared rhythm |
| Bundle size 1.49MB (lazy load later) | Cubicle privacy |
| Three icon libraries (standardize later) | AuthGate flicker |
| Framer-motion not in deps (add it) | Terms/Privacy pages |

---

## 8. GO-TO-MARKET PHILOSOPHY: THE WEDGE

### The Wedge: **Cue + Hack Club**
- **Cue** = local orchestrator tracking full-context work (editor, terminal, git, browser, AI sessions) — built-in
- **Hack Club** = 20k+ student developers who already track time via Hackatime
- **Migration path**: Hackatime users → install Cue → richer data auto-syncs to web
- They need: structure, community, verified proof
- SkillHive gives: rooms + **full-context heatmaps** + allies + public profiles

### Launch Sequence
1. **Week 1-2:** Fix critical bugs (clock sync, room cap, cubicles, vercel.json)
2. **Week 3:** 3 fixed-time rooms daily (9am, 2pm, 9pm IST) + "starts in 10min" notifications
3. **Week 3-4:** Recruit 15 Hack Club members → 7-day beta
4. **Measure:** Day-3 organic return ≥4/10, minutes in room, captures submitted
5. **If signal:** Soft launch premium (Month 4), rewrite deck, raise pre-seed
6. **If no signal:** Pivot expression (not philosophy) — desktop, AI, or verification

### The Beta Success Criteria
| Metric | Threshold | Why |
|--------|-----------|-----|
| Day-3 organic return | ≥40% | Core loop holds |
| Avg minutes/room/session | ≥35 | Real focus, not tourism |
| Captures per user/day | ≥1 | Work narrative forming |
| Ally connections/user | ≥2 | Micro-network forming |
| "Would recommend" (NPS) | ≥8/10 | Product-market fit signal |

---

## 9. QUESTIONS FOR ALIGNMENT (Must Resolve Before Implementation Plan)

### Product Strategy
1. **Is the web app the *primary* product, or a companion to Stager (desktop)?**
   - If primary: Invest heavily in web UX, mobile parity, PWA
   - If companion: Web = read-only views + social; Stager = write/work
   - *My read: Web should be fully functional standalone; Stager enhances.*

2. **Do we keep the "Courses/EdTech" narrative in the deck, or purge it?**
   - Purge: Honest, focused, matches code
   - Keep: Investors expect TAM, but damages credibility
   - *My read: Purge. Rewrite deck from repo truth.*

3. **What's the relationship between Web Rooms and Teams/TeamOffice?**
   - Separate products? Shared backend? Unified rooms?
   - *My read: Teams = org layer on same room infrastructure. Shared LiveKit + Supabase.*

### Technical Decisions
4. **LiveKit: Self-hosted vs. Cloud?**
   - Current: Self-hosted (`wss://rooms.skillhiive.com`)
   - Cost at scale: ~several Gbps for 1500 concurrent
   - *Need: Load test before claiming capacity numbers.*

5. **Supabase: Single project or per-environment?**
   - Current: Single project for all
   - Risk: Dev/prod data mixing, RLS testing
   - *Recommend: Separate projects with same schema.*

6. **Mobile: React Native (Expo) vs. PWA vs. Capacitor?**
   - Current: Expo + NativeWind + Liquid Glass (beautiful)
   - Parity: ~80% feature match
   - *Decision needed: Invest in mobile parity or PWA first?*

### Monetization Timing
7. **When do we test premium workroom tiers?**
   - Month 4 (after beta signal) per earlier plan
   - Or wait for 1000 DAU?
   - *My read: Month 4 soft launch, even at 200 DAU. Learn price sensitivity early.*

8. **Theme marketplace: Build now or Year 2?**
   - Code exists for themes, just needs marketplace UI + payments
   - *My read: Build after premium rooms prove willingness to pay.*

---

## 10. SUCCESS DEFINITION (The North Star)

> **In 6 months, SkillHive Web is the default answer to: "How do I prove I can build without a degree, a course certificate, or a gatekeeper's permission?"**

**Measured by:**
- 500+ developers with public profiles showing verified work
- 50+ ally circles actively replying to captures
- 10+ institutions running TeamOffice
- ₹1L+/mo recurring from premium rooms (independent of courses)
- 3 employers hiring from verified portfolios

---

**This philosophy document is the contract. The implementation plan must trace every line of code back to these principles. Any feature not serving the golden thread gets cut.**

---

**NEXT: Upon your approval, I'll create `IMPLEMENTATION_web.md` with:**
- Phase 1: Critical fixes (Week 1)
- Phase 2: Beta readiness (Week 2-3)
- Phase 3: Beta execution (Week 3-4)
- Phase 4: Post-signal roadmap (Month 2-6)
- Every task mapped to philosophy layer
- Risk mitigation for each technical decision
- Questions resolved before implementation begins