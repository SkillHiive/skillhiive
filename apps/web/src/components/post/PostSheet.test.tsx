import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import { MemoryRouter, Route, Routes, useLocation, type InitialEntry } from "react-router";
import type { Session } from "@supabase/supabase-js";
import * as postDetail from "@/lib/postDetail";
import { useBackgroundLocation } from "@/lib/postSheet";
import { AuthContext } from "@/hooks/authContext";
import { ProfileContext, type ProfileContextValue } from "@/hooks/useProfile";
import ConfirmProvider from "@/components/ConfirmProvider";
import ToastProvider from "@/components/ToastProvider";
import { PostCard, type PostModel } from "@/components/feed/PostCards";
import Post from "@/pages/Post";
import { PostSheet } from "./PostSheet";

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
  return { ...actual, fetchPostDetail: vi.fn(), fetchComments: vi.fn(), deletePost: vi.fn() };
});

vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

const card: PostModel = {
  id: "p1",
  user_id: "u1",
  post_type: "media",
  caption: "Shipped it",
  likes_count: 0,
  comments_count: 0,
  created_at: "2026-07-17T10:00:00Z",
  profiles: { id: "u1", username: "ada", avatar: null },
  project_posts: null,
  offer_posts: null,
  post_images: null,
};

let feedMounts = 0;

/** Stands in for the feed: counts its mounts and opens posts the way the feed does. */
function FakeFeed() {
  useEffect(() => {
    feedMounts += 1;
  }, []);
  return (
    <main aria-label="Feed">
      <PostCard post={card} sheet />
    </main>
  );
}

/** The same routing as Layout.tsx's AppRoutes, cut down to the two routes involved. */
function Routing() {
  const location = useLocation();
  const background = useBackgroundLocation();
  return (
    <>
      <div key={(background ?? location).pathname}>
        <Routes location={background ?? location}>
          <Route path="/feed" element={<FakeFeed />} />
          <Route path="/post/:postId" element={<Post />} />
        </Routes>
      </div>
      {background && (
        <Routes>
          <Route path="/post/:postId" element={<PostSheet />} />
        </Routes>
      )}
    </>
  );
}

function show(initialEntries: InitialEntry[] = ["/feed"]) {
  const profileValue: ProfileContextValue = {
    profile: {
      id: "u1",
      username: "ada",
      avatar: null,
      banner: null,
      bio: null,
      displayname: "Ada",
      created_at: "2026-01-01T00:00:00Z",
      email: "x@example.com",
    },
    loading: false,
    error: null,
    updateField: vi.fn(),
    reload: async () => {},
  };
  return render(
    <AuthContext.Provider value={{ user: { id: "u1" } } as Session}>
      <ProfileContext.Provider value={profileValue}>
        <ConfirmProvider>
          <ToastProvider>
            <MemoryRouter initialEntries={initialEntries} initialIndex={initialEntries.length - 1}>
              <Routing />
            </MemoryRouter>
          </ToastProvider>
        </ConfirmProvider>
      </ProfileContext.Provider>
    </AuthContext.Provider>,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  feedMounts = 0;
  vi.mocked(postDetail.fetchPostDetail).mockResolvedValue({
    id: "p1",
    user_id: "u1",
    post_type: "media",
    caption: "Shipped it, in full",
    likes_count: 0,
    comments_count: 0,
    created_at: "2026-07-17T10:00:00Z",
    author: { id: "u1", username: "ada", displayname: "Ada", avatar: null },
    project: null,
    offer: null,
    images: [],
  });
  vi.mocked(postDetail.fetchComments).mockResolvedValue([]);
  vi.mocked(postDetail.deletePost).mockResolvedValue();
});

describe("post sheet routing", () => {
  it("opens a feed post in a sheet over the still-mounted feed, and closes back to it", async () => {
    const user = userEvent.setup();
    show();
    await user.click(screen.getByText("Shipped it"));

    const sheet = await screen.findByRole("dialog");
    expect(await within(sheet).findByText("Shipped it, in full")).toBeTruthy();
    // The feed is still there underneath, never remounted.
    expect(screen.getByText("Shipped it")).toBeTruthy();
    expect(feedMounts).toBe(1);
    // The sheet has a close button, not a back link.
    expect(within(sheet).queryByRole("link", { name: /Back|Feed/ })).toBeNull();

    await user.click(within(sheet).getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByText("Shipped it")).toBeTruthy();
    expect(feedMounts).toBe(1);
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    show();
    await user.click(screen.getByText("Shipped it"));
    await within(await screen.findByRole("dialog")).findByText("Shipped it, in full");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(feedMounts).toBe(1);
  });

  it("removes a post deleted in the sheet and returns to the feed", async () => {
    const user = userEvent.setup();
    const changes: postDetail.PostChange[] = [];
    const off = postDetail.onPostChange((c) => changes.push(c));
    show();
    await user.click(screen.getByText("Shipped it"));
    const sheet = await screen.findByRole("dialog");
    await user.click(await within(sheet).findByRole("button", { name: "More" }));
    await user.click(screen.getByRole("menuitem", { name: "Delete" }));
    const confirm = await screen.findByRole("dialog", { name: "Delete post?" });
    await user.click(within(confirm).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(changes).toContainEqual({ id: "p1", deleted: true });
    expect(feedMounts).toBe(1);
    off();
  });

  it("shows the full page on a refresh, even though history still names the feed", async () => {
    const feed = { pathname: "/feed", search: "", hash: "", state: null, key: "f1" };
    show([{ pathname: "/post/p1", state: { backgroundLocation: feed } }]);
    expect(await screen.findByText("Shipped it, in full")).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("link", { name: /Feed/ })).toBeTruthy();
    expect(feedMounts).toBe(0);
  });
});
