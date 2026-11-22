import { describe, expect, it } from "vitest";
import { CueSyncDaysRequestSchema, CueSyncErrorSchema, CueLinkStartResponseSchema, CueLinkPollResponseSchema, CueSyncDaysResponseSchema } from "@skillhiive/contracts/api/cueSync";
import { invalidDaysBodies, validDaysBody } from "@skillhiive/contracts/api/cueSync.fixtures";
import {
  MAX_DEVICE_REQUESTS,
  MAX_LINKS_PER_IP,
  codeHash,
  handleCueSync,
  sha256Hex,
  validateDays,
} from "./cue-sync-core";
import type { CueSyncStore, DeviceRow, LinkRow, SyncDay, SyncProject } from "./cue-sync-core";

const NOW = Date.parse("2026-11-15T12:00:00Z");
const TODAY = "2026-11-15";
const YESTERDAY = "2026-11-14";
const BASE = "https://project.example.test/functions/v1/cue-sync";
const USER = "00000000-0000-0000-0000-0000000000a1";

type Key = { publicKey: string; privateKey: CryptoKey };

/** A days body loosely typed so tests can break one rule at a time. */
interface LooseBody {
  [key: string]: unknown;
  projects: Record<string, unknown>[];
  days: (Record<string, unknown> & { sources: Record<string, unknown> })[];
}
const looseBody = () => validDaysBody(TODAY, YESTERDAY) as unknown as LooseBody;

interface Reply {
  [key: string]: unknown;
  linkId: string;
  verifyUrl: string;
  accepted: number;
  error: { code: string; message: string; field: string | null };
}

async function newKey(): Promise<Key> {
  const pair = (await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"])) as CryptoKeyPair;
  const raw = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
  return { publicKey: Buffer.from(raw).toString("base64"), privateKey: pair.privateKey };
}

async function sign(key: Key, timestamp: number, body: string): Promise<string> {
  const message = new TextEncoder().encode(timestamp + "." + (await sha256Hex(body)));
  return Buffer.from(await crypto.subtle.sign({ name: "Ed25519" }, key.privateKey, message)).toString("base64");
}

function memoryStore() {
  const machineIds: (string | null)[] = [];
  const links = new Map<string, LinkRow & { userCodeHash: string; ipHash: string; createdAt: string; deviceName: string }>();
  const devices = new Map<string, DeviceRow>();
  const projects = new Map<string, SyncProject>();
  const days = new Map<string, SyncDay>();
  let afterSyncCalls = 0;
  let nextId = 1;
  const budget = new Map<string, number>();
  const store: CueSyncStore = {
    async countRecentLinks(ipHash, sinceIso) {
      return [...links.values()].filter((link) => link.ipHash === ipHash && link.createdAt > sinceIso).length;
    },
    async createLink(link) {
      const id = `00000000-0000-4000-8000-${String(nextId++).padStart(12, "0")}`;
      links.set(id, {
        id, publicKey: link.publicKey, expiresAt: link.expiresAt, approvedAt: null, approvedBy: null, deviceId: null,
        userCodeHash: link.userCodeHash, ipHash: link.ipHash, createdAt: new Date(NOW).toISOString(), deviceName: link.deviceName,
      });
      machineIds.push(link.machineId);
      return id;
    },
    async getLink(id) { return links.get(id) ?? null; },
    async getDevice(id) { return devices.get(id) ?? null; },
    async usernameOf() { return "rohan"; },
    async writeDays(device, incomingProjects, incomingDays) {
      for (const project of incomingProjects) projects.set(device.id + "|" + project.key, project);
      for (const day of incomingDays) days.set(device.id + "|" + day.projectKey + "|" + day.date, day);
    },
    async unpublish(device, projectKey) {
      projects.delete(device.id + "|" + projectKey);
      for (const id of [...days.keys()]) if (id.startsWith(device.id + "|" + projectKey + "|")) days.delete(id);
    },
    async revokeDevice(device) { devices.set(device.id, { ...device, revokedAt: new Date(NOW).toISOString() }); },
    async afterSync() { afterSyncCalls++; },
    async allowRequest(device) {
      budget.set(device.id, (budget.get(device.id) ?? 0) + 1);
      return budget.get(device.id)! <= MAX_DEVICE_REQUESTS;
    },
  };
  return {
    store, links, devices, projects, days, budget, machineIds,
    afterSyncCalls: () => afterSyncCalls,
    /** What the web RPC approve_cue_link does. */
    approve(linkId: string): string {
      const link = links.get(linkId)!;
      const deviceId = `00000000-0000-4000-9000-${String(nextId++).padStart(12, "0")}`;
      devices.set(deviceId, { id: deviceId, userId: USER, publicKey: link.publicKey, revokedAt: null });
      links.set(linkId, { ...link, approvedAt: new Date(NOW).toISOString(), approvedBy: USER, deviceId });
      return deviceId;
    },
  };
}

const config = { webOrigin: "https://skillhiive.test/", now: () => NOW, newCode: () => "ABCD-2345" };

async function call(
  server: ReturnType<typeof memoryStore>,
  path: string,
  body: unknown,
  signed?: { id: string; key: Key; timestamp?: number; tamper?: boolean },
  extraHeaders: Record<string, string> = {},
) {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  const headers: Record<string, string> = { "content-type": "application/json", "x-forwarded-for": "203.0.113.9", ...extraHeaders };
  if (signed) {
    const timestamp = signed.timestamp ?? NOW;
    headers["x-cue-device"] = signed.id;
    headers["x-cue-timestamp"] = String(timestamp);
    headers["x-cue-signature"] = await sign(signed.key, timestamp, text);
  }
  const sent = signed?.tamper ? text.replace("3600", "3601") : text;
  const response = await handleCueSync(new Request(BASE + path, { method: "POST", headers, body: sent }), server.store, config);
  return { status: response.status, body: (await response.json()) as Reply };
}

async function linked() {
  const server = memoryStore();
  const key = await newKey();
  const started = await call(server, "/v1/link/start", { publicKey: key.publicKey, deviceName: "rohans-air", platform: "darwin-arm64", cueVersion: "0.2.0" });
  const deviceId = server.approve(started.body.linkId);
  return { server, key, deviceId, linkId: started.body.linkId };
}

describe("cue-sync: linking", () => {
  it("starts a link and stores only a hash of the code", async () => {
    const server = memoryStore();
    const key = await newKey();
    const started = await call(server, "/v1/link/start", { publicKey: key.publicKey, deviceName: " rohans-air ", platform: "darwin-arm64", cueVersion: "0.2.0" });
    expect(started.status).toBe(200);
    expect(CueLinkStartResponseSchema.safeParse(started.body).success).toBe(true);
    expect(started.body.verifyUrl).toBe("https://skillhiive.test/link?code=ABCD-2345");
    const stored = server.links.get(started.body.linkId)!;
    expect(stored.userCodeHash).toBe(await codeHash(" abcd-2345 "));
    expect(stored.deviceName).toBe("rohans-air");
    expect(JSON.stringify([...server.links.values()])).not.toContain("ABCD-2345");
  });

  it("keeps an optional machine id for old and new clients, lower case", async () => {
    const server = memoryStore();
    const key = await newKey();
    const base = { publicKey: key.publicKey, deviceName: "x", platform: "y", cueVersion: "1" };
    expect((await call(server, "/v1/link/start", base)).status).toBe(200);
    expect((await call(server, "/v1/link/start", { ...base, machineId: "AB".repeat(32) })).status).toBe(200);
    expect(server.machineIds).toEqual([null, "ab".repeat(32)]);
    for (const machineId of ["short", "z".repeat(64), "a".repeat(63), 7]) {
      const bad = await call(server, "/v1/link/start", { ...base, machineId });
      expect(bad.status).toBe(422);
      expect(bad.body.error.field).toBe("machineId");
    }
  });

  it("rejects a malformed key and limits attempts per address", async () => {
    const server = memoryStore();
    const key = await newKey();
    const badKey = await call(server, "/v1/link/start", { publicKey: "not-a-key", deviceName: "x", platform: "y", cueVersion: "1" });
    expect(badKey.status).toBe(422);
    expect(badKey.body.error.field).toBe("publicKey");
    for (let attempt = 0; attempt < MAX_LINKS_PER_IP; attempt++) {
      expect((await call(server, "/v1/link/start", { publicKey: key.publicKey, deviceName: "x", platform: "y", cueVersion: "1" })).status).toBe(200);
    }
    const limited = await call(server, "/v1/link/start", { publicKey: key.publicKey, deviceName: "x", platform: "y", cueVersion: "1" });
    expect(limited.status).toBe(429);
    expect(CueSyncErrorSchema.safeParse(limited.body).success).toBe(true);
  });

  it("polls pending, then approved, and only for the key that started the link", async () => {
    const server = memoryStore();
    const key = await newKey();
    const started = await call(server, "/v1/link/start", { publicKey: key.publicKey, deviceName: "x", platform: "y", cueVersion: "1" });
    const linkId = started.body.linkId;
    const pending = await call(server, "/v1/link/poll", { linkId }, { id: linkId, key });
    expect(pending.body).toEqual({ status: "pending" });

    const stranger = await call(server, "/v1/link/poll", { linkId }, { id: linkId, key: await newKey() });
    expect(stranger.status).toBe(401);
    expect(stranger.body.error.code).toBe("bad_signature");

    const deviceId = server.approve(linkId);
    const approved = await call(server, "/v1/link/poll", { linkId }, { id: linkId, key });
    expect(approved.body).toEqual({ status: "approved", deviceId, username: "rohan" });
    expect(CueLinkPollResponseSchema.safeParse(approved.body).success).toBe(true);
  });

  it("reports an unapproved link as expired after its time", async () => {
    const server = memoryStore();
    const key = await newKey();
    const started = await call(server, "/v1/link/start", { publicKey: key.publicKey, deviceName: "x", platform: "y", cueVersion: "1" });
    const linkId = started.body.linkId;
    server.links.set(linkId, { ...server.links.get(linkId)!, expiresAt: new Date(NOW - 1000).toISOString() });
    expect((await call(server, "/v1/link/poll", { linkId }, { id: linkId, key })).body).toEqual({ status: "expired" });
    expect((await call(server, "/v1/link/poll", { linkId: "00000000-0000-4000-8000-00000000ffff" }, { id: "00000000-0000-4000-8000-00000000ffff", key })).status).toBe(410);
  });
});

describe("cue-sync: days", () => {
  it("accepts signed days, stores them, and runs the after-sync hook", async () => {
    const { server, key, deviceId } = await linked();
    const result = await call(server, "/v1/days", validDaysBody(TODAY, YESTERDAY), { id: deviceId, key });
    expect(result.status).toBe(200);
    expect(CueSyncDaysResponseSchema.safeParse(result.body).success).toBe(true);
    expect(result.body.accepted).toBe(2);
    expect(server.days.size).toBe(2);
    expect(server.projects.size).toBe(1);
    expect(server.afterSyncCalls()).toBe(1);
  });

  it("replaces a row when the same day is sent again", async () => {
    const { server, key, deviceId } = await linked();
    await call(server, "/v1/days", validDaysBody(TODAY, YESTERDAY), { id: deviceId, key });
    const again = looseBody();
    again.days[1].seconds = 4000;
    again.days[1].sources.shell = 4000;
    await call(server, "/v1/days", again, { id: deviceId, key });
    expect(server.days.size).toBe(2);
    expect(server.days.get(`${deviceId}|private|${TODAY}`)!.seconds).toBe(4000);
  });

  it("refuses a body that was changed after signing, an old timestamp, and an unknown device", async () => {
    const { server, key, deviceId } = await linked();
    const body = validDaysBody(TODAY, YESTERDAY);
    const tampered = await call(server, "/v1/days", body, { id: deviceId, key, tamper: true });
    expect([tampered.status, tampered.body.error.code]).toEqual([401, "bad_signature"]);
    const stale = await call(server, "/v1/days", body, { id: deviceId, key, timestamp: NOW - 6 * 60 * 1000 });
    expect([stale.status, stale.body.error.code]).toEqual([409, "clock_skew"]);
    const unknown = await call(server, "/v1/days", body, { id: "00000000-0000-4000-9000-00000000ffff", key });
    expect([unknown.status, unknown.body.error.code]).toEqual([401, "unknown_device"]);
    const unsigned = await call(server, "/v1/days", body, undefined, { "x-cue-device": deviceId });
    expect([unsigned.status, unsigned.body.error.code]).toEqual([401, "bad_signature"]);
    expect(server.days.size).toBe(0);
  });

  it("refuses the request after the budget, and a bad signature does not spend it", async () => {
    const { server, key, deviceId } = await linked();
    const body = validDaysBody(TODAY, YESTERDAY);
    for (let i = 0; i < 5; i++) await call(server, "/v1/days", body, { id: deviceId, key, tamper: true });
    await call(server, "/v1/days", body, undefined, { "x-cue-device": deviceId });
    await call(server, "/v1/days", body, { id: deviceId, key, timestamp: NOW - 6 * 60 * 1000 });
    expect(server.budget.get(deviceId) ?? 0).toBe(0);
    for (let i = 0; i < MAX_DEVICE_REQUESTS; i++) {
      expect((await call(server, "/v1/days", body, { id: deviceId, key })).status).toBe(200);
    }
    const over = await call(server, "/v1/days", body, { id: deviceId, key });
    expect([over.status, over.body.error.code]).toEqual([429, "rate_limited"]);
    expect(CueSyncErrorSchema.safeParse(over.body).success).toBe(true);
    const unpublishOver = await call(server, "/v1/projects/unpublish", { key: "p_0123456789abcdef" }, { id: deviceId, key });
    expect(unpublishOver.status).toBe(429);
  });

  it("names the field when a day is invalid, and stores nothing", async () => {
    const { server, key, deviceId } = await linked();
    const body = looseBody();
    body.days[0].seconds = 90_000;
    const result = await call(server, "/v1/days", body, { id: deviceId, key });
    expect(result.status).toBe(422);
    expect(result.body.error).toMatchObject({ code: "invalid", field: "days[0].seconds" });
    expect(CueSyncErrorSchema.safeParse(result.body).success).toBe(true);
    expect(server.days.size).toBe(0);
  });

  it("refuses dates outside the accepted window", async () => {
    const { server, key, deviceId } = await linked();
    for (const date of ["2026-09-01", "2026-11-20"]) {
      const body = looseBody();
      body.days[0].date = date;
      const result = await call(server, "/v1/days", body, { id: deviceId, key });
      expect([result.status, result.body.error.field]).toEqual([422, "days[0].date"]);
    }
  });

  it("refuses an oversized body", async () => {
    const { server, key, deviceId } = await linked();
    const result = await call(server, "/v1/days", JSON.stringify({ pad: "x".repeat(300_000) }), { id: deviceId, key });
    expect([result.status, result.body.error.code]).toEqual([413, "too_large"]);
  });

  it("agrees with the shared contract on every fixture", () => {
    const valid = validDaysBody(TODAY, YESTERDAY);
    expect(validateDays(valid, NOW).ok).toBe(CueSyncDaysRequestSchema.safeParse(valid).success);
    expect(validateDays(valid, NOW).ok).toBe(true);
    for (const { name, body } of invalidDaysBodies(TODAY, YESTERDAY)) {
      const contract = CueSyncDaysRequestSchema.safeParse(body).success;
      expect({ name, accepted: validateDays(body, NOW).ok }).toEqual({ name, accepted: contract });
      expect({ name, accepted: contract }).toEqual({ name, accepted: false });
    }
  });

  it("drops fields the contract does not define before they reach storage", async () => {
    const { server, key, deviceId } = await linked();
    const body = looseBody();
    body.days[0].topFiles = ["src/secret.ts"];
    body.projects[0].root = "/Users/me/client";
    await call(server, "/v1/days", body, { id: deviceId, key });
    const stored = JSON.stringify([...server.days.values(), ...server.projects.values()]);
    expect(stored).not.toContain("secret.ts");
    expect(stored).not.toContain("/Users/me");
  });
});

describe("cue-sync: unpublish and revoke", () => {
  it("removes one project's rows and leaves the rest", async () => {
    const { server, key, deviceId } = await linked();
    await call(server, "/v1/days", validDaysBody(TODAY, YESTERDAY), { id: deviceId, key });
    const result = await call(server, "/v1/projects/unpublish", { key: "p_0123456789abcdef" }, { id: deviceId, key });
    expect(result.status).toBe(200);
    expect([...server.days.keys()]).toEqual([`${deviceId}|private|${TODAY}`]);
    expect(server.projects.size).toBe(0);
    expect((await call(server, "/v1/projects/unpublish", { key: "private" }, { id: deviceId, key })).status).toBe(422);
  });

  it("stops accepting a revoked device", async () => {
    const { server, key, deviceId } = await linked();
    expect((await call(server, "/v1/device/revoke", {}, { id: deviceId, key })).status).toBe(200);
    const after = await call(server, "/v1/days", validDaysBody(TODAY, YESTERDAY), { id: deviceId, key });
    expect([after.status, after.body.error.code]).toEqual([401, "revoked_device"]);
  });

  it("answers unknown routes and methods plainly", async () => {
    const server = memoryStore();
    expect((await call(server, "/v1/nope", {})).status).toBe(404);
    const get = await handleCueSync(new Request(BASE + "/v1/days", { method: "GET" }), server.store, config);
    expect(get.status).toBe(405);
  });
});
