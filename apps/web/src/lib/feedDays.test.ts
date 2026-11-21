import { describe, expect, it } from "vitest";
import { dayKey, dayLabel, groupByDay } from "./feedDays";

// Local noon, so the tests hold in any time zone.
const NOW = new Date(2026, 10, 21, 12, 0, 0).getTime();
const at = (y: number, m: number, d: number, h = 9) => new Date(y, m - 1, d, h).toISOString();

describe("dayKey", () => {
  it("uses the local calendar day", () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
    expect(dayKey(new Date(2026, 0, 6, 0, 1))).toBe("2026-01-06");
  });
});

describe("dayLabel", () => {
  it("names today and yesterday", () => {
    expect(dayLabel("2026-11-21", NOW)).toBe("Today");
    expect(dayLabel("2026-11-20", NOW)).toBe("Yesterday");
  });

  it("names yesterday across a month boundary", () => {
    const firstOfMonth = new Date(2026, 11, 1, 12).getTime();
    expect(dayLabel("2026-11-30", firstOfMonth)).toBe("Yesterday");
  });

  it("gives a short date for older days, with the year only when it differs", () => {
    expect(dayLabel("2026-11-17", NOW, "en-US")).toBe("Tue, Nov 17");
    expect(dayLabel("2025-11-17", NOW, "en-US")).toBe("Nov 17, 2025");
  });
});

describe("groupByDay", () => {
  it("groups consecutive posts by day and keeps their order", () => {
    const posts = [
      { id: "a", created_at: at(2026, 11, 21, 11) },
      { id: "b", created_at: at(2026, 11, 21, 8) },
      { id: "c", created_at: at(2026, 11, 20) },
      { id: "d", created_at: at(2026, 11, 3) },
    ];
    const groups = groupByDay(posts, NOW, "en-US");
    expect(groups.map((g) => g.label)).toEqual(["Today", "Yesterday", "Tue, Nov 3"]);
    expect(groups.map((g) => g.items.map((p) => p.id))).toEqual([["a", "b"], ["c"], ["d"]]);
    expect(groups.map((g) => g.start)).toEqual([0, 2, 3]);
  });

  it("returns nothing for no posts", () => {
    expect(groupByDay([], NOW)).toEqual([]);
  });
});
