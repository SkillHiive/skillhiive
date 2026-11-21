import { describe, expect, it } from "vitest";
import { backTarget } from "./backNav";

describe("backTarget", () => {
  it("goes back in history when the visit has an earlier page", () => {
    expect(backTarget("k3x9a", "/feed")).toEqual({ kind: "history" });
  });

  it("goes to the parent page when this is the first page of the visit", () => {
    expect(backTarget("default", "/feed")).toEqual({ kind: "route", to: "/feed" });
    expect(backTarget(undefined, "/rooms")).toEqual({ kind: "route", to: "/rooms" });
  });
});
