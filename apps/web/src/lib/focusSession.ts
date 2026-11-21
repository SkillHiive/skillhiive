/**
 * A focus session that outlives the page showing it: the clock, the task being
 * worked on and where that task's time began. Pure helpers, so the provider
 * (components/focus/FocusSessionProvider.tsx) and the tests share one set of rules.
 */
import { IDLE_CLOCK, elapsedSec, type FocusClock } from "./focusClock";

export const FOCUS_SEC = 50 * 60;
export const BREAK_SEC = 10 * 60;
export const CYCLE_SEC = FOCUS_SEC + BREAK_SEC;

export const SESSION_KEY = "skillhive:focus-session:v1";

export interface FocusSession {
  /** A session exists (started and not yet ended). */
  active: boolean;
  clock: FocusClock;
  /** The task being worked on, or null for "the first one in the queue". */
  taskId: string | null;
  /** Session seconds at which the current task's time began. */
  heroStart: number;
}

export const IDLE_SESSION: FocusSession = {
  active: false,
  clock: IDLE_CLOCK,
  taskId: null,
  heroStart: 0,
};

export type FocusPhase = "focus" | "break";

export interface PhaseInfo {
  phase: FocusPhase;
  /** Seconds left in this phase. */
  remaining: number;
  /** 0..1 through this phase. */
  progress: number;
}

/** Where a session is in its 50 + 10 minute cycle. */
export function phaseAt(elapsed: number): PhaseInfo {
  const safe = Math.max(0, Math.floor(elapsed));
  const pos = safe % CYCLE_SEC;
  if (pos < FOCUS_SEC) {
    return { phase: "focus", remaining: FOCUS_SEC - pos, progress: pos / FOCUS_SEC };
  }
  return { phase: "break", remaining: CYCLE_SEC - pos, progress: (pos - FOCUS_SEC) / BREAK_SEC };
}

/** "07:05" from seconds. */
export function clockLabel(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** Seconds on the current task that no capture has saved yet. */
export function unsavedSeconds(session: FocusSession, now: number): number {
  return Math.max(0, elapsedSec(session.clock, now) - session.heroStart);
}

function isClock(value: unknown): value is FocusClock {
  if (!value || typeof value !== "object") return false;
  const { startedAt, bankedMs } = value as Partial<FocusClock>;
  return (
    (startedAt === null || (typeof startedAt === "number" && Number.isFinite(startedAt))) &&
    typeof bankedMs === "number" &&
    Number.isFinite(bankedMs) &&
    bankedMs >= 0
  );
}

/** The saved session, or the idle one when nothing (or nothing readable) was saved. */
export function restoreSession(raw: string | null): FocusSession {
  if (!raw) return IDLE_SESSION;
  try {
    const parsed = JSON.parse(raw) as Partial<FocusSession> | null;
    if (!parsed || typeof parsed !== "object" || parsed.active !== true) return IDLE_SESSION;
    if (!isClock(parsed.clock)) return IDLE_SESSION;
    return {
      active: true,
      clock: { startedAt: parsed.clock.startedAt, bankedMs: parsed.clock.bankedMs },
      taskId: typeof parsed.taskId === "string" ? parsed.taskId : null,
      heroStart:
        typeof parsed.heroStart === "number" && Number.isFinite(parsed.heroStart) && parsed.heroStart >= 0
          ? parsed.heroStart
          : 0,
    };
  } catch {
    return IDLE_SESSION;
  }
}

/** The task a session is on: the one it chose while still queued, else the first queued. */
export function heroTask<T extends { id: string; status: string }>(
  tasks: T[],
  taskId: string | null,
): T | undefined {
  const queued = tasks.filter((t) => t.status === "queued");
  return queued.find((t) => t.id === taskId) ?? queued[0];
}
