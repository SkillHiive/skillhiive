import { describe, it, expect } from "vitest";
import {
  TeamSchema,
  TeamRoleSchema,
  TeamMemberSchema,
  TeamRhythmSchema,
  TeamAnalyticsSchema,
  CreateTeamRequestSchema,
  InviteToTeamRequestSchema,
  type Team,
  type TeamRole,
} from "./team";

describe("Team Contracts", () => {
  const validTeam = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    name: "Engineering Team",
    slug: "engineering",
    description: "Core engineering team",
    avatar: "https://example.com/team.png",
    banner: "https://example.com/banner.png",
    ownerId: "550e8400-e29b-41d4-a716-446655440001",
    isPrivate: true,
    inviteCode: "ABC123",
    createdAt: "2024-01-15T10:00:00.000Z",
    updatedAt: "2024-01-15T10:00:00.000Z",
    memberCount: 5,
  };

  const validMember = {
    id: "550e8400-e29b-41d4-a716-446655440002",
    teamId: "550e8400-e29b-41d4-a716-446655440000",
    userId: "550e8400-e29b-41d4-a716-446655440003",
    role: "member" as TeamRole,
    joinedAt: "2024-01-15T10:00:00.000Z",
    invitedBy: "550e8400-e29b-41d4-a716-446655440001",
    isActive: true,
  };

  it("validates valid team", () => {
    const result = TeamSchema.safeParse(validTeam);
    expect(result.success).toBe(true);
  });

  it("rejects invalid slug (uppercase)", () => {
    const result = TeamSchema.safeParse({ ...validTeam, slug: "Engineering" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid slug (special chars)", () => {
    const result = TeamSchema.safeParse({ ...validTeam, slug: "eng_team" });
    expect(result.success).toBe(false);
  });

  it("rejects slug too short", () => {
    const result = TeamSchema.safeParse({ ...validTeam, slug: "en" });
    expect(result.success).toBe(false);
  });

  it("validates team role", () => {
    const roles: TeamRole[] = ["owner", "admin", "member", "guest"];
    for (const role of roles) {
      const result = TeamRoleSchema.safeParse(role);
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid team role", () => {
    const result = TeamRoleSchema.safeParse("invalid");
    expect(result.success).toBe(false);
  });

  it("validates team member", () => {
    const result = TeamMemberSchema.safeParse(validMember);
    expect(result.success).toBe(true);
  });

  it("validates team rhythm", () => {
    const rhythm = {
      teamId: "550e8400-e29b-41d4-a716-446655440000",
      enabled: true,
      timezone: "America/New_York",
      schedule: [
        {
          dayOfWeek: 1,
          startTime: "09:00",
          durationMinutes: 120,
          focusDurationMinutes: 50,
          breakDurationMinutes: 10,
          cycles: 2,
        },
      ],
      autoStart: false,
      adminOnlyStart: true,
      createdAt: "2024-01-15T10:00:00.000Z",
      updatedAt: "2024-01-15T10:00:00.000Z",
    };
    const result = TeamRhythmSchema.safeParse(rhythm);
    expect(result.success).toBe(true);
  });

  it("validates team analytics", () => {
    const analytics = {
      teamId: "550e8400-e29b-41d4-a716-446655440000",
      period: "week" as const,
      startDate: "2024-01-15T10:00:00.000Z",
      endDate: "2024-01-22T10:00:00.000Z",
      totalFocusHours: 40.5,
      totalSessions: 50,
      activeMembers: 4,
      syncRate: 0.85,
      averageSessionLength: 48.6,
      memberStats: [
        {
          userId: "550e8400-e29b-41d4-a716-446655440003",
          username: "alice",
          focusHours: 12.5,
          sessions: 15,
          syncRate: 0.9,
        },
      ],
    };
    const result = TeamAnalyticsSchema.safeParse(analytics);
    expect(result.success).toBe(true);
  });

  it("validates create team request", () => {
    const request = {
      name: "New Team",
      slug: "new-team",
      description: "A new team",
      isPrivate: true,
    };
    const result = CreateTeamRequestSchema.safeParse(request);
    expect(result.success).toBe(true);
  });

  it("rejects create team without name", () => {
    const result = CreateTeamRequestSchema.safeParse({
      slug: "new-team",
    });
    expect(result.success).toBe(false);
  });

  it("validates invite to team with userId", () => {
    const request = {
      teamId: "550e8400-e29b-41d4-a716-446655440000",
      userId: "550e8400-e29b-41d4-a716-446655440003",
      role: "member" as TeamRole,
    };
    const result = InviteToTeamRequestSchema.safeParse(request);
    expect(result.success).toBe(true);
  });

  it("validates invite to team with email", () => {
    const request = {
      teamId: "550e8400-e29b-41d4-a716-446655440000",
      email: "newuser@example.com",
      role: "member" as TeamRole,
    };
    const result = InviteToTeamRequestSchema.safeParse(request);
    expect(result.success).toBe(true);
  });

  it("rejects invite without userId or email", () => {
    const request = {
      teamId: "550e8400-e29b-41d4-a716-446655440000",
      role: "member" as TeamRole,
    };
    const result = InviteToTeamRequestSchema.safeParse(request);
    expect(result.success).toBe(false);
  });
});