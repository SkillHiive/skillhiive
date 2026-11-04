import { describe, it, expect } from "vitest";
import {
  RoomSchema,
  PhaseSchema,
  ParticipantSchema,
  RoomSettingsSchema,
  RoomCapacitySchema,
  PhaseStateSchema,
  JoinRoomRequestSchema,
  JoinRoomResponseSchema,
  type Room,
  type Phase,
  type Participant,
} from "./room";

describe("Room Contracts", () => {
  const validRoom = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    name: "Focus Room",
    description: "A room for deep work",
    hostId: "550e8400-e29b-41d4-a716-446655440001",
    phase: "waiting" as Phase,
    settings: {
      focusDurationMinutes: 50,
      breakDurationMinutes: 10,
      cycles: 4,
      micAllowedDuringFocus: false,
      autoStartBreaks: true,
      autoStartFocus: false,
    },
    capacity: { max: 10, current: 0 },
    startedAt: null,
    endedAt: null,
    createdAt: "2024-01-15T10:00:00.000Z",
    updatedAt: "2024-01-15T10:00:00.000Z",
    isPrivate: false,
  };

  const validParticipant = {
    id: "550e8400-e29b-41d4-a716-446655440002",
    roomId: "550e8400-e29b-41d4-a716-446655440000",
    userId: "550e8400-e29b-41d4-a716-446655440001",
    identity: "user_123",
    name: "John Doe",
    avatar: null,
    role: "member" as const,
    joinedAt: "2024-01-15T10:00:00.000Z",
    leftAt: null,
    isLocal: false,
    isMuted: true,
    isCameraOn: false,
    isScreenSharing: false,
  };

  it("validates valid room", () => {
    const result = RoomSchema.safeParse(validRoom);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Focus Room");
    }
  });

  it("rejects invalid phase", () => {
    const invalidRoom = { ...validRoom, phase: "invalid" };
    const result = RoomSchema.safeParse(invalidRoom);
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const invalidRoom = { ...validRoom, name: "" };
    const result = RoomSchema.safeParse(invalidRoom);
    expect(result.success).toBe(false);
  });

  it("rejects name too long", () => {
    const invalidRoom = { ...validRoom, name: "a".repeat(49) };
    const result = RoomSchema.safeParse(invalidRoom);
    expect(result.success).toBe(false);
  });

  it("validates all phases", () => {
    const phases: Phase[] = ["waiting", "focusing", "break", "ending", "ended"];
    for (const phase of phases) {
      const result = RoomSchema.safeParse({ ...validRoom, phase });
      expect(result.success).toBe(true);
    }
  });

  it("validates room settings", () => {
    const result = RoomSettingsSchema.safeParse(validRoom.settings);
    expect(result.success).toBe(true);
  });

  it("rejects invalid focus duration", () => {
    const result = RoomSettingsSchema.safeParse({
      ...validRoom.settings,
      focusDurationMinutes: 0,
    });
    expect(result.success).toBe(false);
  });

  it("validates room capacity", () => {
    const result = RoomCapacitySchema.safeParse(validRoom.capacity);
    expect(result.success).toBe(true);
  });

  it("validates participant", () => {
    const result = ParticipantSchema.safeParse(validParticipant);
    expect(result.success).toBe(true);
  });

  it("rejects invalid participant role", () => {
    const result = ParticipantSchema.safeParse({
      ...validParticipant,
      role: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("validates phase state", () => {
    const phaseState = {
      phase: "focusing" as Phase,
      remainingSeconds: 1800,
      progress: 0.5,
      micAllowed: false,
      currentCycle: 1,
      totalCycles: 4,
      sessionStartedAt: "2024-01-15T10:00:00.000Z",
      serverTimeOffsetMs: 0,
    };
    const result = PhaseStateSchema.safeParse(phaseState);
    expect(result.success).toBe(true);
  });

  it("validates join room request", () => {
    const request = {
      roomId: "550e8400-e29b-41d4-a716-446655440000",
      userId: "550e8400-e29b-41d4-a716-446655440001",
      identity: "user_123",
      name: "John Doe",
      avatar: null,
    };
    const result = JoinRoomRequestSchema.safeParse(request);
    expect(result.success).toBe(true);
  });

  it("validates join room response", () => {
    const response = {
      room: {
        ...validRoom,
        participants: [validParticipant],
        currentUserRole: "member",
      },
      liveKitToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      liveKitUrl: "wss://livekit.example.com",
      participant: validParticipant,
    };
    const result = JoinRoomResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });
});