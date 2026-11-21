import { describe, expect, it, vi } from "vitest";
import { authorHref, authorName, normalizePost, offerLine, shortDate } from "./postDetail";
import { backgroundFrom, honourBackground, postSheetState } from "./postSheet";

vi.mock("./supabase", () => ({ supabase: {} }));

describe("normalizePost", () => {
  it("flattens one-item relations and orders the pictures", () => {
    const post = normalizePost({
      id: "p1",
      user_id: "u1",
      post_type: "project",
      caption: "hi",
      likes_count: null,
      comments_count: 2,
      created_at: "2026-07-17T10:00:00Z",
      profiles: [{ id: "u1", username: "ada", avatar: null }],
      project_posts: [{ title: "skillhiive", description: null }],
      offer_posts: [],
      post_images: [
        { url: "b", sort_order: 1 },
        { url: "a", sort_order: 0 },
      ],
    });
    expect(post.author).toEqual({ id: "u1", username: "ada", displayname: null, avatar: null });
    expect(post.project).toEqual({ title: "skillhiive", description: null });
    expect(post.offer).toBeNull();
    expect(post.images).toEqual(["a", "b"]);
    expect(post.likes_count).toBe(0);
  });
});

describe("names and links", () => {
  it("prefers the display name and links by username", () => {
    const a = { id: "u1", username: "ada", displayname: "Ada L", avatar: null };
    expect(authorName(a)).toBe("Ada L");
    expect(authorName({ ...a, displayname: " " })).toBe("ada");
    expect(authorHref(a)).toBe("/p/ada");
    expect(authorHref({ ...a, username: null })).toBe("/profile/u1");
    expect(authorHref(null, "u9")).toBe("/profile/u9");
  });
});

describe("shortDate", () => {
  const now = new Date("2026-11-21T12:00:00Z").getTime();
  it("is relative within a day, then a short date", () => {
    expect(shortDate("2026-11-21T10:00:00Z", now)).toBe("2h");
    expect(shortDate("2026-07-17T10:00:00Z", now, "en-US")).toBe("Jul 17");
    expect(shortDate("2025-07-17T10:00:00Z", now, "en-US")).toBe("Jul 17, 2025");
  });
});

describe("offerLine", () => {
  it("reads an old offer as one line", () => {
    expect(
      offerLine({ role: "Engineer", company: "Acme", offer_type: "full_time", location: null, salary_range: "" }),
    ).toBe("Engineer · Acme · Full-time");
    expect(offerLine(null)).toBeNull();
  });
});

describe("post sheet state", () => {
  const feed = { pathname: "/feed", search: "", hash: "", state: null, key: "k1" };
  it("carries the page underneath, and the comment focus", () => {
    expect(postSheetState(feed)).toEqual({ backgroundLocation: feed });
    expect(postSheetState(feed, { focusComment: true })).toEqual({ backgroundLocation: feed, focusComment: true });
    expect(backgroundFrom({ backgroundLocation: feed })).toBe(feed);
    expect(backgroundFrom({ focusComment: true })).toBeNull();
    expect(backgroundFrom(null)).toBeNull();
  });

  it("ignores it on the first location of a visit (a refresh) until the visitor moves", () => {
    expect(honourBackground("a", "a", false)).toBe(false);
    expect(honourBackground("b", "a", false)).toBe(true);
    expect(honourBackground("a", "a", true)).toBe(true);
  });
});
