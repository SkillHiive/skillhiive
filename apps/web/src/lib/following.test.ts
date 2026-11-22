import { describe, expect, it, vi } from "vitest";

vi.mock("./supabase", () => ({ supabase: {} }));
vi.mock("./todayData", () => ({ fetchRecentShipped: vi.fn() }));

import { firstLine, newerWork, orderFollowing } from "./following";

describe("following", () => {
  it("takes the first non-empty line", () => {
    expect(firstLine("\n  Shipped the PiP window \nmore")).toBe("Shipped the PiP window");
    expect(firstLine(null)).toBe("");
  });

  it("keeps the newer piece of work", () => {
    const a = { title: "a", at: "2026-11-20T10:00:00Z" };
    const b = { title: "b", at: "2026-11-21T10:00:00Z" };
    expect(newerWork(a, b)).toBe(b);
    expect(newerWork(null, a)).toBe(a);
    expect(newerWork(a, null)).toBe(a);
  });

  it("orders by latest work, then people with none by name", () => {
    const people = [
      { name: "zed", latest: null },
      { name: "amy", latest: { title: "x", at: "2026-11-01T00:00:00Z" } },
      { name: "bob", latest: { title: "y", at: "2026-11-20T00:00:00Z" } },
      { name: "cat", latest: null },
    ];
    expect(orderFollowing(people).map((p) => p.name)).toEqual(["bob", "amy", "cat", "zed"]);
  });
});
