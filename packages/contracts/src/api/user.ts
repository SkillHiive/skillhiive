import { z } from "zod";
import {
  isoTimestamp,
  nonEmptyString,
  optionalNonEmptyString,
  email,
  url,
  branded,
} from "../zod";

/** User */
export const UserSchema = z.object({
  id: branded("UserId"),
  username: nonEmptyString.min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  displayName: z.string().max(60).nullable().optional(),
  avatar: z.string().nullable().optional(),
  banner: z.string().nullable().optional(),
  bio: z.string().max(300).nullable().optional(),
  email: email,
  emailVerified: z.boolean().default(false),
  createdAt: isoTimestamp,
  updatedAt: isoTimestamp,
  lastSeenAt: isoTimestamp.nullable(),
  isOnline: z.boolean().default(false),
  timezone: z.string().default("UTC"),
  locale: z.string().default("en"),
});

export type User = z.infer<typeof UserSchema>;

/** Public profile (safe to expose) */
export const PublicProfileSchema = z.object({
  id: branded("UserId"),
  username: nonEmptyString,
  displayName: z.string().nullable().optional(),
  avatar: z.string().nullable().optional(),
  banner: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  createdAt: isoTimestamp,
  isOnline: z.boolean().default(false),
  lastSeenAt: isoTimestamp.nullable(),
});

export type PublicProfile = z.infer<typeof PublicProfileSchema>;

/** Auth state */
export const AuthStateSchema = z.object({
  user: UserSchema.nullable(),
  session: z
    .object({
      accessToken: nonEmptyString,
      refreshToken: nonEmptyString,
      expiresAt: isoTimestamp,
    })
    .nullable(),
  isLoading: z.boolean(),
  isAuthenticated: z.boolean(),
});

export type AuthState = z.infer<typeof AuthStateSchema>;

/** Sign up request */
export const SignUpRequestSchema = z.object({
  email: email,
  password: z.string().min(8).max(128),
  username: nonEmptyString.min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  displayName: z.string().max(60).nullable().optional(),
});

export type SignUpRequest = z.infer<typeof SignUpRequestSchema>;

/** Sign in request */
export const SignInRequestSchema = z.object({
  email: email,
  password: z.string().min(1).max(128),
});

export type SignInRequest = z.infer<typeof SignInRequestSchema>;

/** Update profile request */
export const UpdateProfileRequestSchema = z.object({
  displayName: z.string().max(60).nullable().optional(),
  bio: z.string().max(300).nullable().optional(),
  avatar: z.string().nullable().optional(),
  banner: z.string().nullable().optional(),
  timezone: z.string().optional(),
  locale: z.string().optional(),
});

export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;

/** User presence */
export const UserPresenceSchema = z.object({
  userId: branded("UserId"),
  username: nonEmptyString,
  status: z.enum(["online", "away", "busy", "offline"]),
  currentRoomId: branded("RoomId").nullable(),
  lastActivityAt: isoTimestamp,
});

export type UserPresence = z.infer<typeof UserPresenceSchema>;

/** Follow relationship */
export const FollowSchema = z.object({
  followerId: branded("UserId"),
  followingId: branded("UserId"),
  createdAt: isoTimestamp,
});

export type Follow = z.infer<typeof FollowSchema>;