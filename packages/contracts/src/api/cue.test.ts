import { describe, it, expect } from "vitest";
import {
  CueModelSchema,
  ThreadsModelSchema,
  StopModelSchema,
  OrchestrateResultSchema,
  CueGoRequestSchema,
  CueThreadsRequestSchema,
  CueStopRequestSchema,
  CueOrchestrateRequestSchema,
  type CueModel,
  type OrchestrateResult,
} from "./cue";

describe("Cue Contracts", () => {
  const validCueModel = {
    head: {
      id: "550e8400-e29b-41d4-a716-446655440000",
      projectId: "550e8400-e29b-41d4-a716-446655440001",
      projectName: "Auth System",
      taskText: "Implement login",
      estimateMinutes: 60,
      durationSeconds: 1800,
      startedAt: "2024-01-15T09:00:00.000Z",
      isActive: true,
      isPaused: false,
    },
    projects: [
      {
        id: "550e8400-e29b-41d4-a716-446655440001",
        name: "Auth System",
        description: "Authentication system",
        color: "#fffd01",
        totalMinutes: 120,
        totalSessions: 4,
        lastWorkedAt: "2024-01-15T10:00:00.000Z",
        createdAt: "2024-01-15T08:00:00.000Z",
      },
    ],
    recentSessions: [
      {
        id: "550e8400-e29b-41d4-a716-446655440002",
        projectId: "550e8400-e29b-41d4-a716-446655440001",
        projectName: "Auth System",
        taskText: "Implement login",
        estimateMinutes: 60,
        durationSeconds: 3600,
        interrupted: false,
        completedAt: "2024-01-15T10:00:00.000Z",
      },
    ],
    recentNotes: [
      {
        id: "550e8400-e29b-41d4-a716-446655440003",
        projectId: "550e8400-e29b-41d4-a716-446655440001",
        projectName: "Auth System",
        ritualType: "checkin",
        body: "Starting work on login",
        blockers: null,
        actualMinutes: null,
        createdAt: "2024-01-15T09:00:00.000Z",
      },
    ],
    stats: {
      todayMinutes: 60,
      todaySessions: 2,
      weekMinutes: 300,
      weekSessions: 10,
      currentStreak: 5,
      longestStreak: 14,
      lastWorkedAt: "2024-01-15T10:00:00.000Z",
    },
    nextAction: {
      type: "continue",
      message: "Continue working on login implementation",
      projectId: "550e8400-e29b-41d4-a716-446655440001",
      projectName: "Auth System",
    },
    sync: {
      status: "synced",
      lastSyncedAt: "2024-01-15T10:00:00.000Z",
      pendingCount: 0,
      error: null,
    },
    generatedAt: "2024-01-15T10:00:00.000Z",
  };

  it("validates valid cue model", () => {
    const result = CueModelSchema.safeParse(validCueModel);
    expect(result.success).toBe(true);
  });

  it("validates cue model with null head", () => {
    const model = { ...validCueModel, head: null };
    const result = CueModelSchema.safeParse(model);
    expect(result.success).toBe(true);
  });

  it("validates cue model with null nextAction", () => {
    const model = { ...validCueModel, nextAction: null };
    const result = CueModelSchema.safeParse(model);
    expect(result.success).toBe(true);
  });

  it("validates threads model", () => {
    const threads = {
      projects: [
        {
          id: "550e8400-e29b-41d4-a716-446655440001",
          name: "Auth System",
          description: "Authentication system",
          color: "#fffd01",
          totalMinutes: 120,
          totalSessions: 4,
          lastWorkedAt: "2024-01-15T10:00:00.000Z",
          isActive: true,
          createdAt: "2024-01-15T08:00:00.000Z",
        },
      ],
      generatedAt: "2024-01-15T10:00:00.000Z",
    };
    const result = ThreadsModelSchema.safeParse(threads);
    expect(result.success).toBe(true);
  });

  it("validates stop model", () => {
    const stop = {
      session: {
        id: "550e8400-e29b-41d4-a716-446655440000",
        projectId: "550e8400-e29b-41d4-a716-446655440001",
        projectName: "Auth System",
        taskText: "Implement login",
        estimateMinutes: 60,
        durationSeconds: 3600,
        interrupted: false,
        completedAt: "2024-01-15T10:00:00.000Z",
      },
      note: {
        id: "550e8400-e29b-41d4-a716-446655440003",
        ritualType: "checkout",
        body: "Completed login implementation",
        blockers: "None",
        actualMinutes: 60,
        createdAt: "2024-01-15T10:00:00.000Z",
      },
      generatedAt: "2024-01-15T10:00:00.000Z",
    };
    const result = StopModelSchema.safeParse(stop);
    expect(result.success).toBe(true);
  });

  it("validates stop model with null note", () => {
    const stop = {
      session: {
        id: "550e8400-e29b-41d4-a716-446655440000",
        projectId: "550e8400-e29b-41d4-a716-446655440001",
        projectName: "Auth System",
        taskText: "Implement login",
        estimateMinutes: 60,
        durationSeconds: 3600,
        interrupted: false,
        completedAt: "2024-01-15T10:00:00.000Z",
      },
      note: null,
      generatedAt: "2024-01-15T10:00:00.000Z",
    };
    const result = StopModelSchema.safeParse(stop);
    expect(result.success).toBe(true);
  });

  it("validates orchestrate result", () => {
    const result = {
      taskId: "550e8400-e29b-41d4-a716-446655440000",
      status: "completed" as const,
      plan: {
        steps: [
          {
            id: "step_1",
            description: "Create login component",
            tool: "write_file",
            args: { path: "src/components/Login.tsx" },
            status: "completed" as const,
            output: "Created Login.tsx",
            error: null,
          },
        ],
        estimatedDurationMinutes: 30,
      },
      result: {
        summary: "Implemented login with OAuth",
        filesChanged: ["src/components/Login.tsx", "src/lib/auth.ts"],
        testsPassed: true,
        buildPassed: true,
        diff: "diff content...",
      },
      startedAt: "2024-01-15T10:00:00.000Z",
      completedAt: "2024-01-15T10:30:00.000Z",
      generatedAt: "2024-01-15T10:30:00.000Z",
    };
    const parsed = OrchestrateResultSchema.safeParse(result);
    expect(parsed.success).toBe(true);
  });

  it("validates cue go request", () => {
    const request = {
      projectId: "550e8400-e29b-41d4-a716-446655440001",
      taskText: "Work on auth",
      estimateMinutes: 50,
    };
    const result = CueGoRequestSchema.safeParse(request);
    expect(result.success).toBe(true);
  });

  it("validates cue threads request", () => {
    const request = {
      limit: 50,
      includeArchived: false,
    };
    const result = CueThreadsRequestSchema.safeParse(request);
    expect(result.success).toBe(true);
  });

  it("validates cue stop request", () => {
    const request = {
      noteType: "checkout",
      body: "Done for now",
      blockers: "Waiting on review",
      actualMinutes: 50,
    };
    const result = CueStopRequestSchema.safeParse(request);
    expect(result.success).toBe(true);
  });

  it("validates cue orchestrate request", () => {
    const request = {
      task: "Add user registration",
      context: { project: "auth" },
      autoApprove: false,
    };
    const result = CueOrchestrateRequestSchema.safeParse(request);
    expect(result.success).toBe(true);
  });
});