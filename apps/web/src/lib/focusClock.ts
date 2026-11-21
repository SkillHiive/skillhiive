/**
 * Focus timer maths, derived from wall-clock timestamps so a session keeps
 * correct time when the browser throttles timers (background tabs, sleep).
 */
export interface FocusClock {
  /** When the current running stretch began (epoch ms), or null when paused. */
  startedAt: number | null;
  /** Running time banked from earlier stretches, in ms. */
  bankedMs: number;
}

export const IDLE_CLOCK: FocusClock = { startedAt: null, bankedMs: 0 };

export function isRunning(clock: FocusClock): boolean {
  return clock.startedAt !== null;
}

export function elapsedMs(clock: FocusClock, now: number): number {
  if (clock.startedAt === null) return clock.bankedMs;
  // A clock set backwards must not make time run in reverse.
  return clock.bankedMs + Math.max(0, now - clock.startedAt);
}

export function elapsedSec(clock: FocusClock, now: number): number {
  return Math.floor(elapsedMs(clock, now) / 1000);
}

export function startClock(clock: FocusClock, now: number): FocusClock {
  if (clock.startedAt !== null) return clock;
  return { startedAt: now, bankedMs: clock.bankedMs };
}

export function pauseClock(clock: FocusClock, now: number): FocusClock {
  if (clock.startedAt === null) return clock;
  return { startedAt: null, bankedMs: elapsedMs(clock, now) };
}

/**
 * Seconds to record for a finished task, or null when nothing was timed or
 * entered: a capture with 0 minutes saves its note but no focus session.
 */
export function sessionSeconds(actualMin: number): number | null {
  if (!Number.isFinite(actualMin) || actualMin <= 0) return null;
  return Math.round(actualMin * 60);
}
