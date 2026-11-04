import { describe, it, expect } from "vitest";
import {
  OrchestrationTaskSchema,
  OrchestrationTaskWithDiffSchema,
  OrchestrationQueueStatsSchema,
  OrchestrateTaskPayloadSchema,
  PublishPostPayloadSchema,
  NotifyAlliesPayloadSchema,
  OrchestrateTeamTaskPayloadSchema,
  SyncTimeTrackersPayloadSchema,
  GenerateInsightsPayloadSchema,
  CleanupPayloadSchema,
  type OrchestrationTask,
} from "./orchestration";

describe("Orchestration Contracts", () => {
  const validTask = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    userId: "550e8400-e29b-41d4-a716-446655440001",
    type: "orchestrate-task" as const,
    status: "queued" as const,
    priority: "normal" as const,
    payload: { task: "Implement feature", context: {} },
    result: null,
    error: null,
    createdAt: "2024-01-15T10:00:00.000Z",
    startedAt: null,
    completedAt: null,
    retries: 0,
    maxRetries: 3,
    scheduledFor: null,
  };

  it("validates valid orchestration task", () => {
    const result = OrchestrationTaskSchema.safeParse(validTask);
    expect(result.success).toBe(true);
  });

  it("validates all task types", () => {
    const types = [
      "orchestrate-task",
      "publish-post",
      "notify-allies",
      "orchestrate-team-task",
      "sync-time-trackers",
      "generate-insights",
      "cleanup",
    ] as const;
    for (const type of types) {
      const result = OrchestrationTaskSchema.safeParse({ ...validTask, type });
      expect(result.success).toBe(true);
    }
  });

  it("validates all statuses", () => {
    const statuses = [
      "queued",
      "planning",
      "executing",
      "awaiting-review",
      "approved",
      "rejected",
      "completed",
      "failed",
      "cancelled",
    ] as const;
    for (const status of statuses) {
      const result = OrchestrationTaskSchema.safeParse({ ...validTask, status });
      expect(result.success).toBe(true);
    }
  });

  it("validates task with diff", () => {
    const taskWithDiff = {
      ...validTask,
      status: "awaiting-review" as const,
      diff: {
        summary: "Added user registration",
        files: [
          {
            path: "src/components/Register.tsx",
            additions: 50,
            deletions: 0,
            diff: "+ export function Register() {...}",
          },
        ],
        tests: [
          { name: "Register test", status: "passed" as const, durationMs: 100 },
        ],
        build: { status: "passed" as const, output: "Build successful" },
      },
      reviewerId: null,
      reviewedAt: null,
      reviewDecision: null,
      reviewComment: null,
    };
    const result = OrchestrationTaskWithDiffSchema.safeParse(taskWithDiff);
    expect(result.success).toBe(true);
  });

  it("validates queue stats", () => {
    const stats = {
      queued: 5,
      planning: 2,
      executing: 1,
      awaitingReview: 3,
      completed: 50,
      failed: 2,
      total: 63,
    };
    const result = OrchestrationQueueStatsSchema.safeParse(stats);
    expect(result.success).toBe(true);
  });

  it("validates orchestrate task payload", () => {
    const payload = {
      task: "Implement user dashboard",
      context: { project: "frontend", framework: "react" },
      autoApprove: false,
      projectId: "550e8400-e29b-41d4-a716-446655440001",
    };
    const result = OrchestrateTaskPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("validates publish post payload", () => {
    const payload = {
      content: "Just shipped a new feature! 🚀",
      imageUrls: ["https://example.com/image.png"],
      platforms: ["twitter", "linkedin"],
      scheduledFor: "2024-01-16T10:00:00.000Z",
    };
    const result = PublishPostPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("validates notify allies payload", () => {
    const payload = {
      message: "Team sync in 10 minutes",
      channels: ["push", "in_app", "slack"],
      recipientIds: ["550e8400-e29b-41d4-a716-446655440002"],
      teamId: "550e8400-e29b-41d4-a716-446655440000",
    };
    const result = NotifyAlliesPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("validates orchestrate team task payload", () => {
    const payload = {
      teamId: "550e8400-e29b-41d4-a716-446655440000",
      task: "Refactor API layer",
      assigneeIds: ["550e8400-e29b-41d4-a716-446655440002"],
      context: { priority: "high" },
      autoApprove: false,
    };
    const result = OrchestrateTeamTaskPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("validates sync time trackers payload", () => {
    const payload = {
      userId: "550e8400-e29b-41d4-a716-446655440001",
      force: true,
      provider: "wakatime" as const,
    };
    const result = SyncTimeTrackersPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("validates generate insights payload", () => {
    const payload = {
      userId: "550e8400-e29b-41d4-a716-446655440001",
      period: "week" as const,
      types: ["focus", "productivity"],
    };
    const result = GenerateInsightsPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("validates cleanup payload", () => {
    const payload = {
      olderThanDays: 90,
      types: ["logs", "temp_files"],
    };
    const result = CleanupPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });
});