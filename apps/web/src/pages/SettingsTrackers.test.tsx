import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import ConfirmProvider from "@/components/ConfirmProvider";
import * as cue from "@/lib/cue";
import * as tracker from "@/lib/timeTracker";
import SettingsTrackers from "./SettingsTrackers";

vi.mock("@/lib/supabase", () => ({
  supabase: { auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) } },
}));
vi.mock("@/lib/cue", async () => (await import("@/test/cueMock")).mockCueModule());
vi.mock("@/hooks/useTimeTracker", () => ({
  useTrackerConnection: () => ({ connection: null, loading: false, refresh: () => {} }),
}));
vi.mock("@/lib/timeTracker", async () => {
  const actual = await vi.importActual<typeof import("@/lib/timeTracker")>("@/lib/timeTracker");
  return {
    ...actual,
    fetchUserCodingTime: vi.fn(),
    setMyCodingStatsVisibility: vi.fn(),
    saveTrackerConnection: vi.fn(),
    deleteTrackerConnection: vi.fn(),
    triggerSync: vi.fn(),
  };
});

const device = { id: "d1", name: "rohans-air", platform: "darwin-arm64", created_at: "2026-11-01T00:00:00Z", last_seen_at: null, revoked_at: null };
const privateStats = {
  total_seconds: 3600,
  language_breakdown: [],
  daily_breakdown: [],
  current_streak_days: 0,
  longest_streak_days: 0,
  last_coded_at: null,
  is_public: false,
} as unknown as tracker.UserCodingTime;

function show() {
  return render(
    <MemoryRouter>
      <ConfirmProvider>
        <SettingsTrackers />
      </ConfirmProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(cue.fetchMyCueDevices).mockResolvedValue([device]);
  vi.mocked(cue.fetchCodingTimeSource).mockResolvedValue("cue");
  vi.mocked(tracker.fetchUserCodingTime).mockResolvedValue(privateStats);
});

describe("SettingsTrackers", () => {
  it("lets a Cue-only user put coding time on their profile", async () => {
    const user = userEvent.setup();
    vi.mocked(tracker.setMyCodingStatsVisibility).mockResolvedValue(true);
    show();
    const toggle = await screen.findByRole("switch", { name: "Show coding time on my profile" });
    await user.click(toggle);
    expect(tracker.setMyCodingStatsVisibility).toHaveBeenCalledWith(true);
    await waitFor(() => expect(toggle.getAttribute("aria-checked")).toBe("true"));
  });

  it("puts the switch back and says so when saving fails", async () => {
    const user = userEvent.setup();
    vi.mocked(tracker.setMyCodingStatsVisibility).mockResolvedValue(false);
    show();
    const toggle = await screen.findByRole("switch", { name: "Show coding time on my profile" });
    await user.click(toggle);
    expect((await screen.findByRole("alert")).textContent).toBe("Couldn't change that. Try again.");
    expect(toggle.getAttribute("aria-checked")).toBe("false");
  });

  it("has no switch without any coding time source", async () => {
    vi.mocked(cue.fetchMyCueDevices).mockResolvedValue([]);
    vi.mocked(tracker.fetchUserCodingTime).mockResolvedValue(null);
    show();
    await waitFor(() => expect(cue.fetchMyCueDevices).toHaveBeenCalled());
    await screen.findByText(/Already use Wakatime/);
    expect(screen.queryByRole("switch")).toBeNull();
  });
});
