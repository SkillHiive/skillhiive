import { z } from "zod";
import {
  isoTimestamp,
  nonEmptyString,
  optionalNonEmptyString,
  nonNegativeInt,
  branded,
} from "../zod";

/** Team */
export const TeamSchema = z.object({
  id: branded("TeamId"),
  name: nonEmptyString.max(48),
  slug: nonEmptyString.min(3).max(32).regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).nullable().optional(),
  avatar: z.string().nullable().optional(),
  banner: z.string().nullable().optional(),
  ownerId: branded("UserId"),
  isPrivate: z.boolean().default(true),
  inviteCode: z.string().min(6).max(12).optional(),
  createdAt: isoTimestamp,
  updatedAt: isoTimestamp,
  memberCount: nonNegativeInt.default(0),
});

export type Team = z.infer<typeof TeamSchema>;

/** Team member role */
export const TeamRoleSchema = z.enum(["owner", "admin", "member", "guest"]);

export type TeamRole = z.infer<typeof TeamRoleSchema>;

/** Team member */
export const TeamMemberSchema = z.object({
  id: branded("TeamMemberId"),
  teamId: branded("TeamId"),
  userId: branded("UserId"),
  role: TeamRoleSchema.default("member"),
  joinedAt: isoTimestamp,
  invitedBy: branded("UserId").nullable(),
  isActive: z.boolean().default(true),
});

export type TeamMember = z.infer<typeof TeamMemberSchema>;

/** Team with members */
export const TeamWithMembersSchema = TeamSchema.extend({
  members: z.array(TeamMemberSchema),
  currentUserRole: TeamRoleSchema.optional(),
});

export type TeamWithMembers = z.infer<typeof TeamWithMembersSchema>;

/** Team rhythm settings */
export const TeamRhythmSchema = z.object({
  teamId: branded("TeamId"),
  enabled: z.boolean().default(false),
  timezone: z.string().default("UTC"),
  schedule: z.array(
    z.object({
      dayOfWeek: z.number().int().min(0).max(6), // 0 = Sunday
      startTime: z.string().regex(/^\d{2}:\d{2}$/), // HH:MM
      durationMinutes: z.number().int().min(30).max(480),
      focusDurationMinutes: z.number().int().min(15).max(120).default(50),
      breakDurationMinutes: z.number().int().min(5).max(60).default(10),
      cycles: z.number().int().min(1).max(10).default(4),
    })
  ),
  autoStart: z.boolean().default(false),
  adminOnlyStart: z.boolean().default(true),
  createdAt: isoTimestamp,
  updatedAt: isoTimestamp,
});

export type TeamRhythm = z.infer<typeof TeamRhythmSchema>;

/** Team analytics */
export const TeamAnalyticsSchema = z.object({
  teamId: branded("TeamId"),
  period: z.enum(["day", "week", "month", "year"]),
  startDate: isoTimestamp,
  endDate: isoTimestamp,
  totalFocusHours: z.number().nonnegative(),
  totalSessions: nonNegativeInt,
  activeMembers: nonNegativeInt,
  syncRate: z.number().min(0).max(1),
  averageSessionLength: z.number().nonnegative(),
  memberStats: z.array(
    z.object({
      userId: branded("UserId"),
      username: nonEmptyString,
      focusHours: z.number().nonnegative(),
      sessions: nonNegativeInt,
      syncRate: z.number().min(0).max(1),
    })
  ),
});

export type TeamAnalytics = z.infer<typeof TeamAnalyticsSchema>;

/** Create team request */
export const CreateTeamRequestSchema = z.object({
  name: nonEmptyString.max(48),
  slug: nonEmptyString.min(3).max(32).regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).nullable().optional(),
  isPrivate: z.boolean().default(true),
});

export type CreateTeamRequest = z.infer<typeof CreateTeamRequestSchema>;

/** Invite to team request */
export const InviteToTeamRequestSchema = z.object({
  teamId: branded("TeamId"),
  userId: branded("UserId").optional(),
  email: z.string().email().optional(),
  role: TeamRoleSchema.default("member"),
}).refine((data) => data.userId || data.email, {
  message: "Either userId or email must be provided",
});

export type InviteToTeamRequest = z.infer<typeof InviteToTeamRequestSchema>;