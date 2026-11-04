import { z } from "zod";
import {
  isoTimestamp,
  nonEmptyString,
  optionalNonEmptyString,
  nonNegativeInt,
  branded,
  jsonValue,
} from "../zod";

/** Cue push body (from Cue CLI to backend) */
export const CuePushBodySchema = z.object({
  /** Unique identifier for this push */
  pushId: branded("PushId"),
  /** User ID from Supabase auth */
  userId: branded("UserId"),
  /** Device ID (hardware-bound) */
  deviceId: branded("DeviceId"),
  /** Timestamp when push was created */
  createdAt: isoTimestamp,
  /** Time tracker entries */
  timeEntries: z.array(
    z.object({
      id: nonEmptyString,
      projectId: optionalNonEmptyString,
      projectName: nonEmptyString,
      startedAt: isoTimestamp,
      endedAt: isoTimestamp,
      durationSeconds: nonNegativeInt,
      source: z.enum(["wakatime", "hackatime", "manual"]),
      metadata: z.record(jsonValue).optional(),
    })
  ),
  /** Focus sessions */
  focusSessions: z.array(
    z.object({
      id: branded("SessionId"),
      projectId: branded("ProjectId").nullable(),
      taskText: optionalNonEmptyString,
      estimateMinutes: z.number().int().nonnegative().nullable(),
      durationSeconds: nonNegativeInt,
      interrupted: z.boolean().default(false),
      completedAt: isoTimestamp,
    })
  ),
  /** Session notes */
  sessionNotes: z.array(
    z.object({
      id: branded("NoteId"),
      projectId: branded("ProjectId").nullable(),
      ritualType: z.enum(["checkin", "checkout", "capture", "weekly_review"]),
      body: nonEmptyString,
      blockers: optionalNonEmptyString,
      actualMinutes: z.number().int().nonnegative().nullable(),
      createdAt: isoTimestamp,
    })
  ),
  /** Projects */
  projects: z.array(
    z.object({
      id: branded("ProjectId"),
      name: nonEmptyString,
      description: optionalNonEmptyString,
      color: optionalNonEmptyString,
      createdAt: isoTimestamp,
    })
  ),
  /** Device info */
  deviceInfo: z.object({
    platform: z.enum(["macos", "linux", "windows"]),
    arch: z.enum(["x64", "arm64"]),
    version: nonEmptyString,
    hostname: optionalNonEmptyString,
  }),
});

export type CuePushBody = z.infer<typeof CuePushBodySchema>;

/** Cue push response */
export const CuePushResponseSchema = z.object({
  ok: z.boolean(),
  pushId: branded("PushId"),
  processedAt: isoTimestamp,
  conflicts: z.array(
    z.object({
      type: z.enum(["timeEntry", "focusSession", "note", "project"]),
      localId: nonEmptyString,
      remoteId: nonEmptyString,
      resolution: z.enum(["local-wins", "remote-wins", "merged"]),
    })
  ),
  errors: z.array(
    z.object({
      type: z.enum(["timeEntry", "focusSession", "note", "project"]),
      localId: nonEmptyString,
      message: nonEmptyString,
    })
  ),
});

export type CuePushResponse = z.infer<typeof CuePushResponseSchema>;

/** Cue pull response (from backend to Cue CLI) */
export const CuePullResponseSchema = z.object({
  ok: z.boolean(),
  serverTime: isoTimestamp,
  timeEntries: z.array(
    z.object({
      id: nonEmptyString,
      projectId: optionalNonEmptyString,
      projectName: nonEmptyString,
      startedAt: isoTimestamp,
      endedAt: isoTimestamp,
      durationSeconds: nonNegativeInt,
      source: z.enum(["wakatime", "hackatime", "manual"]),
      metadata: z.record(jsonValue).optional(),
      syncedAt: isoTimestamp,
    })
  ),
  focusSessions: z.array(
    z.object({
      id: branded("SessionId"),
      projectId: branded("ProjectId").nullable(),
      taskText: optionalNonEmptyString,
      estimateMinutes: z.number().int().nonnegative().nullable(),
      durationSeconds: nonNegativeInt,
      interrupted: z.boolean().default(false),
      completedAt: isoTimestamp,
      syncedAt: isoTimestamp,
    })
  ),
  sessionNotes: z.array(
    z.object({
      id: branded("NoteId"),
      projectId: branded("ProjectId").nullable(),
      ritualType: z.enum(["checkin", "checkout", "capture", "weekly_review"]),
      body: nonEmptyString,
      blockers: optionalNonEmptyString,
      actualMinutes: z.number().int().nonnegative().nullable(),
      createdAt: isoTimestamp,
      syncedAt: isoTimestamp,
    })
  ),
  projects: z.array(
    z.object({
      id: branded("ProjectId"),
      name: nonEmptyString,
      description: optionalNonEmptyString,
      color: optionalNonEmptyString,
      createdAt: isoTimestamp,
      syncedAt: isoTimestamp,
    })
  ),
  deletedIds: z.object({
    timeEntries: z.array(nonEmptyString),
    focusSessions: z.array(branded("SessionId")),
    sessionNotes: z.array(branded("NoteId")),
    projects: z.array(branded("ProjectId")),
  }),
});

export type CuePullResponse = z.infer<typeof CuePullResponseSchema>;

/** Sync status */
export const SyncStatusSchema = z.object({
  userId: branded("UserId"),
  lastPushAt: isoTimestamp.nullable(),
  lastPullAt: isoTimestamp.nullable(),
  lastSuccessfulSyncAt: isoTimestamp.nullable(),
  pendingPushCount: nonNegativeInt,
  pendingPullCount: nonNegativeInt,
  lastError: optionalNonEmptyString,
  isSyncing: z.boolean().default(false),
});

export type SyncStatus = z.infer<typeof SyncStatusSchema>;

/** Sync config */
export const SyncConfigSchema = z.object({
  userId: branded("UserId"),
  autoPushEnabled: z.boolean().default(true),
  autoPullEnabled: z.boolean().default(true),
  pushIntervalMinutes: z.number().int().min(1).max(1440).default(15),
  pullIntervalMinutes: z.number().int().min(1).max(1440).default(15),
  wifiOnly: z.boolean().default(false),
  batterySaverMode: z.boolean().default(false),
});

export type SyncConfig = z.infer<typeof SyncConfigSchema>;