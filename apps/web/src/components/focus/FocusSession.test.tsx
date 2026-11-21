import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import ToastProvider from "@/components/ToastProvider";
import ConfirmProvider from "@/components/ConfirmProvider";
import { FocusSessionProvider } from "./FocusSessionProvider";
import { FocusTimerChip } from "./FocusTimerChip";
import { useFocusSession } from "@/hooks/useFocusSession";
import { SESSION_KEY } from "@/lib/focusSession";
import Focus from "@/pages/Focus";

vi.mock("@/lib/supabase", () => ({ supabase: {} }));
vi.mock("@/lib/todayData", () => ({
  fetchMyProjects: vi.fn().mockResolvedValue([]),
  saveNote: vi.fn().mockResolvedValue(undefined),
  saveSession: vi.fn().mockResolvedValue(undefined),
}));

// Node's own (flag-gated) localStorage can shadow jsdom's, so give the window a plain one.
const memory = new Map<string, string>();
const storage: Storage = {
  get length() {
    return memory.size;
  },
  clear: () => memory.clear(),
  getItem: (key) => memory.get(key) ?? null,
  key: (index) => [...memory.keys()][index] ?? null,
  removeItem: (key) => void memory.delete(key),
  setItem: (key, value) => void memory.set(key, String(value)),
};
Object.defineProperty(window, "localStorage", { value: storage, configurable: true });
const localStorage = storage;

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function seedTask(text: string) {
  localStorage.setItem(
    "skillhive:today:v1",
    JSON.stringify({
      date: todayKey(),
      tasks: [{ id: "t1", text, estimateMin: 45, status: "queued", createdAt: 0 }],
      carryFrom: [],
      captures: [],
    }),
  );
}

function seedSession(startedMsAgo: number) {
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ active: true, clock: { startedAt: Date.now() - startedMsAgo, bankedMs: 0 }, taskId: "t1", heroStart: 0 }),
  );
}

const saved = () => JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null") as { active: boolean } | null;

function Probe() {
  const { session, begin } = useFocusSession();
  return (
    <button type="button" onClick={() => begin(null)}>
      {session.active ? "on" : "off"}
    </button>
  );
}

beforeEach(() => localStorage.clear());
afterEach(() => cleanup());

describe("FocusSessionProvider", () => {
  it("keeps a started session through a reload", async () => {
    const user = userEvent.setup();
    const first = render(
      <FocusSessionProvider>
        <Probe />
      </FocusSessionProvider>,
    );
    await user.click(screen.getByRole("button", { name: "off" }));
    expect(screen.getByRole("button", { name: "on" })).toBeTruthy();
    expect(saved()?.active).toBe(true);
    first.unmount();

    render(
      <FocusSessionProvider>
        <Probe />
      </FocusSessionProvider>,
    );
    expect(screen.getByRole("button", { name: "on" })).toBeTruthy();
  });
});

describe("FocusTimerChip", () => {
  it("shows the time left and links back to focus", () => {
    seedSession(60_000);
    render(
      <MemoryRouter>
        <FocusSessionProvider>
          <FocusTimerChip />
        </FocusSessionProvider>
      </MemoryRouter>,
    );
    const chip = screen.getByRole("link", { name: /49:00 left/ });
    expect(chip.getAttribute("href")).toBe("/focus");
  });
});

describe("Focus page", () => {
  function renderFocus() {
    return render(
      <MemoryRouter initialEntries={["/home", "/focus"]} initialIndex={1}>
        <ToastProvider>
          <ConfirmProvider>
            <FocusSessionProvider>
              <Routes>
                <Route path="/home" element={<p>Today page</p>} />
                <Route path="/focus" element={<Focus />} />
              </Routes>
            </FocusSessionProvider>
          </ConfirmProvider>
        </ToastProvider>
      </MemoryRouter>,
    );
  }

  it("steps back to Today on Esc and leaves the session running", async () => {
    const user = userEvent.setup();
    seedTask("auth refactor");
    seedSession(5 * 60_000);
    renderFocus();
    expect(screen.getByText("auth refactor")).toBeTruthy();
    await user.keyboard("{Escape}");
    expect(await screen.findByText("Today page")).toBeTruthy();
    expect(saved()?.active).toBe(true);
  });

  it("asks before ending a session with unsaved time, then ends it", async () => {
    const user = userEvent.setup();
    seedTask("auth refactor");
    seedSession(5 * 60_000);
    renderFocus();
    await user.click(screen.getByRole("button", { name: "End" }));
    expect(await screen.findByText("End session?")).toBeTruthy();
    expect(saved()?.active).toBe(true);
    const buttons = screen.getAllByRole("button", { name: "End" });
    await user.click(buttons[buttons.length - 1]!);
    expect(await screen.findByText("Today page")).toBeTruthy();
    expect(saved()).toBeNull();
  });

  it("ends a session with nothing unsaved without asking", async () => {
    const user = userEvent.setup();
    seedTask("auth refactor");
    seedSession(10_000);
    renderFocus();
    await user.click(screen.getByRole("button", { name: "End" }));
    expect(await screen.findByText("Today page")).toBeTruthy();
    expect(screen.queryByText("End session?")).toBeNull();
    expect(saved()).toBeNull();
  });
});
