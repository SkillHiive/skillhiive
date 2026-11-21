import { describe, expect, it } from "vitest";
import { startClock, pauseClock, IDLE_CLOCK } from "./focusClock";
import {
  BREAK_SEC,
  FOCUS_SEC,
  IDLE_SESSION,
  clockLabel,
  heroTask,
  phaseAt,
  restoreSession,
  unsavedSeconds,
  type FocusSession,
} from "./focusSession";

const T0 = Date.parse("2026-11-20T09:00:00Z");

describe("phaseAt", () => {
  it("counts down 50 minutes of focus, then 10 of break, then repeats", () => {
    expect(phaseAt(0)).toEqual({ phase: "focus", remaining: FOCUS_SEC, progress: 0 });
    expect(phaseAt(FOCUS_SEC - 1).phase).toBe("focus");
    expect(phaseAt(FOCUS_SEC)).toEqual({ phase: "break", remaining: BREAK_SEC, progress: 0 });
    expect(phaseAt(FOCUS_SEC + BREAK_SEC / 2).progress).toBeCloseTo(0.5);
    expect(phaseAt(FOCUS_SEC + BREAK_SEC)).toEqual({ phase: "focus", remaining: FOCUS_SEC, progress: 0 });
  });

  it("treats negative time as the start", () => {
    expect(phaseAt(-20).remaining).toBe(FOCUS_SEC);
  });
});

describe("clockLabel", () => {
  it("shows minutes and seconds", () => {
    expect(clockLabel(3000)).toBe("50:00");
    expect(clockLabel(65)).toBe("01:05");
    expect(clockLabel(-3)).toBe("00:00");
  });
});

describe("restoreSession", () => {
  it("is idle with nothing saved, unreadable data or an ended session", () => {
    for (const raw of [null, "", "nope", "null", "[]", JSON.stringify({ ...IDLE_SESSION })]) {
      expect(restoreSession(raw)).toEqual(IDLE_SESSION);
    }
  });

  it("brings back a running session, so the clock keeps counting from its timestamp", () => {
    const saved: FocusSession = { active: true, clock: startClock(IDLE_CLOCK, T0), taskId: "t1", heroStart: 120 };
    const back = restoreSession(JSON.stringify(saved));
    expect(back).toEqual(saved);
    expect(unsavedSeconds(back, T0 + 10 * 60_000)).toBe(600 - 120);
  });

  it("brings back a paused session", () => {
    const clock = pauseClock(startClock(IDLE_CLOCK, T0), T0 + 90_000);
    const back = restoreSession(JSON.stringify({ active: true, clock, taskId: null, heroStart: 0 }));
    expect(back.clock).toEqual({ startedAt: null, bankedMs: 90_000 });
  });

  it("drops a broken clock and repairs a broken task or start", () => {
    expect(restoreSession(JSON.stringify({ active: true, clock: { startedAt: "x", bankedMs: 0 } }))).toEqual(IDLE_SESSION);
    expect(restoreSession(JSON.stringify({ active: true, clock: { startedAt: null, bankedMs: -5 } }))).toEqual(IDLE_SESSION);
    expect(
      restoreSession(JSON.stringify({ active: true, clock: { startedAt: null, bankedMs: 0 }, taskId: 4, heroStart: -1 })),
    ).toEqual({ active: true, clock: { startedAt: null, bankedMs: 0 }, taskId: null, heroStart: 0 });
  });
});

describe("unsavedSeconds", () => {
  it("never goes below zero", () => {
    expect(unsavedSeconds({ ...IDLE_SESSION, heroStart: 300 }, T0)).toBe(0);
  });
});

describe("heroTask", () => {
  const tasks = [
    { id: "a", status: "done" },
    { id: "b", status: "queued" },
    { id: "c", status: "queued" },
  ];

  it("stays on the chosen task while it is queued", () => {
    expect(heroTask(tasks, "c")?.id).toBe("c");
  });

  it("falls back to the first queued task", () => {
    expect(heroTask(tasks, null)?.id).toBe("b");
    expect(heroTask(tasks, "a")?.id).toBe("b");
    expect(heroTask([{ id: "a", status: "done" }], null)).toBeUndefined();
  });
});
