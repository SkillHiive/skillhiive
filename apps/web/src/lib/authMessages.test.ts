import { describe, expect, it } from "vitest";
import { authErrorMessage } from "./authMessages";

describe("authErrorMessage", () => {
  it("rewrites the common Supabase auth errors", () => {
    expect(authErrorMessage({ message: "Invalid login credentials" })).toBe(
      "That email and password don't match an account.",
    );
    expect(authErrorMessage({ message: "Email not confirmed" })).toMatch(/Confirm your email/);
    expect(authErrorMessage({ message: "Email rate limit exceeded" })).toMatch(/Too many tries/);
    expect(authErrorMessage(new TypeError("Failed to fetch"))).toMatch(/Can't reach SkillHiive/);
  });

  it("passes other messages through and falls back when there is none", () => {
    expect(authErrorMessage({ message: "Password should be at least 6 characters." })).toBe(
      "Password should be at least 6 characters.",
    );
    expect(authErrorMessage(undefined, "Nope.")).toBe("Nope.");
  });
});
