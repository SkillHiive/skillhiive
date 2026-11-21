import { describe, expect, it } from "vitest";
import { normalizeUsername, profileErrorMessage } from "./useProfile";

describe("normalizeUsername", () => {
  it("trims and lower-cases", () => {
    expect(normalizeUsername("  RohanS ")).toBe("rohans");
  });
});

describe("profileErrorMessage", () => {
  it("says a taken username plainly", () => {
    expect(profileErrorMessage({ code: "23505", message: 'duplicate key value violates unique constraint "profiles_username_key"' })).toBe(
      "That username is taken. Try another.",
    );
  });

  it("never shows the raw database text", () => {
    const raw = 'new row for relation "profiles" violates check constraint "bio_length"';
    expect(profileErrorMessage({ code: "23514", message: raw })).not.toContain("profiles");
    expect(profileErrorMessage({ code: "XX000", message: "internal error at line 3" })).toBe("Couldn't save. Try again.");
    expect(profileErrorMessage({ message: "TypeError: Failed to fetch" })).toContain("Couldn't reach SkillHiive");
    expect(profileErrorMessage(null)).toBe("Couldn't save. Try again.");
  });
});
