import { describe, expect, it } from "vitest";
import { timeAgo } from "./timeAgo";

const NOW = Date.parse("2026-11-17T12:00:00Z");
const ago = (seconds: number) => new Date(NOW - seconds * 1000).toISOString();

describe("timeAgo", () => {
  it("gives the shortest readable age", () => {
    expect(timeAgo(ago(20), NOW)).toBe("just now");
    expect(timeAgo(ago(5 * 60), NOW)).toBe("5m");
    expect(timeAgo(ago(3 * 3600), NOW)).toBe("3h");
    expect(timeAgo(ago(2 * 86400), NOW)).toBe("2d");
  });

  it("treats a time slightly in the future as now", () => {
    expect(timeAgo(ago(-30), NOW)).toBe("just now");
  });
});
