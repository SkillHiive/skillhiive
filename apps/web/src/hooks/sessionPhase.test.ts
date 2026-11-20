import { describe, expect, it } from "vitest";
import { BREAK_MS, computePhase, CYCLE_MS, FOCUS_MS } from "./sessionPhase";

const START = "2026-11-20T10:00:00.000Z";
const t0 = new Date(START).getTime();

describe("computePhase", () => {
  it("waits while the room's clock has not started", () => {
    expect(computePhase(null, t0).phase).toBe("waiting");
  });

  it("counts focus down from the server's start, not from when the page loaded", () => {
    const p = computePhase(START, t0 + 10 * 60_000);
    expect(p.phase).toBe("focus");
    expect(p.remainingSeconds).toBe((FOCUS_MS - 10 * 60_000) / 1000);
    expect(p.progress).toBeCloseTo(10 / 50);
    expect(p.micAllowed).toBe(false);
  });

  it("switches to the break, then back to focus on the next cycle", () => {
    const brk = computePhase(START, t0 + FOCUS_MS + 60_000);
    expect(brk.phase).toBe("break");
    expect(brk.remainingSeconds).toBe((BREAK_MS - 60_000) / 1000);
    expect(brk.micAllowed).toBe(true);
    expect(computePhase(START, t0 + CYCLE_MS + 1000).phase).toBe("focus");
  });

  it("treats a start slightly in the future as the start of focus", () => {
    const p = computePhase(START, t0 - 2000);
    expect(p.phase).toBe("focus");
    expect(p.remainingSeconds).toBe(FOCUS_MS / 1000);
    expect(p.progress).toBe(0);
  });
});
