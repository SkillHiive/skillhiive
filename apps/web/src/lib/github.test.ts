import { describe, expect, it } from "vitest";
import { parseRepoCommits, shortAge } from "./github";

const DAY = 86_400_000;
const NOW = Date.parse("2026-11-17T12:00:00Z");

describe("shortAge", () => {
  it("rounds to days, weeks and months", () => {
    expect(shortAge(NOW - 2 * 3_600_000, NOW)).toBe("today");
    expect(shortAge(NOW - 3 * DAY, NOW)).toBe("3d");
    expect(shortAge(NOW - 20 * DAY, NOW)).toBe("2w");
    expect(shortAge(NOW - 95 * DAY, NOW)).toBe("3mo");
  });
});

describe("parseRepoCommits", () => {
  it("reads conventional commits and plain ones, newest data intact", () => {
    const entries = parseRepoCommits(
      "web",
      [
        {
          sha: "abcdef1234567",
          html_url: "https://github.com/x/web/commit/abcdef1",
          commit: { message: "feat(rooms): lock mics during focus\n\nbody", author: { date: "2026-11-16T10:00:00Z" } },
        },
        {
          sha: "1234567abcdef",
          commit: { message: "Keep Cue projects private", author: { date: "2026-11-17T09:00:00Z" } },
        },
      ],
      NOW,
    );
    expect(entries).toEqual([
      expect.objectContaining({ hash: "abcdef1", repo: "web", kind: "feat", scope: "rooms", message: "lock mics during focus", date: "1d" }),
      expect.objectContaining({ hash: "1234567", kind: "commit", message: "Keep Cue projects private", date: "today" }),
    ]);
  });

  it("skips merges, malformed items and non-arrays", () => {
    expect(parseRepoCommits("web", { message: "rate limited" }, NOW)).toEqual([]);
    expect(
      parseRepoCommits(
        "web",
        [
          { sha: "a", commit: { message: "Merge pull request #1", author: { date: "2026-11-17T09:00:00Z" } } },
          { sha: "b", commit: { message: "x" } },
          null,
        ],
        NOW,
      ),
    ).toEqual([]);
  });
});
