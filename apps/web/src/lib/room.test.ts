import { describe, expect, it } from "vitest";
import {
  clockOffset,
  decodeCubicleMessage,
  encodeCubicleMessage,
  focusSecondsBetween,
  roomNameInput,
  roomSlug,
  lastClockOffset,
  rememberClockOffset,
  serverNow,
} from "./room";

const NAME = "cub_" + "ab12cd34".repeat(3);

describe("clockOffset", () => {
  it("is the server time minus the midpoint of the round trip", () => {
    // Sent at 1000, answered at 1200: the server's clock was read around 1100 local time.
    expect(clockOffset(1000, 1200, 5100)).toBe(4000);
    expect(clockOffset(1000, 1200, 1100)).toBe(0);
    expect(clockOffset(1000, 1200, 900)).toBe(-200);
  });

  it("falls back to no correction when the numbers cannot be trusted", () => {
    expect(clockOffset(1000, 900, 5000)).toBe(0);
    expect(clockOffset(1000, 1200, Number.NaN)).toBe(0);
  });

  it("moves a local time onto the server's clock", () => {
    expect(serverNow(4000, 10_000)).toBe(14_000);
    expect(serverNow(-250, 10_000)).toBe(9_750);
  });
});

describe("remembered clock offset", () => {
  it("keeps the last measured offset for the rooms list and ignores nonsense", () => {
    rememberClockOffset(1500);
    expect(lastClockOffset()).toBe(1500);
    rememberClockOffset(Number.NaN);
    expect(lastClockOffset()).toBe(1500);
    rememberClockOffset(0);
    expect(lastClockOffset()).toBe(0);
  });
});

describe("cubicle messages", () => {
  it("round-trips each of the four events", () => {
    for (const message of [
      { event: "request" as const, cubicleRoomName: NAME },
      { event: "accept" as const, cubicleRoomName: NAME },
      { event: "decline" as const },
      { event: "end" as const },
    ]) {
      expect(decodeCubicleMessage(encodeCubicleMessage(message))).toEqual(message);
    }
  });

  it("never carries a sender, even if one is passed in", () => {
    const bytes = encodeCubicleMessage({ event: "end", fromIdentity: "mallory" } as never);
    expect(new TextDecoder().decode(bytes)).toBe('{"event":"end"}');
    const spoofed = new TextEncoder().encode(JSON.stringify({ event: "end", fromIdentity: "mallory" }));
    expect(decodeCubicleMessage(spoofed)).toEqual({ event: "end" });
  });

  it("rejects anything that is not a well-formed message", () => {
    const bytes = (text: string) => new TextEncoder().encode(text);
    expect(decodeCubicleMessage(bytes("not json"))).toBeNull();
    expect(decodeCubicleMessage(bytes("null"))).toBeNull();
    expect(decodeCubicleMessage(bytes("[]"))).toBeNull();
    expect(decodeCubicleMessage(bytes('{"event":"explode"}'))).toBeNull();
    expect(decodeCubicleMessage(bytes('{"event":"request"}'))).toBeNull();
    expect(decodeCubicleMessage(bytes('{"event":"accept","cubicleRoomName":"cubicle-a-b-123"}'))).toBeNull();
    expect(decodeCubicleMessage(bytes('{"event":"accept","cubicleRoomName":7}'))).toBeNull();
    expect(decodeCubicleMessage(new Uint8Array([0xff, 0xfe]))).toBeNull();
  });
});

describe("focusSecondsBetween", () => {
  const START = "2026-11-20T10:00:00.000Z";
  const t0 = new Date(START).getTime();
  const min = 60_000;

  it("counts nothing before the room's clock starts", () => {
    expect(focusSecondsBetween(null, t0, t0 + 30 * min)).toBe(0);
    expect(focusSecondsBetween(START, t0 - 20 * min, t0)).toBe(0);
  });

  it("counts a partial focus block when someone leaves early", () => {
    expect(focusSecondsBetween(START, t0 + 5 * min, t0 + 25 * min)).toBe(20 * 60);
  });

  it("leaves the break out", () => {
    // Joined at 40 min, left at 65: 10 min of focus, the 10 min break, then 5 min of focus.
    expect(focusSecondsBetween(START, t0 + 40 * min, t0 + 65 * min)).toBe(15 * 60);
    expect(focusSecondsBetween(START, t0 + 52 * min, t0 + 58 * min)).toBe(0);
  });

  it("counts whole cycles and clips a join from before the clock started", () => {
    expect(focusSecondsBetween(START, t0 - 5 * min, t0 + 120 * min)).toBe(100 * 60);
  });

  it("is zero for an empty or backwards span", () => {
    expect(focusSecondsBetween(START, t0 + 10 * min, t0 + 10 * min)).toBe(0);
    expect(focusSecondsBetween(START, t0 + 10 * min, t0 + 5 * min)).toBe(0);
  });
});

describe("room names", () => {
  it("turns what people type into a name the token server accepts", () => {
    expect(roomSlug("Deep work")).toBe("deep-work");
    expect(roomSlug("  Thesis grind!! ")).toBe("thesis-grind");
    expect(roomSlug("night_shift 2")).toBe("night-shift-2");
  });

  it("has nothing usable for names with no letters or digits, or one character", () => {
    expect(roomSlug("!!!")).toBeNull();
    expect(roomSlug("a")).toBeNull();
    expect(roomSlug("")).toBeNull();
  });

  it("keeps a trailing hyphen while typing but not in the room it opens", () => {
    expect(roomNameInput("Deep ")).toBe("deep-");
    expect(roomSlug("deep-")).toBe("deep");
  });

  it("stays within the server's length limit", () => {
    expect(roomSlug("x".repeat(100))).toHaveLength(63);
  });
});
