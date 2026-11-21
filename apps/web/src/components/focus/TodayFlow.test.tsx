import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import ToastProvider from "@/components/ToastProvider";
import ConfirmProvider from "@/components/ConfirmProvider";
import { ProfileContext, type ProfileContextValue } from "@/hooks/useProfile";
import { SESSION_KEY } from "@/lib/focusSession";
import * as cue from "@/lib/cue";
import { FocusSessionProvider } from "./FocusSessionProvider";
import Home from "@/pages/Home";
import Projects from "@/pages/Projects";

// Node's own (flag-gated) localStorage can shadow jsdom's, so give the window a plain one.
const memory = new Map<string, string>();
Object.defineProperty(window, "localStorage", {
  configurable: true,
  value: {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => void memory.set(key, value),
    removeItem: (key: string) => void memory.delete(key),
    clear: () => memory.clear(),
    key: () => null,
    length: 0,
  },
});

vi.mock("@/lib/supabase", () => ({ supabase: {} }));
vi.mock("@/lib/cue", async () => (await import("@/test/cueMock")).mockCueModule());
vi.mock("@/lib/projectTime", async () => ({
  ...(await vi.importActual<object>("@/lib/projectTime")),
  fetchWeekProjectTime: vi.fn().mockResolvedValue(new Map([["p1", { focus: 0, coded: 10800 }]])),
}));
vi.mock("@/lib/todayData", () => ({
  flushSyncQueue: vi.fn(),
  fetchFocusStats: vi.fn().mockResolvedValue({
    last_7d_minutes: 970,
    current_streak: 2,
    total_minutes: 0,
    total_sessions: 0,
    days_active: 0,
  }),
  fetchHeatmap: vi.fn().mockResolvedValue([]),
  fetchUserProjects: vi.fn().mockResolvedValue([
    { id: "p1", name: "skillhiive", total_minutes: 30, total_sessions: 1, is_public: false, color: null, description: null, created_at: "" },
  ]),
  ensureProject: vi.fn(),
  deleteProject: vi.fn(),
  fetchMyProjects: vi.fn().mockResolvedValue([]),
  saveNote: vi.fn(),
  saveSession: vi.fn(),
}));

const profile = { profile: { id: "u1", displayname: "Ada" } } as unknown as ProfileContextValue;

function renderAt(path: string) {
  return render(
    <ProfileContext.Provider value={profile}>
      <MemoryRouter initialEntries={[path]}>
        <ToastProvider>
          <ConfirmProvider>
            <FocusSessionProvider>
              <Routes>
                <Route path="/home" element={<Home />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/focus" element={<p>Focus page</p>} />
              </Routes>
            </FocusSessionProvider>
          </ConfirmProvider>
        </ToastProvider>
      </MemoryRouter>
    </ProfileContext.Provider>,
  );
}

describe("Today", () => {
  it("shows the week and one spotlight line, completes a task in place, and starts focus", async () => {
    const user = userEvent.setup();
    memory.clear();
    renderAt("/home");
    expect(await screen.findByText(/3h this week/)).toBeTruthy();
    expect(screen.getByLabelText("Focus this week: 16h 10m")).toBeTruthy();
    expect(screen.getByRole("link", { name: /skillhiive/ }).getAttribute("href")).toBe("/projects/p1");

    await user.type(screen.getByLabelText("Add a task"), "auth refactor{Enter}");
    await user.click(screen.getByRole("button", { name: "Done: auth refactor" }));
    expect(await screen.findByText(/Done · 1/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Undo: auth refactor" }));

    await user.click(screen.getByRole("button", { name: /Start focus/ }));
    expect(await screen.findByText("Focus page")).toBeTruthy();
    expect(JSON.parse(memory.get(SESSION_KEY) ?? "null")?.active).toBe(true);
  });
});

describe("Projects", () => {
  it("lists projects as links with their time and a lock when private", async () => {
    vi.mocked(cue.fetchMyCueProjects).mockResolvedValue([]);
    vi.mocked(cue.fetchMyCueDevices).mockResolvedValue([]);
    vi.mocked(cue.fetchMyCodingVisibility).mockResolvedValue(new Map());
    vi.mocked(cue.fetchPrivateWorkSeconds).mockResolvedValue(0);
    renderAt("/projects");
    const link = await screen.findByRole("link", { name: /skillhiive/ });
    expect(link.getAttribute("href")).toBe("/projects/p1");
    expect(screen.getByRole("img", { name: "Only you" })).toBeTruthy();
    expect(screen.getByText("30m")).toBeTruthy();
  });
});
