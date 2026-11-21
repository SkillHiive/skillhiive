import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router";
import type { Session } from "@supabase/supabase-js";
import * as postDetail from "@/lib/postDetail";
import type { PostComment, PostDetail } from "@/lib/postDetail";
import { AuthContext } from "@/hooks/authContext";
import { ProfileContext, type ProfileContextValue } from "@/hooks/useProfile";
import ConfirmProvider from "@/components/ConfirmProvider";
import ToastProvider from "@/components/ToastProvider";
import Post from "@/pages/Post";

// ActionRow asks whether you liked the post; every query answers "no rows".
vi.mock("@/lib/supabase", () => {
  const chain: Record<string, unknown> = new Proxy(
    {},
    {
      get: (_t, prop) =>
        prop === "then" ? (resolve: (v: unknown) => void) => resolve({ data: null, error: null }) : () => chain,
    },
  );
  return { supabase: { from: () => chain } };
});

vi.mock("@/lib/postDetail", async () => {
  const actual = await vi.importActual<typeof import("@/lib/postDetail")>("@/lib/postDetail");
  return {
    ...actual,
    fetchPostDetail: vi.fn(),
    fetchComments: vi.fn(),
    addComment: vi.fn(),
    deleteComment: vi.fn(),
    deletePost: vi.fn(),
    updateCaption: vi.fn(),
  };
});

// Headless UI's menu watches its button's size; jsdom has no ResizeObserver.
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

const m = {
  post: vi.mocked(postDetail.fetchPostDetail),
  comments: vi.mocked(postDetail.fetchComments),
  add: vi.mocked(postDetail.addComment),
  removeComment: vi.mocked(postDetail.deleteComment),
  removePost: vi.mocked(postDetail.deletePost),
  caption: vi.mocked(postDetail.updateCaption),
};

const ada = { id: "u1", username: "ada", displayname: "Ada", avatar: null };
const bob = { id: "u2", username: "bob", displayname: null, avatar: null };

function makePost(over: Partial<PostDetail> = {}): PostDetail {
  return {
    id: "p1",
    user_id: "u1",
    post_type: "media",
    caption: "Shipped the new sync engine\nwith retries",
    likes_count: 0,
    comments_count: 1,
    created_at: "2026-07-17T10:00:00Z",
    author: ada,
    project: null,
    offer: null,
    images: ["https://img.example/a.jpg"],
    ...over,
  };
}

const firstComment: PostComment = {
  id: "c1",
  body: "Nice work",
  created_at: "2026-07-17T11:00:00Z",
  user_id: "u2",
  author: bob,
};

function show({ me = "u1", children }: { me?: string; children?: ReactNode } = {}) {
  const profile = {
    id: me,
    username: me === "u1" ? "ada" : "bob",
    avatar: null,
    banner: null,
    bio: null,
    displayname: me === "u1" ? "Ada" : "",
    created_at: "2026-01-01T00:00:00Z",
    email: "x@example.com",
  };
  const profileValue: ProfileContextValue = {
    profile,
    loading: false,
    error: null,
    updateField: vi.fn(),
    reload: async () => {},
  };
  return render(
    <AuthContext.Provider value={{ user: { id: me } } as Session}>
      <ProfileContext.Provider value={profileValue}>
        <ConfirmProvider>
          <ToastProvider>
            <MemoryRouter initialEntries={["/post/p1"]}>
              <Routes>
                <Route path="/post/:postId" element={<Post />} />
                <Route path="/feed" element={<div>feed page</div>} />
              </Routes>
              {children}
            </MemoryRouter>
          </ToastProvider>
        </ConfirmProvider>
      </ProfileContext.Provider>
    </AuthContext.Provider>,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  m.post.mockResolvedValue(makePost());
  m.comments.mockResolvedValue([firstComment]);
  m.removePost.mockResolvedValue();
  m.removeComment.mockResolvedValue();
});

describe("PostView", () => {
  it("puts the person's words before the picture, without a type badge", async () => {
    show();
    const caption = await screen.findByText(/Shipped the new sync engine/);
    const img = screen.getByRole("img", { name: /Shipped the new sync engine/ });
    expect(caption.compareDocumentPosition(img) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // Line breaks are kept.
    expect(caption.textContent).toBe("Shipped the new sync engine\nwith retries");
    expect(screen.queryByText("Media")).toBeNull();
    // Author links to their public page.
    expect(screen.getByRole("link", { name: /Ada/ }).getAttribute("href")).toBe("/p/ada");
  });

  it("shows the project chip only when the post has a project", async () => {
    m.post.mockResolvedValue(makePost({ post_type: "project", project: { title: "skillhiive", description: null } }));
    show();
    expect(await screen.findByText("skillhiive")).toBeTruthy();
    expect(screen.queryByText("Project")).toBeNull();
  });

  it("gives the owner a ⋯ menu with Edit and Delete, and a visitor none", async () => {
    const user = userEvent.setup();
    const { unmount } = show({ me: "u1" });
    await user.click(await screen.findByRole("button", { name: "More" }));
    expect(screen.getByRole("menuitem", { name: "Edit" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Delete" })).toBeTruthy();
    unmount();

    show({ me: "u3" });
    await screen.findByText(/Shipped the new sync engine/);
    expect(screen.queryByRole("button", { name: "More" })).toBeNull();
    expect(screen.queryByRole("button", { name: /delete/i })).toBeNull();
  });

  it("asks before deleting the post, then leaves for the feed", async () => {
    const user = userEvent.setup();
    show();
    await user.click(await screen.findByRole("button", { name: "More" }));
    await user.click(screen.getByRole("menuitem", { name: "Delete" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Delete post?")).toBeTruthy();
    expect(m.removePost).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(m.removePost).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "More" }));
    await user.click(screen.getByRole("menuitem", { name: "Delete" }));
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Delete" }));
    expect(m.removePost).toHaveBeenCalledWith("p1");
    expect(await screen.findByText("feed page")).toBeTruthy();
    expect(screen.getByText("Post deleted")).toBeTruthy();
  });

  it("shows a sent comment at once and takes it back, with an error, if it fails", async () => {
    const user = userEvent.setup();
    let fail: (e: Error) => void = () => {};
    m.add.mockImplementation(() => new Promise((_, reject) => (fail = reject)));
    show();
    const box = await screen.findByRole("textbox", { name: "Reply" });
    await user.type(box, "Love it{Enter}");

    const line = screen.getByText("Love it", { selector: "p" });
    expect(line.closest("li")?.getAttribute("aria-busy")).toBe("true");
    expect(line.closest("li")?.className).toContain("ui-rise");
    expect((box as HTMLTextAreaElement).value).toBe("");
    expect(m.add).toHaveBeenCalledWith("p1", "u1", "Love it");

    fail(new Error("network"));
    await waitFor(() => expect(screen.queryByText("Love it", { selector: "p" })).toBeNull());
    expect(await screen.findByText("Couldn't send. Try again.")).toBeTruthy();
    // The words come back so nothing is lost.
    expect((box as HTMLTextAreaElement).value).toBe("Love it");
  });

  it("keeps a comment once the server has it; Shift+Enter is a new line", async () => {
    const user = userEvent.setup();
    m.add.mockImplementation(async (_p, _u, body) => ({
      id: "c2",
      body,
      created_at: new Date().toISOString(),
      user_id: "u1",
      author: ada,
    }));
    show();
    const box = await screen.findByRole("textbox", { name: "Reply" });
    await user.type(box, "one{Shift>}{Enter}{/Shift}two");
    expect(m.add).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Send" }));
    expect(m.add).toHaveBeenCalledWith("p1", "u1", "one\ntwo");
    await waitFor(() => expect(screen.getByText(/one\s+two/).closest("li")?.getAttribute("aria-busy")).toBeNull());
  });

  it("asks before deleting your own comment", async () => {
    const user = userEvent.setup();
    m.comments.mockResolvedValue([{ ...firstComment, user_id: "u1", author: ada }]);
    show();
    await user.click(await screen.findByRole("button", { name: "Delete comment" }));
    expect(m.removeComment).not.toHaveBeenCalled();
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Delete" }));
    expect(m.removeComment).toHaveBeenCalledWith("c1");
    await waitFor(() => expect(screen.queryByText("Nice work")).toBeNull());
  });

  it("puts a comment back, with an error, when deleting it fails", async () => {
    const user = userEvent.setup();
    m.comments.mockResolvedValue([{ ...firstComment, user_id: "u1", author: ada }]);
    m.removeComment.mockRejectedValue(new Error("nope"));
    show();
    await user.click(await screen.findByRole("button", { name: "Delete comment" }));
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Delete" }));
    expect(await screen.findByText("Couldn't delete. Try again.")).toBeTruthy();
    expect(screen.getByText("Nice work")).toBeTruthy();
  });

  it("edits the caption in place", async () => {
    const user = userEvent.setup();
    m.caption.mockResolvedValue("Better words");
    show();
    await user.click(await screen.findByRole("button", { name: "More" }));
    await user.click(screen.getByRole("menuitem", { name: "Edit" }));
    const field = screen.getByRole("textbox", { name: "Caption" });
    await user.clear(field);
    await user.type(field, "Better words");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(m.caption).toHaveBeenCalledWith("p1", "Better words");
    expect(await screen.findByText("Better words", { selector: "p" })).toBeTruthy();
    expect(screen.queryByRole("textbox", { name: "Caption" })).toBeNull();
  });

  it("says when a post doesn't exist, with a way back", async () => {
    m.post.mockResolvedValue(null);
    show();
    expect(await screen.findByText("Post not found")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Feed/ })).toBeTruthy();
  });

  it("offers a retry when loading fails", async () => {
    const user = userEvent.setup();
    m.post.mockRejectedValueOnce(new Error("Failed to fetch"));
    show();
    expect(await screen.findByRole("alert")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText(/Shipped the new sync engine/)).toBeTruthy();
  });
});
