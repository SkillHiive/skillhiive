import { describe, expect, it, vi } from "vitest";

vi.mock("./supabase", () => ({ supabase: {} }));

import {
  LIVE_WINDOW_MS,
  buildAllyCard,
  firstLine,
  lastRoomSeen,
  livePresence,
  newerItem,
  orderAllies,
  postTitle,
  withPresence,
  type AllyCardModel,
  type PresenceRow,
} from "./allyStrip";

const NOW = Date.parse("2026-11-21T12:00:00Z");
const ago = (ms: number) => new Date(NOW - ms).toISOString();
const row = (user_id: string, room_name: string, lastSeenAgo: number | null, joinedAgo = 60 * 60_000): PresenceRow => ({
  user_id,
  room_name,
  last_seen: lastSeenAgo === null ? null : ago(lastSeenAgo),
  joined_at: ago(joinedAgo),
});

describe("livePresence", () => {
  it("counts only rows seen within the live window", () => {
    const live = livePresence([row("a", "deep-work", 30_000), row("b", "late", LIVE_WINDOW_MS + 1)], NOW);
    expect(live.get("a")).toEqual({ room: "deep-work", seenAt: ago(30_000) });
    expect(live.has("b")).toBe(false);
  });

  it("uses the join time before the first heartbeat", () => {
    const live = livePresence([row("a", "deep-work", null, 10_000)], NOW);
    expect(live.get("a")?.room).toBe("deep-work");
  });

  it("leaves out private cubicles", () => {
    const live = livePresence([row("a", "cub_0123456789abcdef01234567", 1_000)], NOW);
    expect(live.size).toBe(0);
  });

  it("keeps the most recent room when someone has two rows", () => {
    const live = livePresence([row("a", "old", 90_000), row("a", "new", 5_000)], NOW);
    expect(live.get("a")?.room).toBe("new");
  });
});

describe("lastRoomSeen", () => {
  it("keeps the latest sighting, live or not", () => {
    const seen = lastRoomSeen([row("a", "x", 10 * 60_000), row("a", "y", 3 * 60_000)]);
    expect(seen.get("a")).toBe(ago(3 * 60_000));
  });
});

describe("text helpers", () => {
  it("takes the first non-empty line", () => {
    expect(firstLine("\n  shipped the parser \nand tests")).toBe("shipped the parser");
    expect(firstLine(null)).toBe("");
  });

  it("names a post by its project, else its caption", () => {
    const base = { id: "p", created_at: ago(0) };
    expect(postTitle({ ...base, caption: "hi", project_posts: { title: "Cue" } })).toBe("Cue");
    expect(postTitle({ ...base, caption: "hi", project_posts: [{ title: "Cue" }] })).toBe("Cue");
    expect(postTitle({ ...base, caption: "new landing page\nmore", project_posts: null })).toBe("new landing page");
  });

  it("picks the newer item", () => {
    const older = { kind: "post" as const, title: "a", at: ago(5000) };
    const newer = { kind: "shipped" as const, title: "b", at: ago(10) };
    expect(newerItem(older, newer)).toBe(newer);
    expect(newerItem(null, older)).toBe(older);
    expect(newerItem(null, null)).toBeNull();
  });
});

describe("cards", () => {
  const profile = { id: "a", username: "ana", displayname: " ", avatar: null };

  it("falls back to the username and takes the latest of post, note and room", () => {
    const post = { kind: "post" as const, title: "post", at: ago(3 * 3600_000), postId: "p1" };
    const shipped = { kind: "shipped" as const, title: "note", at: ago(2 * 3600_000) };
    const card = buildAllyCard(profile, post, shipped, [row("a", "r", 30 * 60_000)], NOW);
    expect(card.name).toBe("ana");
    expect(card.latest).toBe(shipped);
    expect(card.live).toBeNull();
    expect(card.lastActiveAt).toBe(ago(30 * 60_000));
  });

  it("orders by most recent activity, with no activity last by name", () => {
    const make = (name: string, lastActiveAt: string | null, live: AllyCardModel["live"] = null) => ({ name, lastActiveAt, live });
    const ordered = orderAllies([
      make("zed", null),
      make("old", ago(86_400_000)),
      make("amy", null),
      make("live", ago(86_400_000 * 3), { room: "r", seenAt: ago(1000) }),
      make("new", ago(60_000)),
    ]);
    expect(ordered.map((c) => c.name)).toEqual(["live", "new", "old", "amy", "zed"]);
  });

  it("refreshes presence without losing what else the card knows", () => {
    const card = buildAllyCard(profile, null, null, [row("a", "r", 10_000)], NOW);
    expect(card.live?.room).toBe("r");
    const [left] = withPresence([card], [], NOW);
    if (!left) throw new Error("no card");
    expect(left.live).toBeNull();
    expect(left.lastActiveAt).toBe(card.lastActiveAt);
    const [back] = withPresence([left], [row("a", "s", 1_000)], NOW);
    if (!back) throw new Error("no card");
    expect(back.live?.room).toBe("s");
    expect(back.lastActiveAt).toBe(ago(1_000));
  });
});
