import { describe, expect, it } from "vitest";
import {
  IDLE_CLOCK,
  elapsedMs,
  elapsedSec,
  isRunning,
  pauseClock,
  sessionSeconds,
  startClock,
} from "./focusClock";

const T0 = Date.parse("2026-11-20T09:00:00Z");
const min = (n: number) => n * 60 * 1000;

describe("focus clock", () => {
  it("starts idle at zero", () => {
    expect(isRunning(IDLE_CLOCK)).toBe(false);
    expect(elapsedSec(IDLE_CLOCK, T0 + min(5))).toBe(0);
  });

  it("measures from the start timestamp, not from ticks", () => {
    const c = startClock(IDLE_CLOCK, T0);
    expect(isRunning(c)).toBe(true);
    // No ticks in between (a throttled background tab): still 50 minutes.
    expect(elapsedSec(c, T0 + min(50))).toBe(3000);
  });

  it("freezes while paused and resumes from the banked time", () => {
    let c = startClock(IDLE_CLOCK, T0);
    c = pauseClock(c, T0 + min(10));
    expect(isRunning(c)).toBe(false);
    expect(elapsedSec(c, T0 + min(30))).toBe(600);
    c = startClock(c, T0 + min(30));
    expect(elapsedSec(c, T0 + min(35))).toBe(900);
  });

  it("ignores a repeated start or pause", () => {
    const running = startClock(IDLE_CLOCK, T0);
    expect(startClock(running, T0 + min(3))).toBe(running);
    const paused = pauseClock(running, T0 + min(2));
    expect(pauseClock(paused, T0 + min(9))).toBe(paused);
    expect(elapsedMs(paused, T0 + min(9))).toBe(min(2));
  });

  it("floors partial seconds and never runs backwards", () => {
    const c = startClock(IDLE_CLOCK, T0);
    expect(elapsedSec(c, T0 + 1999)).toBe(1);
    expect(elapsedSec(c, T0 - 5000)).toBe(0);
  });
});

describe("sessionSeconds", () => {
  it("records nothing for a capture with no time", () => {
    expect(sessionSeconds(0)).toBeNull();
    expect(sessionSeconds(-3)).toBeNull();
    expect(sessionSeconds(Number.NaN)).toBeNull();
  });

  it("records the minutes as seconds", () => {
    expect(sessionSeconds(1)).toBe(60);
    expect(sessionSeconds(50)).toBe(3000);
  });
});
