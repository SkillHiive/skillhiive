import { describe, expect, it } from "vitest";
import { orderQueue, restoreToday, type TodayState, type TodayTask } from "./useToday";

const task = (id: string, status: TodayTask["status"]): TodayTask => ({
  id,
  text: `task ${id}`,
  estimateMin: 45,
  status,
  createdAt: 0,
});

const saved = (state: TodayState) => JSON.stringify(state);

describe("restoreToday", () => {
  it("starts empty with nothing saved or unreadable data", () => {
    for (const raw of [null, "", "not json", "null", "42"]) {
      expect(restoreToday(raw, "2026-11-20")).toEqual({
        date: "2026-11-20",
        tasks: [],
        carryFrom: [],
        captures: [],
      });
    }
  });

  it("keeps the same day as saved", () => {
    const state: TodayState = {
      date: "2026-11-20",
      tasks: [task("a", "queued"), task("b", "done")],
      carryFrom: [{ id: "c", text: "old", estimateMin: 30 }],
      captures: [{ id: "n", text: "note", createdAt: 1 }],
    };
    expect(restoreToday(saved(state), "2026-11-20")).toEqual(state);
  });

  it("carries unfinished tasks and drops done ones on a new day", () => {
    const state: TodayState = {
      date: "2026-11-19",
      tasks: [task("a", "queued"), task("b", "done"), task("c", "carried")],
      carryFrom: [],
      captures: [{ id: "n", text: "note", createdAt: 1 }],
    };
    const next = restoreToday(saved(state), "2026-11-20");
    expect(next.date).toBe("2026-11-20");
    expect(next.tasks).toEqual([]);
    expect(next.captures).toEqual([]);
    expect(next.carryFrom).toEqual([
      { id: "a", text: "task a", estimateMin: 45 },
      { id: "c", text: "task c", estimateMin: 45 },
    ]);
  });

  it("keeps carry items nobody acted on after a skipped day", () => {
    // Day 1 left "a" open. Day 2 was opened (so "a" became a carry item) but
    // nothing was added or dismissed. Day 3 must still show "a".
    const day1: TodayState = {
      date: "2026-11-18",
      tasks: [task("a", "queued")],
      carryFrom: [],
      captures: [],
    };
    const day2 = restoreToday(saved(day1), "2026-11-19");
    const day3 = restoreToday(saved(day2), "2026-11-21");
    expect(day3.carryFrom).toEqual([
      { id: "a", text: "task a", estimateMin: 45 },
    ]);
  });

  it("merges older carry items with new open tasks without duplicates", () => {
    const state: TodayState = {
      date: "2026-11-19",
      tasks: [task("b", "queued"), task("a", "queued")],
      carryFrom: [
        { id: "a", text: "task a", estimateMin: 45 },
        { id: "z", text: "older", estimateMin: 15 },
      ],
      captures: [],
    };
    const next = restoreToday(saved(state), "2026-11-20");
    expect(next.carryFrom.map((c) => c.id)).toEqual(["a", "z", "b"]);
  });

  it("skips malformed entries", () => {
    const raw = JSON.stringify({
      date: "2026-11-19",
      tasks: [null, { id: "x", status: "queued" }, task("a", "queued")],
      carryFrom: ["junk", { id: "y", text: "  " }],
      captures: [],
    });
    expect(restoreToday(raw, "2026-11-20").carryFrom).toEqual([
      { id: "a", text: "task a", estimateMin: 45 },
    ]);
  });
});

describe("orderQueue", () => {
  const tasks = [task("a", "queued"), task("d", "done"), task("b", "queued"), task("c", "queued")];
  const ids = (list: TodayTask[]) => list.map((t) => t.id);

  it("puts the queued tasks in the dragged order and keeps the rest", () => {
    expect(ids(orderQueue(tasks, ["c", "a", "b"]))).toEqual(["c", "a", "b", "d"]);
  });

  it("keeps queued tasks the order left out, and ignores unknown or finished ids", () => {
    expect(ids(orderQueue(tasks, ["b", "zz", "d"]))).toEqual(["b", "a", "c", "d"]);
  });
});
