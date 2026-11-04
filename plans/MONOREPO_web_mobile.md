# SkillHive Monorepo: Web + Mobile Deep Plan

**Scope:** Web (Vite + React) + Mobile (Expo) — Teams stays separate
**Strategy:** Web = layout source; Mobile = native consumer; Shared = contracts + core + brand + client
**Principle:** Platform APIs → `native`/`ui`; Pure logic → `core`/`contracts`; Apps import only from shared

---

## 1. Monorepo Structure

```
skillhiive/
├── apps/
│   ├── web/                    # Vite + React 19 + TanStack Router
│   │   ├── src/
│   │   │   ├── routes/         # TanStack Router routes
│   │   │   ├── pages/          # Page components (Home, Room, Profile, etc.)
│   │   │   ├── layouts/        # Layout wrappers (MainLayout, AuthLayout)
│   │   │   ├── components/     # Web-specific compositions
│   │   │   ├── hooks/          # Web-specific hooks (useWindow, useKeyboard)
│   │   │   ├── providers/      # ThemeProvider, AuthProvider
│   │   │   ├── styles/         # Global CSS, Tailwind entry
│   │   │   ├── main.tsx        # Entry point
│   │   │   └── App.tsx         # Root component
│   │   ├── index.html
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   └── tailwind.config.ts
│   │
│   └── mobile/                 # Expo 58 + React Native 0.78
│       ├── src/
│       │   ├── screens/        # Screen components (RoomScreen, HomeScreen, etc.)
│       │   ├── navigation/     # Expo Router / React Navigation
│       │   ├── components/     # Mobile-specific compositions
│       │   │   ├── native/     # RN-specific wrappers
│       │   │   └── shared/     # Compositions using @skillhiive/core + @skillhiive/native
│       │   ├── hooks/          # Mobile-specific hooks (useHaptics, usePermissions)
│       │   ├── providers/      # ThemeProvider, AuthProvider (RN variants)
│       │   ├── styles/         # NativeWind / StyleSheet utilities
│       │   ├── app.tsx         # Expo entry
│       │   └── _layout.tsx     # Root layout
│       ├── app.json            # Expo config
│       ├── package.json
│       │   ├── tsconfig.json
│       │   └── metro.config.js
│
├── packages/
│   ├── ui/                     # React DOM primitives (web only)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── Button/
│   │   │   │   ├── Card/
│   │   │   │   ├── Avatar/
│   │   │   │   ├── Modal/
│   │   │   │   ├── Input/
│   │   │   │   ├── Dropdown/
│   │   │   │   ├── Tooltip/
│   │   │   │   ├── Toast/
│   │   │   │   ├── WorkRoomCard/
│   │   │   │   ├── Heatmap/
│   │   │   │   ├── RhythmBar/
│   │   │   │   ├── FocusTimer/
│   │   │   │   ├── MemberDesk/
│   │   │   │   ├── CubicleOverlay/
│   │   │   │   ├── TopBar/
│   │   │   │   ├── ControlBar/
│   │   │   │   ├── AnnouncementBanner/
│   │   │   │   ├── BreakRoom/
│   │   │   │   ├── NotesDrawer/
│   │   │   │   ├── RitualsPanel/
│   │   │   │   ├── DNDSettings/
│   │   │   │   ├── TeamCalendar/
│   │   │   │   └── index.ts
│   │   │   ├── hooks/
│   │   │   │   ├── useWindow.ts
│   │   │   │   ├── useKeyboard.ts
│   │   │   │   ├── useClipboard.ts
│   │   │   │   ├── useDragDrop.ts
│   │   │   │   ├── useResizeObserver.ts
│   │   │   │   └── index.ts
│   │   │   ├── utils/
│   │   │   │   ├── classNames.ts
│   │   │   │   ├── focusTrap.ts
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vitest.config.ts
│   │
│   ├── native/                 # React Native primitives (mobile only)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── Pressable/
│   │   │   │   ├── View/
│   │   │   │   ├── Text/
│   │   │   │   ├── Image/
│   │   │   │   ├── ScrollView/
│   │   │   │   ├── FlatList/
│   │   │   │   ├── SafeAreaView/
│   │   │   │   ├── KeyboardAvoidingView/
│   │   │   │   ├── Modal/
│   │   │   │   ├── ActivityIndicator/
│   │   │   │   ├── RefreshControl/
│   │   │   │   ├── GestureHandler/
│   │   │   │   ├── BlurView/
│   │   │   │   ├── GlassView/
│   │   │   │   ├── PiP/
│   │   │   │   └── index.ts
│   │   │   ├── hooks/
│   │   │   │   ├── useHaptics.ts
│   │   │   │   ├── usePermissions.ts
│   │   │   │   ├── useSafeArea.ts
│   │   │   │   ├── useKeyboard.ts
│   │   │   │   ├── useOrientation.ts
│   │   │   │   ├── useGestures.ts
│   │   │   │   ├── useBackgroundSync.ts
│   │   │   │   ├── usePushTokens.ts
│   │   │   │   ├── useBiometrics.ts
│   │   │   │   ├── useOrientation.ts
│   │   │   │   └── index.ts
│   │   │   ├── utils/
│   │   │   │   ├── vibrationPatterns.ts
│   │   │   │   ├── platform.ts
│   │   │   │   ├── styleSheet.ts
│   │   │   │   └── index.ts
│   │   │   ├── styles/
│   │   │   │   ├── global.ts
│   │   │   │   ├── spacing.ts
│   │   │   │   ├── shadows.ts
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vitest.config.ts
│   │
│   ├── core/                   # Platform-agnostic business logic
│   │   ├── src/
│   │   │   ├── rhythm/         # Rhythm engine (shared)
│   │   │   │   ├── engine.ts           # computePhase, transitionPhase
│   │   │   │   ├── phases.ts           # Phase types, durations
│   │   │   │   ├── config.ts           # Default configs
│   │   │   │   ├── engine.web.ts       # Web-specific timer impl
│   │   │   │   ├── engine.native.ts    # Native timer impl (if needed)
│   │   │   │   └── index.ts
│   │   │   ├── auth/
│   │   │   │   ├── types.ts            # User, Session, AuthState
│   │   │   │   ├── helpers.ts          # Token refresh, validation
│   │   │   │   └── index.ts
│   │   │   ├── room/
│   │   │   │   ├── types.ts            # Room, Participant, Phase, Cubicle
│   │   │   │   ├── helpers.ts          # Room helpers
│   │   │   │   └── index.ts
│   │   │   ├── timer/
│   │   │   │   ├── format.ts           # formatDuration, parseDuration
│   │   │   │   ├── countdown.ts        # Countdown logic
│   │   │   │   └── index.ts
│   │   │   ├── validation/
│   │   │   │   ├── schemas.ts          # Re-exports from contracts
│   │   │   │   ├── helpers.ts          # Validation helpers
│   │   │   │   └── index.ts
│   │   │   ├── datetime/
│   │   │   │   ├── format.ts           # formatRelative, timezone
│   │   │   │   ├── parsing.ts          # parseISO, parseDuration
│   │   │   │   └── index.ts
│   │   │   ├── errors/
│   │   │   │   ├── AppError.ts
│   │   │   │   ├── Result.ts
│   │   │   │   └── index.ts
│   │   │   ├── storage/
│   │   │   │   ├── keys.ts             # Storage key constants
│   │   │   │   ├── interface.ts        # Storage interface
│   │   │   │   ├── storage.web.ts      # localStorage impl
│   │   │   │   ├── storage.native.ts   # AsyncStorage impl
│   │   │   │   └── index.ts
│   │   │   ├── hooks/                  # Platform-agnostic hooks (interface only)
│   │   │   │   ├── usePermissions.ts   # Interface + platform entry points
│   │   │   │   ├── useHaptics.ts       # Interface + platform entry points
│   │   │   │   ├── useBackgroundSync.ts # Interface + platform entry points
│   │   │   │   ├── useKeyboard.ts      # Interface + platform entry points
│   │   │   │   ├── usePermissions.ts   # Interface + platform entry points
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vitest.config.ts
│   │
│   ├── contracts/              # Zod schemas = source of truth
│   │   ├── src/
│   │   │   ├── api/
│   │   │   │   ├── room.ts           # Room, Participant, Phase, Cubicle
│   │   │   │   ├── user.ts           # User, Profile, AuthState
│   │   │   │   ├── team.ts           # Team, TeamMember, TeamRhythm
│   │   │   │   ├── auth.ts           # Login, Register, Token schemas
│   │   │   │   ├── sync.ts           # Push/Pull payloads
│   │   │   │   ├── orchestration.ts  # Task, Brief, Diff, Approval
│   │   │   │   └── index.ts
│   │   │   ├── websocket/
│   │   │   │   ├── livekit.ts        # LiveKit events, tokens
│   │   │   │   ├── supabase.ts       # Realtime channels, payloads
│   │   │   │   └── index.ts
│   │   │   ├── forms/
│   │   │   │   ├── auth.ts           # Login, register, password schemas
│   │   │   │   ├── room.ts           # Room create, join schemas
│   │   │   │   ├── team.ts           # Team create, invite schemas
│   │   │   │   └── index.ts
│   │   │   ├── zod.ts              # Shared Zod config
│   │   │   └── index.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vitest.config.ts
│   │
│   ├── client/                 # API clients (platform-agnostic)
│   │   ├── src/
│   │   │   ├── supabase/
│   │   │   │   ├── client.ts         # Supabase client factory
│   │   │   │   ├── queries.ts        # TanStack Query keys + hooks
│   │   │   │   ├── mutations.ts      # TanStack Mutation hooks
│   │   │   │   ├── realtime.ts       # Realtime channel helpers
│   │   │   │   └── index.ts
│   │   │   ├── livekit/
│   │   │   │   ├── client.ts         # LiveKit client factory
│   │   │   │   ├── token.ts          # Token fetching
│   │   │   │   ├── room.ts           # Room connection helpers
│   │   │   │   └── index.ts
│   │   │   ├── api/
│   │   │   │   ├── client.ts         # Generic API client
│   │   │   │   ├── endpoints.ts      # Endpoint definitions
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vitest.config.ts
│   │
│   ├── brand/                  # Design tokens (single source)
│   │   ├── src/
│   │   │   ├── tokens/
│   │   │   │   ├── colors.ts         # Stage lighting palette
│   │   │   │   ├── spacing.ts        # 4, 8, 16, 24, 32, 48
│   │   │   │   ├── radii.ts          # sm:8, md:12, lg:16, xl:24
│   │   │   │   ├── typography.ts     # Font families, sizes, weights
│   │   │   │   ├── shadows.ts        # Elevation tokens
│   │   │   │   ├── motion.ts         # Duration, easing
│   │   │   │   ├── breakpoints.ts    # Mobile, tablet, desktop
│   │   │   │   ├── zIndex.ts         # Layering system
│   │   │   │   └── index.ts
│   │   │   ├── web/
│   │   │   │   ├── cssVariables.ts   # CSS custom properties
│   │   │   │   ├── tailwind.ts       # Tailwind config extension
│   │   │   │   └── index.ts
│   │   │   ├── native/
│   │   │   │   ├── styleSheet.ts     # StyleSheet.create utilities
│   │   │   │   ├── colorScheme.ts    # Light/dark handling
│   │   │   │   └── index.ts
│   │   │   ├── hooks/
│   │   │   │   ├── useTokens.ts      # Web hook
│   │   │   │   ├── useTokens.native.ts # Native hook
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vitest.config.ts
│   │
│   └── i18n/                   # Translations (future)
│       ├── src/
│       │   ├── locales/
│       │   │   ├── en.json
│       │   │   └── index.ts
│       │   ├── hooks/
│       │   │   ├── useTranslation.ts
│   │   │   │   ├── useTranslation.native.ts
│       │   │   │   └── index.ts
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
│
├── turbo.json
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── README.md
```

---

## 2. Platform-Specific Entry Points (The "Interface" Pattern)

### Core Hooks with Platform Resolution

```typescript
// packages/core/hooks/usePermissions.ts (interface)
export interface PermissionStatus {
  camera: 'granted' | 'denied' | 'prompt';
  microphone: 'granted' | 'denied' | 'prompt';
  notifications: 'granted' | 'denied' | 'prompt';
}

export function usePermissions(): PermissionStatus {
  // Platform-specific implementation injected via package exports
  throw new Error('Platform implementation required - import from @skillhiive/core/hooks/usePermissions');
}

// packages/core/hooks/usePermissions.web.ts (web impl)
import { useEffect, useState } from 'react';
import type { PermissionStatus } from './usePermissions';

export function usePermissions(): PermissionStatus {
  const [status, setStatus] = useState<PermissionStatus>({
    camera: 'prompt',
    microphone: 'prompt',
    notifications: 'prompt',
  });

  useEffect(() => {
    const check = async () => {
      try {
        const [cam, mic, notif] = await Promise.all([
          navigator.permissions.query({ name: 'camera' }),
          navigator.permissions.query({ name: 'microphone' }),
          navigator.permissions.query({ name: 'notifications' }),
        ]);
        setStatus({
          camera: cam.state,
          microphone: mic.state,
          notifications: notif.state,
        });
      } catch {
        // Fallback for browsers without permissions API
        setStatus({ camera: 'prompt', microphone: 'prompt', notifications: 'prompt' });
      }
    };
    check();
  }, []);

  return status;
}

// packages/core/hooks/usePermissions.native.ts (mobile impl)
import { useEffect, useState } from 'react';
import * as Permissions from 'expo-permissions';
import type { PermissionStatus } from './usePermissions';

export function usePermissions(): PermissionStatus {
  const [status, setStatus] = useState<PermissionStatus>({
    camera: 'prompt',
    microphone: 'prompt',
    notifications: 'prompt',
  });

  useEffect(() => {
    const check = async () => {
      try {
        const [cam, mic, notif] = await Promise.all([
          Permissions.getAsync(Permissions.CAMERA),
          Permissions.getAsync(Permissions.AUDIO_RECORDING),
          Permissions.getAsync(Permissions.NOTIFICATIONS),
        ]);
        setStatus({
          camera: cam.status,
          microphone: mic.status,
          notifications: notif.status,
        });
      } catch {
        setStatus({ camera: 'prompt', microphone: 'prompt', notifications: 'prompt' });
      }
    };
    check();
  }, []);

  return status;
}
```

### Package Exports Configuration

```json
// packages/core/package.json
{
  "name": "@skillhiive/core",
  "version": "0.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./hooks/usePermissions": {
      "types": "./hooks/usePermissions.d.ts",
      "import": "./hooks/usePermissions.ts",
      "native": "./hooks/usePermissions.native.ts",
      "default": "./hooks/usePermissions.web.ts"
    },
    "./hooks/useHaptics": {
      "types": "./hooks/useHaptics.d.ts",
      "import": "./hooks/useHaptics.ts",
      "native": "./hooks/useHaptics.native.ts",
      "default": "./hooks/useHaptics.web.ts"
    },
    "./hooks/useKeyboard": {
      "types": "./hooks/useKeyboard.d.ts",
      "import": "./hooks/useKeyboard.ts",
      "native": "./hooks/useKeyboard.native.ts",
      "default": "./hooks/useKeyboard.web.ts"
    },
    "./storage": {
      "types": "./storage/index.d.ts",
      "import": "./storage/index.ts",
      "native": "./storage/storage.native.ts",
      "default": "./storage/storage.web.ts"
    }
  }
}
```

---

## 3. Platform-Specific Logic Mapping

### Web Only (`packages/ui`)

```typescript
// packages/ui/hooks/useWindow.ts
export function useWindow() {
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  useEffect(() => {
    const handler = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return size;
}

// packages/ui/hooks/useKeyboard.ts
export function useKeyboard(shortcuts: Record<string, () => void>) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const key = `${e.metaKey ? 'Meta+' : ''}${e.ctrlKey ? 'Ctrl+' : ''}${e.shiftKey ? 'Shift+' : ''}${e.key}`;
      shortcuts[key]?.();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcuts]);
}

// packages/ui/hooks/useClipboard.ts
export function useClipboard() {
  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };
  return { copy };
}
```

### Mobile Only (`packages/native`)

```typescript
// packages/native/hooks/useHaptics.ts
import * as Haptics from 'expo-haptics';

export function useHaptics() {
  const impact = (style: 'light' | 'medium' | 'heavy') => Haptics.impactAsync(style);
  const notification = (type: 'success' | 'warning' | 'error') => Haptics.notificationAsync(type);
  const selection = () => Haptics.selectionAsync();
  return { impact, notification, selection };
}

// packages/native/hooks/usePermissions.ts
import * as Permissions from 'expo-permissions';

export function usePermissions() {
  const [status, setStatus] = useState<PermissionStatus>({...});
  useEffect(() => {
    const check = async () => {
      const [cam, mic, notif] = await Promise.all([
        Permissions.getAsync(Permissions.CAMERA),
        Permissions.getAsync(Permissions.AUDIO_RECORDING),
        Permissions.getAsync(Permissions.NOTIFICATIONS),
      ]);
      setStatus({ camera: cam.status, microphone: mic.status, notifications: notif.status });
    };
    check();
  }, []);
  return status;
}

// packages/native/hooks/useBackgroundSync.ts
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';

export function useBackgroundSync(taskName: string, callback: () => Promise<void>) {
  useEffect(() => {
    TaskManager.defineTask(taskName, async () => {
      try {
        await callback();
        return BackgroundFetch.BackgroundFetchResult.NewData;
      } catch {
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }
    });
    BackgroundFetch.registerTaskAsync(taskName, { minimumInterval: 15 * 60 });
    return () => BackgroundFetch.unregisterTaskAsync(taskName);
  }, [taskName, callback]);
}
```

### Shared Interface (`packages/core`)

```typescript
// packages/core/hooks/usePermissions.ts (interface only)
export interface PermissionStatus {
  camera: 'granted' | 'denied' | 'prompt';
  microphone: 'granted' | 'denied' | 'prompt';
  notifications: 'granted' | 'denied' | 'prompt';
}

export function usePermissions(): PermissionStatus {
  throw new Error('Platform implementation required');
}

// packages/core/hooks/useHaptics.ts (interface only)
export interface HapticsController {
  impact: (style: 'light' | 'medium' | 'heavy') => Promise<void>;
  notification: (type: 'success' | 'warning' | 'error') => Promise<void>;
  selection: () => Promise<void>;
}

export function useHaptics(): HapticsController {
  throw new Error('Platform implementation required');
}
```

---

## 4. Contracts as Source of Truth

```typescript
// packages/contracts/src/api/room.ts
import { z } from 'zod';

export const PhaseSchema = z.enum(['waiting', 'focusing', 'breaking']);
export type Phase = z.infer<typeof PhaseSchema>;

export const ParticipantSchema = z.object({
  id: z.string(),
  identity: z.string(),
  name: z.string().nullable(),
  isCameraEnabled: z.boolean(),
  isMicrophoneEnabled: z.boolean(),
  isSpeaking: z.boolean(),
  isScreenSharing: z.boolean(),
});
export type Participant = z.infer<typeof ParticipantSchema>;

export const RoomSchema = z.object({
  id: z.string(),
  name: z.string(),
  phase: PhaseSchema,
  participants: z.array(ParticipantSchema),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type Room = z.infer<typeof RoomSchema>;

// Re-exported by @skillhiive/core for convenience
export { Room, Phase, Participant } from './room';
```

---

## 5. Storage Abstraction

```typescript
// packages/core/storage/interface.ts
export interface StorageInterface {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'skillhiive.auth.token',
  USER_PREFERENCES: 'skillhiive.preferences',
  ROOM_HISTORY: 'skillhiive.room.history',
  THEME: 'skillhiive.theme',
} as const;

// packages/core/storage/storage.web.ts
export const webStorage: StorageInterface = {
  getItem: (key) => Promise.resolve(localStorage.getItem(key)),
  setItem: (key, value) => Promise.resolve(localStorage.setItem(key, value)),
  removeItem: (key) => Promise.resolve(localStorage.removeItem(key)),
  clear: () => Promise.resolve(localStorage.clear()),
};

// packages/core/storage/storage.native.ts
import * as SecureStore from 'expo-secure-store';

export const nativeStorage: StorageInterface = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
  clear: () => Promise.resolve(), // SecureStore doesn't support clear all
};
```

---

## 6. Build Configuration

### Turborepo Pipeline

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", "build/**"]
    },
    "typecheck": {
      "dependsOn": ["^typecheck"]
    },
    "test": {
      "dependsOn": ["^test"],
      "outputs": ["coverage/**"]
    },
    "lint": {
      "outputs": []
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  },
  "globalEnv": ["DATABASE_URL", "SUPABASE_URL", "SUPABASE_ANON_KEY", "LIVEKIT_URL", "NIM_API_KEY"]
}
```

### Workspace Configuration

```yaml
# pnpm-workspace.yaml
packages:
  - apps/*
  - packages/*
```

```json
// package.json (root)
{
  "name": "skillhiive",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev:web": "turbo run dev --filter=web",
    "dev:mobile": "turbo run dev --filter=mobile",
    "build": "turbo run build",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "db:push": "turbo run db:push --filter=client"
  },
  "devDependencies": {
    "turbo": "latest",
    "typescript": "latest"
  },
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  }
}
```

---

## 7. Migration Sequence (6 Weeks)

| Week | Phase | Tasks | Validation |
|------|-------|-------|------------|
| **1** | **Foundation** | Create monorepo root, `turbo.json`, `pnpm-workspace.yaml`; extract `contracts` + `brand` + `client` from web | `bun run typecheck` passes; mobile builds with new imports |
| **2** | **Core Logic** | Extract `core` (rhythm, auth, room, timer, storage); add platform entry points | Web + Mobile both build; rhythm engine tests pass |
| **3** | **UI Primitives** | Extract `ui` (DOM components) from web; extract `native` (RN primitives) from mobile | Web imports `@skillhiive/ui`; Mobile imports `@skillhiive/native` |
| **4** | **Mobile Rebuild** | Rebuild mobile screens using `@skillhiive/core` + `@skillhiive/native` + `@skillhiive/contracts` | Mobile room join → video → phases works; PiP works |
| **5** | **Web Cleanup** | Remove duplicated code from web; verify all imports from packages | Web builds; all pages work; bundle size reduced |
| **6** | **Polish & CI** | Add Turbo CI pipeline; contract tests; canary tests; self-host test | All checks green; mobile TestFlight build succeeds |

---

## 8. Import Rules (Enforced by ESLint)

```json
// .eslintrc.js (root)
{
  "rules": {
    "no-restricted-imports": [
      "error",
      {
        "patterns": [
          {
            "group": ["@skillhiive/ui", "@skillhiive/native"],
            "message": "Apps must not import ui/native directly. Use @skillhiive/core hooks instead."
          },
          {
            "group": ["@skillhiive/core/hooks/*"],
            "message": "Import from @skillhiive/core, not deep paths"
          }
        ]
      }
    ]
  }
}
```

**Allowed Import Patterns:**
| App | Allowed Imports |
|-----|-----------------|
| Web | `@skillhiive/ui`, `@skillhiive/core`, `@skillhiive/contracts`, `@skillhiive/client`, `@skillhiive/brand`, `@skillhiive/client` |
| Mobile | `@skillhiive/native`, `@skillhiive/core`, `@skillhiive/contracts`, `@skillhiive/client`, `@skillhiive/brand` |
| Both | `@skillhiive/contracts`, `@skillhiive/core`, `@skillhiive/client`, `@skillhiive/brand` |

---

## 8. Teams Integration (Separate App)

```
skillhiive/
├── apps/
│   ├── web/
│   ├── mobile/
│   └── teams/              # Separate Vite app (or feature flag in web)
│       ├── src/
│       │   ├── pages/      # TeamsPage, TeamOffice, TeamDetail
│       │   ├── components/ # Team-specific compositions
│       │   └── hooks/      # useTeam, useTeamRhythm
│       └── package.json    # Depends on @skillhiive/*
```

**Teams imports from monorepo:**
```json
// apps/teams/package.json
{
  "dependencies": {
    "@skillhiive/ui": "workspace:*",
    "@skillhiive/core": "workspace:*",
    "@skillhiive/contracts": "workspace:*",
    "@skillhiive/client": "workspace:*",
    "@skillhiive/brand": "workspace:*"
  }
}
```

---

## 9. Verification Checklist (Per Week)

| Week | Must Pass |
|------|-----------|
| 1 | `bun run typecheck` ✓; `bun run build` ✓; Mobile builds with new imports |
| 2 | Rhythm engine tests pass ✓; Web + Mobile both build ✓ |
| 3 | Web imports `@skillhiive/ui` ✓; Mobile imports `@skillhiive/native` ✓ |
| 4 | Mobile room join → video → phases ✓; PiP ✓; Haptics ✓ |
| 4 | Web all pages work ✓; Bundle size ≤ previous ✓ |
| 5 | All CI checks green ✓; Contract tests pass ✓; Canary tests pass ✓ |

---

## 9. Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Room.tsx (3000 lines) extraction breaks web | Extract rhythm logic first (small, tested); UI components last |
| Mobile rebuild takes too long | Reuse web layouts as reference; copy-paste-adapt |
| Platform entry points confusing | Document pattern; add ESLint rule |
| Contract drift | `bun run contract-test` in CI |
| Bundle size increase | Analyze with `vite-bundle-analyzer`; tree-shake |

---

## 10. Next Steps

1. **You approve this plan** → I create Week 1 task breakdown with exact file moves
2. **Week 1 sprint** → Monorepo root + `contracts` + `brand` + `client` extraction
3. **Daily sync** → Blockers, decisions, progress
3. **Week 2 kickoff** → `core` extraction (rhythm engine first)

**Ready to proceed with Week 1 task breakdown?**