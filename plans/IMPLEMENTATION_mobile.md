# SkillHive Mobile — Implementation Plan

**Project:** `mobile` (Expo 58 + React Native 0.78 + NativeWind)
**Role:** Companion App — Room + Today + Feed with native capabilities
**Strategy:** Native-first companion; Web = layout source; Monorepo shared logic
**Constraint:** Room + Today + Feed only; No Teams, Settings, Learn, Messages

---

## PHASE 1: NATIVE POLISH (Week 1-2) — "Feel Native"

*Wire up haptics, permissions, liquid glass; make every interaction tactile.*

### 1.1 Haptic Feedback System (4 hrs)
**Files:** `hooks/useHaptics.ts` (new), `hooks/useHaptics.web.ts` (no-op), rhythm integration
**Implementation:**
```typescript
// hooks/useHaptics.ts
import * as Haptics from 'expo-haptics';

export function useHaptics() {
  const impact = (style: 'light' | 'medium' | 'heavy') => Haptics.impactAsync(style);
  const notification = (type: 'success' | 'warning' | 'error') => Haptics.notificationAsync(type);
  const selection = () => Haptics.selectionAsync();
  return { impact, notification, selection };
}
```
**Integration Points:**
- `useRhythmEngine` → `haptics.impact('medium')` on phase change (focus ↔ break)
- `useToday` → `haptics.notification('success')` on task complete
- `useRoom` → `haptics.selection()` on cubicle join/leave
- Button presses → `haptics.impact('light')`
**Philosophy Layer:** 1 (Native Atmosphere)
**Risk:** Low. Expo-haptics is stable.

### 1.2 Permissions Flow Redesign (4 hrs)
**Files:** `hooks/usePermissions.ts`, `components/PermissionsModal.tsx`, room join flow
**Current:** Raw `Permissions.askAsync()` calls
**New:** Graceful flow with rationale
```typescript
// hooks/usePermissions.ts
export function usePermissions() {
  const [status, setStatus] = useState<PermissionStatus>({...});
  
  const request = async (type: 'camera' | 'microphone' | 'notifications') => {
    const rationale = {
      camera: 'Video lets others see you in the room',
      microphone: 'Audio lets you talk during breaks',
      notifications: 'Get rhythm alerts and ally updates',
    };
    
    const granted = await showRationaleAndAsk(rationale[type], type);
    setStatus(prev => ({ ...prev, [type]: granted ? 'granted' : 'denied' }));
    return granted;
  };
  
  return { status, request };
}
```
**UI:** Modal with icon + rationale → "Allow" / "Not Now" → graceful degradation
**Philosophy Layer:** 1 (Atmosphere) — Respectful, not demanding
**Risk:** Medium. iOS/Android permission UX differs.

### 1.3 Liquid Glass Polish (3 hrs)
**Files:** `app/main/tabs.tsx`, `components/GlassTabBar.tsx`
**Current:** Working but can be smoother
**Enhancements:**
- Spring config tuning (damping: 220, stiffness: 4020)
- Tab press haptic (`selection()`)
- Reduced motion respect (`prefersReducedMotion`)
- Tab bar hides on scroll down, shows on scroll up
**Philosophy Layer:** 1 (Native Atmosphere)
**Risk:** Low. Already working.

### 1.4 Permissions + Haptics Integration in Room (3 hrs)
**Files:** `app/rooms/[roomName].tsx`
**Integration:**
- Room join → request camera/mic if not granted → graceful fallback
- Phase change → `haptics.impact('medium')` + `AudioServicesPlaySystemSound` (optional)
- Cubicle join → `haptics.selection()`
- Leave room → `haptics.notification('warning')`
**Philosophy Layer:** 1 (Native Atmosphere)
**Risk:** Low. Direct integration.

---

## PHASE 2: PUSH + DEEP LINKS + BACKGROUND SYNC (Week 2-3) — "Stay Connected"

*Push notifications that deep-link to the right screen; background sync keeps data fresh.*

### 2.1 Push Notification Infrastructure (6 hrs)
**Files:** `hooks/usePushNotifications.ts`, `services/push.ts`, `app/_layout.tsx`
**Architecture:**
```typescript
// services/push.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null;
  
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    const { status: newStatus } = await Notifications.requestPermissionsAsync();
    if (newStatus !== 'granted') return null;
  }
  
  const token = (await Notifications.getExpoPushTokenAsync()).data;
  
  // Register with backend (Backstage)
  await fetch(`${BACKSTAGE_URL}/v1/push/device/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
    body: JSON.stringify({ device_token: token, platform: 'ios' /* or android */, user_id: currentUser.id }),
  });
  
  return token;
}

// Handle incoming notifications
Notifications.addNotificationReceivedListener(notification => {
  // App in foreground - handle silently or show in-app banner
});

Notifications.addNotificationResponseReceivedListener(response => {
  // User tapped notification - deep link
  const url = response.notification.request.content.data?.deepLink;
  if (url) Linking.openURL(url);
});
```
**Backend:** Backstage `/v1/push/device/register` + FCM/APNs gateway
**Philosophy Layer:** 5 (Ecosystem Integration)
**Risk:** High. FCM/APNs cert management, token rotation.

### 2.2 Deep Link Routing (4 hrs)
**Files:** `app/_layout.tsx`, `hooks/useDeepLinks.ts`, `app/rooms/[roomName].tsx`, `app/main/index.tsx`
**Deep Link Map:**
| Push Event | Deep Link | Target Screen |
|------------|-----------|---------------|
| `task_completed` | `stager://task/{taskId}` | Stager (if installed) / Web |
| `approval_needed` | `stager://review/{taskId}` | Stager diff review |
| `team_rhythm_start` | `skillhiive://team/{teamId}` | TeamOffice |
| `team_task_assigned` | `stager://task/{taskId}` | Stager task review |
| `ally_capture` | `skillhiive://feed?capture={id}` | Feed screen |
| `rhythm_phase_change` | `skillhiive://room/{roomId}` | Room screen |
**Implementation:**
```typescript
// app/_layout.tsx
import { Linking } from 'expo-linking';

const prefix = Linking.createURL('/'); // skillhiive://

const linking = {
  prefixes: ['skillhiive://', 'stager://'],
  config: {
    screens: {
      Room: 'room/:roomId',
      Feed: 'feed',
      TeamOffice: 'team/:teamId',
      Today: 'today',
      Profile: 'profile',
      StagerTask: 'stager/task/:taskId',
      StagerReview: 'stager/review/:taskId',
    },
  },
};
```
**Philosophy Layer:** 5 (Ecosystem Integration)
**Risk:** Medium. iOS Universal Links / Android App Links config.

### 2.3 Background Sync (6 hrs)
**Files:** `hooks/useBackgroundSync.ts`, `services/backgroundSync.ts`, `app/_layout.tsx`
**Architecture:**
```typescript
// services/backgroundSync.ts
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Notifications from 'expo-notifications';

const CUE_SYNC_TASK = 'cue-sync';

TaskManager.defineTask(CUE_SYNC_TASK, async () => {
  try {
    // 1. Get local Cue data (if Cue installed) or sync with Backstage
    const cueData = await getLocalCueData();
    
    // 2. Push to Backstage
    await fetch(`${BACKSTAGE_URL}/v1/push`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(cueData),
    });
    
    // 3. Pull updates
    const updates = await fetch(`${BACKSTAGE_URL}/v1/pull?since=${lastSync}`);
    await applyUpdates(updates);
    
    // 4. Check for overnight orchestration results
    const results = await checkOrchestrationResults();
    if (results.length > 0) {
      await Notifications.scheduleNotificationAsync({
        content: { title: 'While you were away', body: `${results.length} tasks completed` },
        trigger: null, // immediate
        data: { deepLink: 'stager://today' },
      });
    }
    
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Register in app/_layout.tsx
BackgroundFetch.registerTaskAsync(CUE_SYNC_TASK, {
  minimumInterval: 15 * 60, // 15 minutes
  stopOnTerminate: false,
  startOnBoot: true,
});
```
**Philosophy Layer:** 4 (Sync & Continuity)
**Risk:** High. Background fetch limits (iOS: ~15 min min interval, Android: doze mode).

---

## PHASE 3: OFFLINE + ACCESSIBILITY + STORE PREP (Week 3-4) — "Production Ready"

### 3.1 Offline Room Cache (4 hrs)
**Files:** `hooks/useRoomCache.ts`, `services/roomCache.ts`
**Strategy:**
- Cache last 5 joined rooms (room config, participant list)
- On app launch → show cached room list instantly → join → hydrate live
- Offline indicator in room header
- Queue actions (captures, notes) → flush on reconnect
**Philosophy Layer:** 3 (Core Features)
**Risk:** Medium. LiveKit reconnection logic.

### 3.2 Accessibility (VoiceOver/TalkBack) (4 hrs)
**Files:** All screen components
**Checklist:**
- [ ] All interactive elements: `accessibilityLabel`, `accessibilityRole`, `accessibilityHint`
- [ ] Focus order logical (tab order)
- [ ] Color contrast ≥ 4.5:1 (already via design tokens)
- [ ] Dynamic Type support (font scaling)
- [ ] VoiceOver rotor actions (custom actions for room controls)
- [ ] TalkBack gestures (swipe navigation)
- [ ] Announce phase changes (`accessibilityLiveRegion="polite"`)
**Philosophy Layer:** 1 (Native Atmosphere)
**Risk:** Low. React Native accessibility APIs are mature.

### 3.2 App Store / Play Store Prep (6 hrs)
**Files:** `app.json`, `eas.json`, `credentials/`, store assets
**Checklist:**
- [ ] `app.json` — bundle identifier, version, build number, permissions
- [ ] `eas.json` — build profiles (development, preview, production)
- [ ] App icons (all sizes: 1024x1024, 180x180, etc.)
- [ ] Splash screen (launch image)
- [ ] Privacy policy URL
- [ ] App Store Connect / Play Console setup
- [ ] TestFlight / Internal Testing track
- [ ] Privacy manifest (iOS 17+)
- [ ] Data safety form (Play Console)
**Philosophy Layer:** 5 (Ecosystem)
**Risk:** Low. Standard process.

---

## TECHNICAL DEBT: ACCEPTED (Not Blocking)

| Item | Reason | Revisit |
|------|--------|---------|
| No Android-specific PiP optimizations | iOS first | Month 2 |
| No widget (iOS) / tile (Android) | Later | Month 3 |
| No Apple Watch / Wear OS | Niche | Never |
| No Share Extension | Low priority | Month 3 |
| No Siri Shortcuts / App Actions | Niche | Never |

---

## RISK MITIGATION

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Expo SDK 58 preview breaks | Medium | High | Pin to stable; test weekly |
| Push notification delivery fails | Medium | High | Fallback to in-app notifications |
| Background fetch killed by OS | High | Medium | Local-first; sync on foreground |
| LiveKit RN SDK breaks | Low | Critical | Pin version; test on device weekly |
| App Store rejection | Low | High | Follow guidelines; appeal process |
| Deep link not opening app | Medium | High | Test Universal Links / App Links daily |

---

## DEPENDENCIES ON OTHER REPOS

| Repo | What Mobile Needs | When |
|------|-------------------|------|
| **Monorepo** | `@skillhiive/core`, `@skillhiive/contracts`, `@skillhiive/client`, `@skillhiive/brand`, `@skillhiive/native` | **Phase 1** |
| **Backstage** | Push gateway (`/v1/push/device/register`), orchestration results | Phase 2 |
| **Stager** | Deep link targets (`stager://task/*`, `stager://review/*`) | Phase 2 |
| **Web** | Shared rhythm engine, contracts, design tokens | Phase 1 |
| **Cue** | Local data sync (background fetch) | Phase 2 |

---

## DEFINITION OF DONE (Per Phase)

| Phase | Done When |
|-------|-----------|
| 1 | Haptics on every interaction; permissions modal graceful; Liquid Glass 60fps |
| 2 | Push received → deep link opens correct screen; background sync runs daily |
| 3 | App works offline (cached room); VoiceOver/TalkBack passes; TestFlight build passes |

---

## QUESTIONS RESOLVED

| # | Question | Decision |
|---|----------|----------|
| 1 | iPad vs iPhone | **iPad first** (coders), iPhone responsive |
| 2 | Android vs iOS | **iOS first** (TestFlight), Android Month 2 |
| 3 | Expo Router vs React Navigation | **Expo Router** (file-based, deep links native) |
| 4 | State management | **TanStack Query** (shared with web) + `expo-secure-store` |
| 5 | Video SDK | **LiveKit React Native** (current, pinned) |

---

## NEXT STEPS

1. **You approve this plan** → I create task breakdown with file-level details
2. **Week 1 sprint** → Phase 1: Haptics, Permissions, Liquid Glass polish
3. **Daily sync** → Blockers, decisions, progress
4. **Phase 2 kickoff** → Only after Phase 1 native polish verified on device

**Ready to proceed with Phase 1 task breakdown?**