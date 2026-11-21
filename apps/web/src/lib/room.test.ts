import { describe, expect, it } from "vitest";
import {
  clockOffset,
  decodeCubicleMessage,
  encodeCubicleMessage,
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
