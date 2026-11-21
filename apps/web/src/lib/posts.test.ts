import { describe, expect, it, vi } from "vitest";

vi.mock("./supabase", () => ({ supabase: {} }));

import { CAPTION_MAX, newPostRows } from "./posts";

describe("newPostRows", () => {
  it("writes a media post when no project is chosen", () => {
    const rows = newPostRows({ userId: "me", caption: "  shipped the parser  " });
    expect(rows.post).toEqual({ user_id: "me", post_type: "media", caption: "shipped the parser" });
    expect(rows.project).toBeNull();
  });

  it("files it under a project with the project_posts row the feed has always written", () => {
    const rows = newPostRows({ userId: "me", caption: "v2 is out", projectName: " Cue " });
    expect(rows.post.post_type).toBe("project");
    expect(rows.project).toEqual({ title: "Cue", description: null, started_at: null, ended_at: null, status: "active" });
  });

  it("keeps the caption within the limit and an empty one as null", () => {
    expect(newPostRows({ userId: "me", caption: "x".repeat(900) }).post.caption).toHaveLength(CAPTION_MAX);
    expect(newPostRows({ userId: "me", caption: "   ", projectName: "" }).post).toEqual({
      user_id: "me",
      post_type: "media",
      caption: null,
    });
  });
});
