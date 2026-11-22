import { describe, expect, it } from "vitest";
import { openRoomCount, readCommits, serviceStatus, sinceLabel, statusLabel } from "./landing";

describe("serviceStatus", () => {
  it("counts services whose latest beat is up or in maintenance", () => {
    const data = {
      heartbeatList: {
        "1": [{ status: 0 }, { status: 1 }],
        "2": [{ status: 1 }, { status: 0 }],
        "3": [{ status: 3 }],
        "4": [],
      },
    };
    expect(serviceStatus(data)).toEqual({ up: 2, total: 3 });
  });

  it("makes no claim from data it can't read", () => {
    expect(serviceStatus(null)).toBeNull();
    expect(serviceStatus({})).toBeNull();
    expect(serviceStatus({ heartbeatList: { "1": [{ status: "up" }] } })).toBeNull();
  });
});

describe("statusLabel", () => {
  it("says up, or how many are down", () => {
    expect(statusLabel({ up: 3, total: 3 })).toBe("up");
    expect(statusLabel({ up: 2, total: 3 })).toBe("1 of 3 down");
  });
});

describe("openRoomCount", () => {
  it("counts rooms with people in them and names the token server accepts", () => {
    expect(
      openRoomCount([
        { room_name: "deep-work", participant_count: 3 },
        { room_name: "writing", participant_count: 0 },
        { room_name: "Deep workw", participant_count: 1 },
        { room_name: "design", participant_count: 1 },
      ]),
    ).toBe(2);
  });
});

describe("sinceLabel", () => {
  const now = Date.parse("2026-11-22T12:00:00Z");
  it("reads as a short age", () => {
    expect(sinceLabel(now - 20_000, now)).toBe("just now");
    expect(sinceLabel(now - 12 * 60_000, now)).toBe("12m ago");
    expect(sinceLabel(now - 3 * 3_600_000, now)).toBe("3h ago");
    expect(sinceLabel(now - 4 * 86_400_000, now)).toBe("4d ago");
    expect(sinceLabel(now - 90 * 86_400_000, now)).toBe("3mo ago");
    expect(sinceLabel(now + 60_000, now)).toBe("just now");
  });
});

describe("readCommits", () => {
  const item = (sha: string, message: string, date: string, url?: string) => ({
    sha,
    html_url: url,
    commit: { message, author: { date } },
  });

  it("parses each repository's commits, newest first, keeping only GitHub links", () => {
    const raw = [
      {
        repo: "skillhiive",
        items: [
          item("aaaaaaa1", "feat(rooms): rooms stay with you\n\nbody", "2026-11-22T10:00:00Z", "https://github.com/SkillHiive/skillhiive/commit/a"),
          item("bbbbbbb2", "Merge pull request #10", "2026-11-22T11:00:00Z"),
        ],
      },
      { repo: "backend", items: [item("ccccccc3", "Check room names", "2026-11-22T11:30:00Z", "javascript:alert(1)")] },
      { repo: 4, items: [] },
      null,
    ];
    expect(readCommits(raw)).toEqual([
      { repo: "backend", kind: "commit", message: "Check room names", at: Date.parse("2026-11-22T11:30:00Z"), url: undefined },
      {
        repo: "skillhiive",
        kind: "feat",
        message: "rooms stay with you",
        at: Date.parse("2026-11-22T10:00:00Z"),
        url: "https://github.com/SkillHiive/skillhiive/commit/a",
      },
    ]);
  });

  it("is empty when the build couldn't reach GitHub", () => {
    expect(readCommits([])).toEqual([]);
    expect(readCommits("nope")).toEqual([]);
  });
});
