# SkillHive Mobile — Philosophy Mindmap & Strategic Brief

**Project:** `mobile` (Expo 58 + React Native 0.78 + NativeWind)
**Role:** **Companion App** — Room + Today + Feed on the go; native strengths (PiP, haptics, gestures, push)
**Status:** Room + Today + Feed + Profile built; Liquid Glass tabs; PiP working
**Last Commit:** October 18, 2026

---

## 1. CORE PHILOSOPHY: WHY THIS EXISTS

### The Founding Insight
> **"Your focus doesn't stop at your desk. Your companion shouldn't either."**

Mobile is not "Web on small screen." It's a **native-first companion** that:
- **Joins rooms** with one tap (LiveKit native)
- **Tracks today** with haptic feedback (expo-haptics)
- **Stays in the loop** via push (FCM/APNs → deep link)
- **Keeps working** in background (expo-background-fetch)
- **Feels native** — Liquid Glass, haptics, gestures, PiP

### The Philosophy Stack (Bottom to Top)

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 5: ECOSYSTEM INTEGRATION                                 │
│  ├─ Push → Stager deep links (task review, approval)           │
│  ├─ Push → Web notifications (ally captures, rhythm events)    │
│  ├─ Background sync → Cue local data ↔ Cloud                   │
│  └─ Deep links → Stager task review, TeamOffice                │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 4: NATIVE CAPABILITIES                                   │
│  ├─ PiP (expo-pip) — room persists while multitasking          │
│  ├─ Haptics (expo-haptics) — phase change, task complete       │
│  ├─ Gestures (RN gesture handler) — swipe nav, edge swipe      │
│  ├─ Liquid Glass (expo-glass-effect) — tab bar, modals         │
│  ├─ Background sync (expo-background-fetch) — cue data         │
│  └─ Push (FCM/APNs) → deep links                               │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 3: CORE FEATURES (SHARED LOGIC FROM MONOREPO)           │
│  ├─ Room join + LiveKit native (video, cubicles, phases)       │
│  ├─ Today (intent → focus → capture → review)                  │
│  ├─ Feed (ally captures, shipped notes)                        │
│  └─ Profile (heatmap, streaks, projects)                       │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 2: SHARED LOGIC (FROM MONOREPO @skillhiive/core)        │
│  ├─ Rhythm engine (computePhase, phases, config)               │
│  ├─ Auth types + helpers                                        │
│  ├─ Room types + helpers                                        │
│  ├─ Timer formatting + parsing                                  │
│  └─ Storage interface (AsyncStorage/SecureStore)               │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 1: NATIVE ATMOSPHERE                                     │
│  ├─ Liquid Glass tab bar (expo-glass-effect)                   │
│  ├─ Haptic feedback on every interaction                       │
│  ├─ Gesture navigation (swipe, edge swipe, pull-to-refresh)    │
│  ├─ PiP — room lives while you check messages                  │
│  └─ Permissions handled gracefully (camera, mic, notifications)│
└─────────────────────────────────────────────────────────────────┘
```

### The Golden Thread
**Every feature must answer: "Does this feel more native than the web version?"**

If yes → build it. If no → use web view or skip.

---

## 2. USER ARCHETYPES & THEIR JOURNEYS

### Primary: The Desk-Away Builder
- **Pain:** Leaves desk → loses room context, misses rhythm, can't capture
- **Journey:**
  1. Phone buzzes → "Team rhythm starting in 5 min" → tap → joins room
  2. In room → PiP on → checks Slack → room persists in corner
  3. Phase ends → haptic buzz → "Break started" → opens break room
  4. Captures thought → "Need to refactor auth" → saved to Today
  5. Back at desk → opens Stager → "While you were away: captured 2 notes"

### Secondary: The Mobile-First Builder
- **Pain:** No desktop access during day; codes on iPad/phone
- **Journey:**
  1. Opens app → Today screen → plans day with haptic feedback
  2. Joins 9am room → codes in VS Code on iPad → PiP for room
  3. `cue stop` equivalent → captures with haptic confirmation
  4. Background sync → Cue local data updates

### Tertiary: The Ally Watcher
- **Pain:** Wants to see ally activity without opening laptop
- **Journey:**
  1. Push: "Sarah shipped: 'Fixed auth race condition'"
  2. Tap → opens Feed → sees capture + context
  3. Replies: "Same bug bit me last week — here's the fix"
  3. Bookmarks for later reference in Stager

---

## 3. FEATURE MAP: WHAT EXISTS vs. WHAT'S NEEDED

### ✅ FULLY BUILT & WORKING

| Feature | Location | Status |
|---------|----------|--------|
| **Room Join** | `app/rooms/[roomName].tsx` | ✅ LiveKit native, lobby, video, cubicles |
| **Room Phases** | `app/rooms/[roomName].tsx` | ✅ 50/10 rhythm, shared clock |
| **Cubicles** | `app/rooms/[roomName].tsx` | ✅ 1:1 private, signaling |
| **PiP** | `hooks/usePipMode.ts` | ✅ expo-pip, resize, persistent |
| **Liquid Glass Tabs** | `app/main/tabs.tsx` | ✅ expo-glass-effect, spring animations |
| **Today Screen** | `app/main/index.tsx` | ✅ Intent → Focus → Capture → Review |
| **Feed** | `app/main/feedScreen.tsx` | ✅ Ally captures, threaded replies |
| **Profile** | `app/main/profile.tsx` | ✅ Heatmap, streaks, projects |
| **Haptics** | `hooks/useHaptics.ts` (planned) | 🔄 Expo-haptics integration |
| **Push Notifications** | Not yet | ❌ FCM/APNs + deep links |
| **Background Sync** | Not yet | ❌ expo-background-fetch |
| **Gestures** | Partial | 🔄 Swipe nav, edge swipe |

### ⚠️ BUILT BUT NEEDS ENHANCEMENT

| Gap | Impact | Fix |
|-----|--------|-----|
| **Haptics not wired** | No tactile feedback on phase change | Wire `expo-haptics` to rhythm engine |
| **Permissions UX** | Raw permission requests | Graceful flow with rationale |
| **Background sync** | Cue data stale when app closed | `expo-background-fetch` + Cue sync |
| **Deep links** | Push can't open specific screens | `expo-linking` + route mapping |
| **Offline support** | Room fails offline | Cache last room state, queue actions |

### ❌ MISSING ENTIRELY (From Philosophy)

| Missing Feature | Philosophy Layer | Effort |
|-----------------|------------------|--------|
| **Haptic feedback system** | Layer 1 | Medium |
| **Push + deep links** | Layer 5 | High |
| **Background sync** | Layer 4 | High |
| **Permissions flow** | Layer 1 | Medium |
| **Offline room cache** | Layer 3 | Medium |
| **Accessibility (VoiceOver/TalkBack)** | Layer 1 | Medium |

---

## 3. STRATEGIC POSITIONING

### Mobile is a Companion, Not a Clone

| Web | Mobile |
|-----|--------|
| Full layouts, mouse/keyboard | Native gestures, haptics, PiP |
| Room + Teams + Profile + Settings | Room + Today + Feed + Profile |
| Mouse hover, right-click | Long press, swipe, edge gestures |
| SEO, SSR, URL sharing | Deep links, app store, offline |
| 1500+ concurrent target | Personal + small rooms |

### The Wedge
**Mobile = Room + Today + Feed.** That's it. No Teams, no Settings, no Learn, no Messages. Just the three things you need away from desk.

---

## 4. MONETIZATION PHILOSOPHY

**Mobile is free.** Always.

| Revenue Source | Mobile Role |
|----------------|-------------|
| Stager Pro | Mobile push → Stager deep link → upgrade |
| Team subscriptions | Mobile push → TeamOffice → upgrade |
| Backstage Personal | Mobile push → Backstage sync status |

**Mobile is the funnel, not the product.**

---

## 5. GO-TO-MARKET: THE COMPANION WEDGE

### Target: Builders Who Leave Their Desk
- iPad coders (VS Code on iPad)
- Laptop-open-in-meeting devs
- Commuters reviewing captures
- Parents coding during naps

### Launch Sequence
1. **Month 1:** Room + Today + Feed (current) + haptics + permissions
2. **Month 2:** PiP polish + background sync + push notifications
3. **Month 3:** Deep links → Stager task review, TeamOffice
4. **Month 4:** TestFlight beta → 50 users → measure retention
5. **Month 5:** App Store / Play Store launch

### Success Criteria (Beta)
| Metric | Threshold |
|--------|-----------|
| Day-7 retention | ≥40% |
| Avg sessions/week | ≥5 |
| Room join success rate | ≥95% |
| Push → deep link conversion | ≥60% |
| "Would recommend" | ≥9/10 |

---

## 6. QUESTIONS FOR ALIGNMENT

### Product Strategy
1. **iPad vs iPhone** — Prioritize iPad (coders) or iPhone (commuters)?
2. **Android vs iOS** — Launch both simultaneously or iOS first?
3. **Expo SDK 58** — Stay on preview or wait for stable?

### Technical Decisions
2. **Navigation** — Expo Router (file-based) or React Navigation?
3. **State** — TanStack Query (shared with web) or React Query + native persistence?
3. **Video** — LiveKit React Native SDK (current) or custom native module?

### Monetization Timing
5. **Mobile-free forever?** — Yes, confirmed.
6. **Stager push → upgrade** — When Stager Pro exists.

---

## 7. SUCCESS DEFINITION (The North Star)

> **In 6 months, Mobile is the answer to: "How do I stay in my rhythm when I'm not at my desk?"**

**Measured by:**
- 2000+ installs (TestFlight + Play Console)
- 500+ weekly active users
- 50%+ Day-7 retention
- 60%+ push → deep link conversion
- 90%+ room join success rate
- Zero "mobile feels like web" complaints

---

**This philosophy document is the contract. The implementation plan must trace every native API, every haptic, every push notification back to these principles. Any feature that feels "web on mobile" gets cut.**

---

**NEXT: Upon your approval, I'll create `IMPLEMENTATION_mobile.md` with:**
- Phase 1: Haptics + Permissions + Liquid Glass polish
- Phase 2: Push notifications + Deep links + Background sync
- Phase 3: Offline support + Accessibility + App Store prep
- Every task mapped to Philosophy Layer
- Verification cycle per phase