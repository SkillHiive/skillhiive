import { z } from "zod";
import { isoDate } from "../zod";

/**
 * Cue device sync — the wire contract between the Cue program on a user's
 * computer and the `cue-sync` edge function.
 *
 * Only daily totals cross this boundary. A project is named only when the
 * user published it; everything else is summed under the key "private".
 */

export const CUE_SYNC_SCHEMA_VERSION = 1;
export const CUE_PRIVATE_PROJECT_KEY = "private";

/** Opaque per-device project id: "p_" plus 16 hex characters. */
export const CueProjectKeySchema = z.string().regex(/^p_[0-9a-f]{16}$/);

/** Ed25519 public key, raw 32 bytes, base64. */
export const CuePublicKeySchema = z.string().regex(/^[A-Za-z0-9+/]{43}=$/);

const wholeSeconds = z.number().int().min(0).max(86_400);

// ── Linking ────────────────────────────────────────────────────────────────
export const CueLinkStartRequestSchema = z.object({
  publicKey: CuePublicKeySchema,
  deviceName: z.string().trim().min(1).max(80),
  platform: z.string().trim().min(1).max(40),
  cueVersion: z.string().min(1).max(20),
});

export const CueLinkStartResponseSchema = z.object({
  linkId: z.string().uuid(),
  userCode: z.string().regex(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/),
  verifyUrl: z.string().url(),
  expiresIn: z.number().int().positive(),
  interval: z.number().int().positive(),
});

export const CueLinkPollRequestSchema = z.object({ linkId: z.string().uuid() });

export const CueLinkPollResponseSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("pending") }),
  z.object({ status: z.literal("expired") }),
  z.object({ status: z.literal("approved"), deviceId: z.string().uuid(), username: z.string() }),
]);

// ── Days ───────────────────────────────────────────────────────────────────
export const CueSyncProjectSchema = z.object({
  key: CueProjectKeySchema,
  name: z.string().trim().min(1).max(80),
  /** Host and path of the git remote; never a scheme or credentials. */
  remote: z
    .string()
    .max(200)
    .regex(/^[a-z0-9.-]+\.[a-z]{2,}(\/[\w.~-]+)+$/i)
    .nullable(),
});

export const CueSyncSourcesSchema = z.object({
  shell: wholeSeconds,
  fs: wholeSeconds,
  agent: wholeSeconds,
  git: wholeSeconds,
});

export const CueSyncDaySchema = z
  .object({
    date: isoDate,
    projectKey: z.union([z.literal(CUE_PRIVATE_PROJECT_KEY), CueProjectKeySchema]),
    seconds: wholeSeconds,
    agentSeconds: wholeSeconds,
    sources: CueSyncSourcesSchema,
    languages: z.array(z.object({ name: z.string().trim().min(1).max(40), seconds: wholeSeconds })).max(50),
    commits: z.number().int().min(0).max(10_000),
  })
  .refine((day) => day.agentSeconds <= day.seconds, {
    message: "agentSeconds cannot exceed seconds",
    path: ["agentSeconds"],
  })
  .refine(
    (day) => day.projectKey !== CUE_PRIVATE_PROJECT_KEY || (day.languages.length === 0 && day.commits === 0),
    { message: "the private row carries no languages and no commit count" },
  );

export const CueSyncDaysRequestSchema = z
  .object({
    schema: z.literal(CUE_SYNC_SCHEMA_VERSION),
    cueVersion: z.string().min(1).max(20),
    timezone: z.string().min(1).max(64),
    projects: z.array(CueSyncProjectSchema).max(200),
    days: z.array(CueSyncDaySchema).max(2000),
  })
  .superRefine((body, context) => {
    const keys = new Set<string>();
    body.projects.forEach((project, index) => {
      if (keys.has(project.key)) {
        context.addIssue({ code: "custom", message: "each project key may appear once", path: ["projects", index, "key"] });
      }
      keys.add(project.key);
    });
    const seen = new Set<string>();
    const perDate = new Map<string, number>();
    body.days.forEach((day, index) => {
      if (day.projectKey !== CUE_PRIVATE_PROJECT_KEY && !keys.has(day.projectKey)) {
        context.addIssue({ code: "custom", message: "projectKey must be listed in projects", path: ["days", index, "projectKey"] });
      }
      const pair = day.date + "|" + day.projectKey;
      if (seen.has(pair)) {
        context.addIssue({ code: "custom", message: "each date and projectKey pair may appear once", path: ["days", index] });
      }
      seen.add(pair);
      const total = (perDate.get(day.date) ?? 0) + day.seconds;
      if (total > 86_400) {
        context.addIssue({ code: "custom", message: "the rows for one date add up to more than a day", path: ["days", index, "seconds"] });
      }
      perDate.set(day.date, total);
    });
  });

export const CueSyncDaysResponseSchema = z.object({
  ok: z.literal(true),
  accepted: z.number().int().min(0),
  serverTime: z.number().int().positive(),
});

export const CueUnpublishRequestSchema = z.object({ key: CueProjectKeySchema });

// ── Errors ─────────────────────────────────────────────────────────────────
export const CueSyncErrorCodeSchema = z.enum([
  "unknown_device",
  "revoked_device",
  "bad_signature",
  "clock_skew",
  "link_expired",
  "too_large",
  "invalid",
  "rate_limited",
  "not_found",
  "server_error",
]);

export const CueSyncErrorSchema = z.object({
  error: z.object({
    code: CueSyncErrorCodeSchema,
    message: z.string().min(1),
    field: z.string().nullable(),
  }),
});

export type CueLinkStartRequest = z.infer<typeof CueLinkStartRequestSchema>;
export type CueLinkStartResponse = z.infer<typeof CueLinkStartResponseSchema>;
export type CueLinkPollResponse = z.infer<typeof CueLinkPollResponseSchema>;
export type CueSyncProject = z.infer<typeof CueSyncProjectSchema>;
export type CueSyncDay = z.infer<typeof CueSyncDaySchema>;
export type CueSyncDaysRequest = z.infer<typeof CueSyncDaysRequestSchema>;
export type CueSyncDaysResponse = z.infer<typeof CueSyncDaysResponseSchema>;
export type CueSyncErrorCode = z.infer<typeof CueSyncErrorCodeSchema>;
export type CueSyncError = z.infer<typeof CueSyncErrorSchema>;
