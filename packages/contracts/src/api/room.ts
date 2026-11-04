import { z } from "zod";
import {
  isoTimestamp,
  nonEmptyString,
  optionalNonEmptyString,
  nonNegativeInt,
  branded,
} from "../zod";

/** Room phase enum */
export const PhaseSchema = z.enum([
  "waiting",
  "focusing",
  "break",
  "ending",
  "ended",
]);

export type Phase = z.infer<typeof PhaseSchema>;

/** Room capacity */
export const RoomCapacitySchema = z.object({
  max: nonNegativeInt,
  current: nonNegativeInt,
});

export type RoomCapacity = z.infer<typeof RoomCapacitySchema>;

/** Room settings */
export const RoomSettingsSchema = z.object({
  focusDurationMinutes: z.number().int().min(1).max(120).default(50),
  breakDurationMinutes: z.number().int().min(1).max(60).default(10),
  cycles: z.number().int().min(1).max(20).default(4),
  micAllowedDuringFocus: z.boolean().default(false),
  autoStartBreaks: z.boolean().default(true),
  autoStartFocus: z.boolean().default(false),
});

export type RoomSettings = z.infer<typeof RoomSettingsSchema>;

/** Participant role */
export const ParticipantRoleSchema = z.enum(["host", "moderator", "member", "viewer"]);

export type ParticipantRole = z.infer<typeof ParticipantRoleSchema>;

/** Participant */
export const ParticipantSchema = z.object({
  id: branded("ParticipantId"),
  roomId: branded("RoomId"),
  userId: branded("UserId"),
  identity: nonEmptyString,
  name: nonEmptyString,
  avatar: z.string().nullable().optional(),
  role: ParticipantRoleSchema.default("member"),
  joinedAt: isoTimestamp,
  leftAt: isoTimestamp.nullable(),
  isLocal: z.boolean().default(false),
  isMuted: z.boolean().default(true),
  isCameraOn: z.boolean().default(false),
  isScreenSharing: z.boolean().default(false),
  connectionQuality: z.enum(["excellent", "good", "fair", "poor", "disconnected"]).optional(),
});

export type Participant = z.infer<typeof ParticipantSchema>;

/** Room */
export const RoomSchema = z.object({
  id: branded("RoomId"),
  name: nonEmptyString.max(48),
  description: z.string().max(500).nullable().optional(),
  hostId: branded("UserId"),
  phase: PhaseSchema.default("waiting"),
  settings: RoomSettingsSchema,
  capacity: RoomCapacitySchema,
  startedAt: isoTimestamp.nullable(),
  endedAt: isoTimestamp.nullable(),
  createdAt: isoTimestamp,
  updatedAt: isoTimestamp,
  isPrivate: z.boolean().default(false),
  inviteCode: z.string().min(6).max(12).optional(),
});

export type Room = z.infer<typeof RoomSchema>;

/** Room with participants */
export const RoomWithParticipantsSchema = RoomSchema.extend({
  participants: z.array(ParticipantSchema),
  currentUserRole: ParticipantRoleSchema.optional(),
});

export type RoomWithParticipants = z.infer<typeof RoomWithParticipantsSchema>;

/** Phase state computed from session start */
export const PhaseStateSchema = z.object({
  phase: PhaseSchema,
  remainingSeconds: nonNegativeInt,
  progress: z.number().min(0).max(1),
  micAllowed: z.boolean(),
  currentCycle: nonNegativeInt,
  totalCycles: nonNegativeInt,
  sessionStartedAt: isoTimestamp.nullable(),
  serverTimeOffsetMs: z.number().default(0),
});

export type PhaseState = z.infer<typeof PhaseStateSchema>;

/** Room join request */
export const JoinRoomRequestSchema = z.object({
  roomId: branded("RoomId"),
  userId: branded("UserId"),
  identity: nonEmptyString,
  name: nonEmptyString,
  avatar: z.string().nullable().optional(),
});

export type JoinRoomRequest = z.infer<typeof JoinRoomRequestSchema>;

/** Room join response */
export const JoinRoomResponseSchema = z.object({
  room: RoomWithParticipantsSchema,
  liveKitToken: nonEmptyString,
  liveKitUrl: nonEmptyString,
  participant: ParticipantSchema,
});

export type JoinRoomResponse = z.infer<typeof JoinRoomResponseSchema>;