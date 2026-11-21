import { describe, expect, it, vi } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import type { UserCodingTime } from "@/lib/timeTracker";
vi.mock("@/lib/supabase", () => ({ supabase: {} }));

import { ActivityCard } from "./ActivityCard";

function localKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const today = localKey(new Date());

const coding: UserCodingTime = {
  total_seconds: 20 * 3600 + 32 * 60,
  language_breakdown: [{ name: "TypeScript", total_seconds: 1800 }],
  daily_breakdown: [{ date: today, seconds: 3600 }],
  current_streak_days: 1,
  longest_streak_days: 3,
  last_coded_at: null,
  is_public: true,
};

function show(privateToOwner = false) {
  return render(
    <MemoryRouter>
      <ActivityCard
        summary={{ unit: "coding", totalSeconds: coding.total_seconds, streakDays: 1, activeDays: 1, sessions: 0 }}
        coding={coding}
        focusDays={[]}
        shipped={[{ id: "n1", body: "Shipped the heatmap", blockers: null, actual_min: 20, created_at: `${today}T12:00:00Z` }]}
        privateToOwner={privateToOwner}
      />
    </MemoryRouter>,
  );
}

describe("ActivityCard", () => {
  it("shows one coding total with its streak and days, and no sessions when there are none", async () => {
    show();
    expect(await screen.findByText("20h 32m", undefined, { timeout: 2000 })).toBeTruthy();
    expect(screen.getByText("coding")).toBeTruthy();
    expect(screen.getByText("streak")).toBeTruthy();
    expect(screen.queryByText(/session/)).toBeNull();
    expect(screen.queryByRole("link", { name: /only you/i })).toBeNull();
  });

  it("opens a day's popover on click and closes it with Escape", async () => {
    const user = userEvent.setup();
    show();
    const day = screen.getByRole("button", { name: `${today} · 1h coding` });
    await user.click(day);
    const popover = screen.getByRole("dialog");
    expect(within(popover).getByText("1h")).toBeTruthy();
    expect(within(popover).getByText("Shipped the heatmap")).toBeTruthy();
    expect(day.getAttribute("aria-pressed")).toBe("true");

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(day);
  });

  it("opens with Enter and moves between days with the arrow keys", async () => {
    const user = userEvent.setup();
    show();
    const day = screen.getByRole("button", { name: `${today} · 1h coding` });
    act(() => day.focus());
    await user.keyboard("{Enter}");
    expect(screen.getByRole("dialog")).toBeTruthy();
    await user.keyboard("{Enter}");
    expect(screen.queryByRole("dialog")).toBeNull();

    await user.keyboard("{ArrowLeft}");
    expect(document.activeElement).not.toBe(day);
    expect(document.activeElement?.getAttribute("tabindex")).toBe("0");
  });

  it("marks private coding time with a lock for the owner", () => {
    show(true);
    expect(screen.getByRole("link", { name: /only you/i }).getAttribute("href")).toBe("/settings/trackers");
  });
});
