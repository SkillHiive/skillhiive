import { z } from "zod";
import {
  isoTimestamp,
  nonEmptyString,
  optionalNonEmptyString,
  nonNegativeInt,
  branded,
  jsonValue,
} from "../zod";

/** Orchestration task */
export const OrchestrationTaskSchema = z.object({
  id: branded("TaskId"),
  userId: branded("UserId"),
  type: z.enum([
    "orchestrate-task",
    "publish-post",
    "notify-allies",
    "orchestrate-team-task",
    "sync-time-trackers",
    "generate-insights",
    "cleanup",
  ]),
  status: z.enum([
    "queued",
    "planning",
    "executing",
    "awaiting-review",
    "approved",
    "rejected",
    "completed",
    "failed",
    "cancelled",
  ]),
  priority: z.enum(["low", "normal", "high", "critical"]).default("normal"),
  payload: z.record(jsonValue),
  result: z.record(jsonValue).nullable(),
  error: optionalNonEmptyString,
  createdAt: isoTimestamp,
  startedAt: isoTimestamp.nullable(),
  completedAt: isoTimestamp.nullable(),
  retries: nonNegativeInt.default(0),
  maxRetries: nonNegativeInt.default(3),
  scheduledFor: isoTimestamp.nullable(),
});

export type OrchestrationTask = z.infer<typeof OrchestrationTaskSchema>;

/** Orchestration task with diff for review */
export const OrchestrationTaskWithDiffSchema = OrchestrationTaskSchema.extend({
  diff: z
    .object({
      summary: nonEmptyString,
      files: z.array(
        z.object({
          path: nonEmptyString,
          additions: nonNegativeInt,
          deletions: nonNegativeInt,
          diff: nonEmptyString,
        })
      ),
      tests: z.array(
        z.object({
          name: nonEmptyString,
          status: z.enum(["passed", "failed", "skipped"]),
          durationMs: nonNegativeInt,
        })
      ),
      build: z
        .object({
          status: z.enum(["passed", "failed"]),
          output: optionalNonEmptyString,
        })
        .nullable(),
    })
    .nullable(),
  reviewerId: branded("UserId").nullable(),
  reviewedAt: isoTimestamp.nullable(),
  reviewDecision: z.enum(["approved", "rejected", "changes-requested"]).nullable(),
  reviewComment: optionalNonEmptyString,
});

export type OrchestrationTaskWithDiff = z.infer<typeof OrchestrationTaskWithDiffSchema>;

/** Orchestration queue stats */
export const OrchestrationQueueStatsSchema = z.object({
  queued: nonNegativeInt,
  planning: nonNegativeInt,
  executing: nonNegativeInt,
  awaitingReview: nonNegativeInt,
  completed: nonNegativeInt,
  failed: nonNegativeInt,
  total: nonNegativeInt,
});

export type OrchestrationQueueStats = z.infer<typeof OrchestrationQueueStatsSchema>;

/** Orchestrate task payload */
export const OrchestrateTaskPayloadSchema = z.object({
  task: nonEmptyString,
  context: z.record(jsonValue).optional(),
  autoApprove: z.boolean().default(false),
  projectId: branded("ProjectId").optional(),
});

export type OrchestrateTaskPayload = z.infer<typeof OrchestrateTaskPayloadSchema>;

/** Publish post payload */
export const PublishPostPayloadSchema = z.object({
  content: nonEmptyString,
  imageUrls: z.array(nonEmptyString).optional(),
  platforms: z.array(z.enum(["twitter", "linkedin", "devto", "hashnode"])).optional(),
  scheduledFor: isoTimestamp.optional(),
});

export type PublishPostPayload = z.infer<typeof PublishPostPayloadSchema>;

/** Notify allies payload */
export const NotifyAlliesPayloadSchema = z.object({
  message: nonEmptyString,
  channels: z.array(z.enum(["email", "push", "in_app", "discord", "slack"])).optional(),
  recipientIds: z.array(branded("UserId")).optional(),
  teamId: branded("TeamId").optional(),
});

export type NotifyAlliesPayload = z.infer<typeof NotifyAlliesPayloadSchema>;

/** Orchestrate team task payload */
export const OrchestrateTeamTaskPayloadSchema = z.object({
  teamId: branded("TeamId"),
  task: nonEmptyString,
  assigneeIds: z.array(branded("UserId")).optional(),
  context: z.record(jsonValue).optional(),
  autoApprove: z.boolean().default(false),
});

export type OrchestrateTeamTaskPayload = z.infer<typeof OrchestrateTeamTaskPayloadSchema>;

/** Sync time trackers payload */
export const SyncTimeTrackersPayloadSchema = z.object({
  userId: branded("UserId"),
  force: z.boolean().default(false),
  provider: z.enum(["wakatime", "hackatime", "all"]).default("all"),
});

export type SyncTimeTrackersPayload = z.infer<typeof SyncTimeTrackersPayloadSchema>;

/** Generate insights payload */
export const GenerateInsightsPayloadSchema = z.object({
  userId: branded("UserId"),
  period: z.enum(["day", "week", "month", "year"]),
  types: z.array(z.enum(["focus", "productivity", "patterns", "goals"])).optional(),
});

export type GenerateInsightsPayload = z.infer<typeof GenerateInsightsPayloadSchema>;

/** Cleanup payload */
export const CleanupPayloadSchema = z.object({
  olderThanDays: z.number().int().min(1).max(3650).default(90),
  types: z.array(z.enum(["logs", "temp_files", "orphaned_records", "expired_sessions"])).optional(),
});

export type CleanupPayload = z.infer<typeof CleanupPayloadSchema>;