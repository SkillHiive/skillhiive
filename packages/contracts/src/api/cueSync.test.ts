import { describe, it, expect } from "vitest";
import {
  CueLinkPollResponseSchema,
  CueLinkStartRequestSchema,
  CueLinkStartResponseSchema,
  CueSyncDaysRequestSchema,
  CueSyncDaysResponseSchema,
  CueSyncErrorSchema,
  CueUnpublishRequestSchema,
} from "./cueSync";
import { invalidDaysBodies, validDaysBody } from "./cueSync.fixtures";

const TODAY = "2026-11-15";
const YESTERDAY = "2026-11-14";

describe("Cue sync contract", () => {
  it("accepts a well-formed days body", () => {
    const parsed = CueSyncDaysRequestSchema.safeParse(validDaysBody(TODAY, YESTERDAY));
    expect(parsed.success).toBe(true);
  });

  it("accepts a body with nothing published", () => {
    const body = validDaysBody(TODAY, YESTERDAY) as any;
    body.projects = [];
    body.days = [body.days[1]];
    expect(CueSyncDaysRequestSchema.safeParse(body).success).toBe(true);
  });

  it.each(invalidDaysBodies(TODAY, YESTERDAY))("rejects: $name", ({ body }) => {
    expect(CueSyncDaysRequestSchema.safeParse(body).success).toBe(false);
  });

  it("has no field that could carry a path, command or file name", () => {
    const body = validDaysBody(TODAY, YESTERDAY) as any;
    body.days[0].topFiles = ["src/secret.ts"];
    body.days[0].lastCommand = "psql --password hunter2";
    body.projects[0].root = "/Users/me/client";
    const parsed = CueSyncDaysRequestSchema.parse(body);
    const text = JSON.stringify(parsed);
    for (const leak of ["secret.ts", "hunter2", "/Users/me"]) expect(text).not.toContain(leak);
  });

  it("describes the link flow", () => {
    const publicKey = Buffer.alloc(32, 7).toString("base64");
    expect(CueLinkStartRequestSchema.safeParse({ publicKey, deviceName: "rohans-air", platform: "darwin-arm64", cueVersion: "0.2.0" }).success).toBe(true);
    expect(CueLinkStartRequestSchema.safeParse({ publicKey: "short", deviceName: "x", platform: "y", cueVersion: "1" }).success).toBe(false);
    expect(
      CueLinkStartResponseSchema.safeParse({
        linkId: "550e8400-e29b-41d4-a716-446655440000",
        userCode: "ABCD-2345",
        verifyUrl: "https://skillhiive.com/link?code=ABCD-2345",
        expiresIn: 600,
        interval: 3,
      }).success,
    ).toBe(true);
    expect(CueLinkPollResponseSchema.safeParse({ status: "pending" }).success).toBe(true);
    expect(CueLinkPollResponseSchema.safeParse({ status: "approved" }).success).toBe(false);
    expect(
      CueLinkPollResponseSchema.safeParse({ status: "approved", deviceId: "550e8400-e29b-41d4-a716-446655440000", username: "rohan" }).success,
    ).toBe(true);
  });

  it("describes responses and errors", () => {
    expect(CueSyncDaysResponseSchema.safeParse({ ok: true, accepted: 2, serverTime: 1794737000000 }).success).toBe(true);
    expect(CueUnpublishRequestSchema.safeParse({ key: "p_0123456789abcdef" }).success).toBe(true);
    expect(CueUnpublishRequestSchema.safeParse({ key: "private" }).success).toBe(false);
    expect(CueSyncErrorSchema.safeParse({ error: { code: "revoked_device", message: "This device was removed.", field: null } }).success).toBe(true);
    expect(CueSyncErrorSchema.safeParse({ error: { code: "nope", message: "x", field: null } }).success).toBe(false);
  });
});
