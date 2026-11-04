import { describe, it, expect } from "vitest";
import {
  UserSchema,
  PublicProfileSchema,
  AuthStateSchema,
  SignUpRequestSchema,
  SignInRequestSchema,
  UpdateProfileRequestSchema,
  UserPresenceSchema,
  FollowSchema,
  type User,
  type PublicProfile,
} from "./user";

describe("User Contracts", () => {
  const validUser = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    username: "johndoe",
    displayName: "John Doe",
    avatar: "https://example.com/avatar.png",
    banner: "https://example.com/banner.png",
    bio: "Developer",
    email: "john@example.com",
    emailVerified: true,
    createdAt: "2024-01-15T10:00:00.000Z",
    updatedAt: "2024-01-15T10:00:00.000Z",
    lastSeenAt: "2024-01-15T10:00:00.000Z",
    isOnline: true,
    timezone: "UTC",
    locale: "en",
  };

  it("validates valid user", () => {
    const result = UserSchema.safeParse(validUser);
    expect(result.success).toBe(true);
  });

  it("rejects invalid username (too short)", () => {
    const result = UserSchema.safeParse({ ...validUser, username: "jo" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid username (special chars)", () => {
    const result = UserSchema.safeParse({ ...validUser, username: "john-doe" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = UserSchema.safeParse({ ...validUser, email: "invalid" });
    expect(result.success).toBe(false);
  });

  it("validates public profile", () => {
    const profile = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      username: "johndoe",
      displayName: "John Doe",
      avatar: "https://example.com/avatar.png",
      banner: "https://example.com/banner.png",
      bio: "Developer",
      createdAt: "2024-01-15T10:00:00.000Z",
      isOnline: true,
      lastSeenAt: "2024-01-15T10:00:00.000Z",
    };
    const result = PublicProfileSchema.safeParse(profile);
    expect(result.success).toBe(true);
  });

  it("validates auth state", () => {
    const authState = {
      user: validUser,
      session: {
        accessToken: "token123",
        refreshToken: "refresh123",
        expiresAt: "2024-01-16T10:00:00.000Z",
      },
      isLoading: false,
      isAuthenticated: true,
    };
    const result = AuthStateSchema.safeParse(authState);
    expect(result.success).toBe(true);
  });

  it("validates auth state without session", () => {
    const authState = {
      user: null,
      session: null,
      isLoading: false,
      isAuthenticated: false,
    };
    const result = AuthStateSchema.safeParse(authState);
    expect(result.success).toBe(true);
  });

  it("validates sign up request", () => {
    const request = {
      email: "john@example.com",
      password: "password123",
      username: "johndoe",
      displayName: "John Doe",
    };
    const result = SignUpRequestSchema.safeParse(request);
    expect(result.success).toBe(true);
  });

  it("rejects short password", () => {
    const result = SignUpRequestSchema.safeParse({
      email: "john@example.com",
      password: "short",
      username: "johndoe",
    });
    expect(result.success).toBe(false);
  });

  it("validates sign in request", () => {
    const request = {
      email: "john@example.com",
      password: "password123",
    };
    const result = SignInRequestSchema.safeParse(request);
    expect(result.success).toBe(true);
  });

  it("validates update profile request", () => {
    const request = {
      displayName: "John Smith",
      bio: "Senior Developer",
      timezone: "America/New_York",
    };
    const result = UpdateProfileRequestSchema.safeParse(request);
    expect(result.success).toBe(true);
  });

  it("validates user presence", () => {
    const presence = {
      userId: "550e8400-e29b-41d4-a716-446655440000",
      username: "johndoe",
      status: "online" as const,
      currentRoomId: "550e8400-e29b-41d4-a716-446655440001",
      lastActivityAt: "2024-01-15T10:00:00.000Z",
    };
    const result = UserPresenceSchema.safeParse(presence);
    expect(result.success).toBe(true);
  });

  it("validates follow", () => {
    const follow = {
      followerId: "550e8400-e29b-41d4-a716-446655440000",
      followingId: "550e8400-e29b-41d4-a716-446655440001",
      createdAt: "2024-01-15T10:00:00.000Z",
    };
    const result = FollowSchema.safeParse(follow);
    expect(result.success).toBe(true);
  });
});