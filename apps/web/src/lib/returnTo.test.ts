import { describe, expect, it } from "vitest";
import { loginUrlFor, registerUrlFor, safeNext, withNext } from "./returnTo";

describe("safeNext", () => {
  it("accepts a path on this site, keeping its query", () => {
    expect(safeNext("?next=%2Flink%3Fcode%3DABCD-2345")).toBe("/link?code=ABCD-2345");
    expect(safeNext("?x=1&next=/settings/trackers")).toBe("/settings/trackers");
  });

  it("refuses anything that could leave the site or loop", () => {
    for (const value of ["https://evil.test", "//evil.test", "/\\evil.test", "javascript:alert(1)", "evil", "", "/login", "/login?next=/x", "/register", "/register?next=/x"]) {
      expect(safeNext("?next=" + encodeURIComponent(value))).toBeNull();
    }
    expect(safeNext("")).toBeNull();
  });

  it("round-trips through loginUrlFor", () => {
    const here = "/link?code=ABCD-2345";
    const url = loginUrlFor(here);
    expect(url).toBe("/login?next=%2Flink%3Fcode%3DABCD-2345");
    expect(safeNext(url.slice(url.indexOf("?")))).toBe(here);
  });

  it("carries the destination to the sign-up page and between the two", () => {
    const here = "/link?code=ABCD-2345";
    const url = registerUrlFor(here);
    expect(url).toBe("/register?next=%2Flink%3Fcode%3DABCD-2345");
    expect(safeNext(url.slice(url.indexOf("?")))).toBe(here);
    expect(withNext("/login", here)).toBe(loginUrlFor(here));
    expect(withNext("/register", null)).toBe("/register");
    // Only the sign-up page itself is refused, not a path that merely starts the same way.
    expect(safeNext("?next=%2Fregisters")).toBe("/registers");
  });
});
