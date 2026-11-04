import { describe, it, expect } from "vitest";
import {
  CuePushBodySchema,
  CuePushResponseSchema,
  CuePullResponseSchema,
  SyncStatusSchema,
  SyncConfigSchema,
  type CuePushBody,
  type CuePushResponse,
} from "./sync";

describe("Sync Contracts", () => {
  const validPushBody = {
    pushId: "550e8400-e29b-41d4-a716-446655440000",
    userId: "550e8400-e29b-41d4-a716-446655440001",
    deviceId: "550e8400-e29b-41d4-a716-446655440002",
    createdAt: "2024-01-15T10:00:00.000Z",
    timeEntries: [
      {
        id: "te_123",
        projectId: "proj_123",
        projectName: "My Project",
        startedAt: "2024-01-15T09:00:00.000Z",
        endedAt: "2024-01-15T10:00:00.000Z",
        durationSeconds: 3600,
        source: "wakatime",
        metadata: { language: "TypeScript" },
      },
    ],
    focusSessions: [
      {
        id: "550e8400-e29b-41d4-a716-446655440003",
        projectId: "550e8400-e29b-41d4-a716-446655440004",
        taskText: "Implement auth",
        estimateMinutes: 60,
        durationSeconds: 3600,
        interrupted: false,
        completedAt: "2024-01-15T10:00:00.000Z",
      },
    ],
    sessionNotes: [
      {
        id: "550e8400-e29b-41d4-a716-446655440005",
        projectId: "550e8400-e29b-41d4-a716-446655440004",
        ritualType: "checkin",
        body: "Starting work on auth",
        blockers: null,
        actualMinutes: null,
        createdAt: "2024-01-15T09:00:00.000Z",
      },
    ],
    projects: [
      {
        id: "550e8400-e29b-41d4-a716-446655440004",
        name: "Auth System",
        description: "Authentication system",
        color: "#fffd01",
        createdAt: "2024-01-15T08:00:00.000Z",
      },
    ],
    deviceInfo: {
      platform: "macos",
      arch: "arm64",
      version: "1.0.0",
      hostname: "MacBook-Pro",
    },
  };

  it("validates valid cue push body", () => {
    const result = CuePushBodySchema.safeParse(validPushBody);
    expect(result.success).toBe(true);
  });

  it("validates push response success", () => {
    const response = {
      ok: true,
      pushId: "550e8400-e29b-41d4-a716-446655440000",
      processedAt: "2024-01-15T10:00:01.000Z",
      conflicts: [],
      errors: [],
    };
    const result = CuePushResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it("validates push response with conflicts", () => {
    const response = {
      ok: true,
      pushId: "550e8400-e29b-41d4-a716-446655440000",
      processedAt: "2024-01-15T10:00:01.000Z",
      conflicts: [
        {
          type: "focusSession" as const,
          localId: "session_123",
          remoteId: "session_456",
          resolution: "local-wins" as const,
        },
      ],
      errors: [],
    };
    const result = CuePushResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it("validates pull response", () => {
    const response = {
      ok: true,
      serverTime: "2024-01-15T10:00:00.000Z",
      timeEntries: [],
      focusSessions: [],
      sessionNotes: [],
      projects: [],
      deletedIds: {
        timeEntries: [],
        focusSessions: [],
        sessionNotes: [],
        projects: [],
      },
    };
    const result = CuePullResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it("validates sync status", () => {
    const status = {
      userId: "550e8400-e29b-41d4-a716-446655440001",
      lastPushAt: "2024-01-15T10:00:00.000Z",
      lastPullAt: "2024-01-15T09:45:00.000Z",
      lastSuccessfulSyncAt: "2024-01-15T10:00:00.000Z",
      pendingPushCount: 0,
      pendingPullCount: 0,
      lastError: null,
      isSyncing: false,
    };
    const result = SyncStatusSchema.safeParse(status);
    expect(result.success).toBe(true);
  });

  it("validates sync config", () => {
    const config = {
      userId: "550e8400-e29b-41d4-a716-446655440001",
      autoPushEnabled: true,
      autoPullEnabled: true,
      pushIntervalMinutes: 15,
      pullIntervalMinutes: 15,
      wifiOnly: false,
      batterySaverMode: false,
    };
    const result = SyncConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });
});