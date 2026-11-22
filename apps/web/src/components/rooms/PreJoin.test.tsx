import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { PreJoin } from "./PreJoin";
import { LeaveSheet } from "./LeaveSheet";

// The sheet formats time with lib/timeTracker, which imports the Supabase client.
vi.mock("@/lib/supabase", () => ({ supabase: {} }));

const NOW = new Date("2026-11-20T10:00:00.000Z").getTime();
const minutesAgo = (m: number) => new Date(NOW - m * 60_000).toISOString();

function renderPreJoin(props: Partial<React.ComponentProps<typeof PreJoin>> = {}) {
  const onJoin = vi.fn();
  render(
    <MemoryRouter>
      <PreJoin
        roomName="deep-work"
        username="rohan"
        avatar={null}
        count={3}
        sessionStartedAt={minutesAgo(10)}
        clockOffsetMs={0}
        onJoin={onJoin}
        {...props}
      />
    </MemoryRouter>,
  );
  return onJoin;
}

describe("PreJoin", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the room's clock and seats, and joins with the camera off when there is none", async () => {
    const onJoin = renderPreJoin();
    expect(screen.getByText("focus")).toBeTruthy();
    expect(screen.getByText("40:00")).toBeTruthy();
    expect(screen.getByText("3/12")).toBeTruthy();
    expect(screen.getByRole("img", { name: "Mic opens at the break" })).toBeTruthy();
    await userEvent.setup({ advanceTimers: vi.advanceTimersByTime }).click(screen.getByRole("button", { name: "Join" }));
    // jsdom has no camera, so it joins with the camera off.
    expect(onJoin).toHaveBeenCalledWith(false, true);
  });

  it("can't be joined while the room is full", () => {
    renderPreJoin({ count: 12 });
    expect(screen.getByText("full")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Full" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("calls a room nobody has opened yet new", () => {
    renderPreJoin({ count: null, sessionStartedAt: null });
    expect(screen.getByText("new")).toBeTruthy();
  });
});

describe("LeaveSheet", () => {
  it("shows the focus time it will save and saves on leave", async () => {
    const onLeave = vi.fn();
    const onChange = vi.fn();
    render(
      <LeaveSheet
        draft={{ focusSeconds: 52 * 60, people: 4, shipped: "", projectId: "" }}
        projects={[]}
        onChange={onChange}
        onStay={() => {}}
        onLeave={onLeave}
        onPost={() => {}}
      />,
    );
    expect(screen.getByRole("dialog", { name: "Leave the room" })).toBeTruthy();
    expect(screen.getByLabelText("4 people")).toBeTruthy();
    const user = userEvent.setup();
    await user.type(screen.getByRole("textbox"), "x");
    expect(onChange).toHaveBeenCalledWith({ shipped: "x" });
    // Nothing shipped yet: there is nothing to post.
    expect(screen.queryByRole("button", { name: "Save and post" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Save and leave" }));
    expect(onLeave).toHaveBeenCalledOnce();
  });

  it("offers to post once something shipped", async () => {
    const onPost = vi.fn();
    render(
      <LeaveSheet
        draft={{ focusSeconds: 30 * 60, people: 2, shipped: "Cue sync docs", projectId: "" }}
        projects={[]}
        onChange={() => {}}
        onStay={() => {}}
        onLeave={() => {}}
        onPost={onPost}
      />,
    );
    await userEvent.setup().click(screen.getByRole("button", { name: "Save and post" }));
    expect(onPost).toHaveBeenCalledOnce();
  });
});
