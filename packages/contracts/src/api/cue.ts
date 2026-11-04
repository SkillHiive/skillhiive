import { z } from "zod";
import {
  isoTimestamp,
  nonEmptyString,
  optionalNonEmptyString,
  nonNegativeInt,
  branded,
} from "../zod";

/** CueModel (full state for Stager IPC) */
export const CueModelSchema = z.object({
  /** Current head session (what user is working on now) */
  head: z
    .object({
      id: branded("SessionId"),
      projectId: branded("ProjectId").nullable(),
      projectName: optionalNonEmptyString,
      taskText: optionalNonEmptyString,
      estimateMinutes: z.number().int().nonnegative().nullable(),
      durationSeconds: nonNegativeInt,
      startedAt: isoTimestamp,
      isActive: z.boolean(),
      isPaused: z.boolean(),
    })
    .nullable(),
  /** All projects */
  projects: z.array(
    z.object({
      id: branded("ProjectId"),
      name: nonEmptyString,
      description: optionalNonEmptyString,
      color: optionalNonEmptyString,
      totalMinutes: nonNegativeInt,
      totalSessions: nonNegativeInt,
      lastWorkedAt: isoTimestamp.nullable(),
      createdAt: isoTimestamp,
    })
  ),
  /** Recent sessions (last 50) */
  recentSessions: z.array(
    z.object({
      id: branded("SessionId"),
      projectId: branded("ProjectId").nullable(),
      projectName: optionalNonEmptyString,
      taskText: optionalNonEmptyString,
      estimateMinutes: z.number().int().nonnegative().nullable(),
      durationSeconds: nonNegativeInt,
      interrupted: z.boolean(),
      completedAt: isoTimestamp,
    })
  ),
  /** Recent notes (last 50) */
  recentNotes: z.array(
    z.object({
      id: branded("NoteId"),
      projectId: branded("ProjectId").nullable(),
      projectName: optionalNonEmptyString,
      ritualType: z.enum(["checkin", "checkout", "capture", "weekly_review"]),
      body: nonEmptyString,
      blockers: optionalNonEmptyString,
      actualMinutes: z.number().int().nonnegative().nullable(),
      createdAt: isoTimestamp,
    })
  ),
  /** Stats */
  stats: z.object({
    todayMinutes: nonNegativeInt,
    todaySessions: nonNegativeInt,
    weekMinutes: nonNegativeInt,
    weekSessions: nonNegativeInt,
    currentStreak: nonNegativeInt,
    longestStreak: nonNegativeInt,
    lastWorkedAt: isoTimestamp.nullable(),
  }),
  /** Next action suggestion */
  nextAction: z
    .object({
      type: z.enum(["continue", "start_new", "review", "break"]),
      message: nonEmptyString,
      projectId: branded("ProjectId").nullable(),
      projectName: optionalNonEmptyString,
    })
    .nullable(),
  /** Sync status */
  sync: z.object({
    status: z.enum(["synced", "pending", "error", "offline"]),
    lastSyncedAt: isoTimestamp.nullable(),
    pendingCount: nonNegativeInt,
    error: optionalNonEmptyString,
  }),
  /** Timestamp of this model */
  generatedAt: isoTimestamp,
});

export type CueModel = z.infer<typeof CueModelSchema>;

/** ThreadsModel (for project listing) */
export const ThreadsModelSchema = z.object({
  projects: z.array(
    z.object({
      id: branded("ProjectId"),
      name: nonEmptyString,
      description: optionalNonEmptyString,
      color: optionalNonEmptyString,
      totalMinutes: nonNegativeInt,
      totalSessions: nonNegativeInt,
      lastWorkedAt: isoTimestamp.nullable(),
      isActive: z.boolean(),
      createdAt: isoTimestamp,
    })
  ),
  generatedAt: isoTimestamp,
});

export type ThreadsModel = z.infer<typeof ThreadsModelSchema>;

/** StopModel (for cue stop) */
export const StopModelSchema = z.object({
  session: z.object({
    id: branded("SessionId"),
    projectId: branded("ProjectId").nullable(),
    projectName: optionalNonEmptyString,
    taskText: optionalNonEmptyString,
    estimateMinutes: z.number().int().nonnegative().nullable(),
    durationSeconds: nonNegativeInt,
    interrupted: z.boolean(),
    completedAt: isoTimestamp,
  }),
  note: z
    .object({
      id: branded("NoteId"),
      ritualType: z.enum(["checkout", "capture"]),
      body: nonEmptyString,
      blockers: optionalNonEmptyString,
      actualMinutes: z.number().int().nonnegative().nullable(),
      createdAt: isoTimestamp,
    })
    .nullable(),
  generatedAt: isoTimestamp,
});

export type StopModel = z.infer<typeof StopModelSchema>;

/** OrchestrateResult (from Cue orchestrate command) */
export const OrchestrateResultSchema = z.object({
  taskId: branded("TaskId"),
  status: z.enum(["planned", "executing", "reviewing", "completed", "failed"]),
  plan: z.object({
    steps: z.array(
      z.object({
        id: nonEmptyString,
        description: nonEmptyString,
        tool: nonEmptyString,
        args: z.record(z.unknown()),
        status: z.enum(["pending", "running", "completed", "failed"]),
        output: optionalNonEmptyString,
        error: optionalNonEmptyString,
      })
    ),
    estimatedDurationMinutes: z.number().nonnegative(),
  }),
  result: z
    .object({
      summary: nonEmptyString,
      filesChanged: z.array(nonEmptyString),
      testsPassed: z.boolean(),
      buildPassed: z.boolean(),
      diff: optionalNonEmptyString,
    })
    .nullable(),
  startedAt: isoTimestamp,
  completedAt: isoTimestamp.nullable(),
  generatedAt: isoTimestamp,
});

export type OrchestrateResult = z.infer<typeof OrchestrateResultSchema>;

/** Cue CLI command: go */
export const CueGoRequestSchema = z.object({
  projectId: branded("ProjectId").optional(),
  projectName: nonEmptyString.optional(),
  taskText: optionalNonEmptyString,
  estimateMinutes: z.number().int().nonnegative().optional(),
});

export type CueGoRequest = z.infer<typeof CueGoRequestSchema>;

/** Cue CLI command: threads */
export const CueThreadsRequestSchema = z.object({
  limit: z.number().int().min(1).max(200).default(50),
  includeArchived: z.boolean().default(false),
});

export type CueThreadsRequest = z.infer<typeof CueThreadsRequestSchema>;

/** Cue CLI command: stop */
export const CueStopRequestSchema = z.object({
  noteType: z.enum(["checkout", "capture"]),
  body: nonEmptyString,
  blockers: optionalNonEmptyString,
  actualMinutes: z.number().int().nonnegative().optional(),
});

export type CueStopRequest = z.infer<typeof CueStopRequestSchema>;

/** Cue CLI command: orchestrate */
export const CueOrchestrateRequestSchema = z.object({
  task: nonEmptyString,
  context: z.record(z.unknown()).optional(),
  autoApprove: z.boolean().default(false),
});

export type CueOrchestrateRequest = z.infer<typeof CueOrchestrateRequestSchema>;