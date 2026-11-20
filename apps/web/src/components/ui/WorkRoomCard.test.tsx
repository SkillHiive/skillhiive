import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FOCUS_MS } from "@/hooks/sessionPhase";
import { WorkRoomCard } from "./WorkRoomCard";

const NOW = new Date("2026-11-20T10:00:00.000Z").getTime();
const minutesAgo = (m: number) => new Date(NOW - m * 60_000).toISOString();

describe("WorkRoomCard", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the time left in the room's real focus phase and keeps counting", () => {
    render(<WorkRoomCard state="live" name="Deep work" tag="2 joined" members={["a", "b"]} sessionStartedAt={minutesAgo(20)} />);
    expect(screen.getByText("30:00")).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByText("29:55")).toBeTruthy();
  });

  it("shows the break with its real remaining time", () => {
    render(<WorkRoomCard state="live" name="Deep work" tag="1 joined" members={["a"]} sessionStartedAt={minutesAgo(52)} />);
    expect(screen.getByText("break")).toBeTruthy();
    expect(screen.getByText("08:00")).toBeTruthy();
  });

  it("uses the server clock offset", () => {
    // Our clock is 1 minute behind the server's: 1 more minute of focus has passed.
    render(<WorkRoomCard state="live" name="R" tag="1 joined" sessionStartedAt={minutesAgo(20)} clockOffsetMs={60_000} />);
    expect(screen.getByText("29:00")).toBeTruthy();
  });

  it("flips to the break when focus runs out", () => {
    render(<WorkRoomCard state="live" name="R" tag="1 joined" sessionStartedAt={new Date(NOW - FOCUS_MS + 2000).toISOString()} />);
    expect(screen.getByText("focus")).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByText("break")).toBeTruthy();
  });

  it("offers Join for a room with people whose clock hasn't started", async () => {
    const onJoin = vi.fn();
    render(<WorkRoomCard state="live" name="R" tag="1 joined" members={["a"]} sessionStartedAt={null} onJoin={onJoin} />);
    await userEvent.setup({ advanceTimers: vi.advanceTimersByTime }).click(screen.getByRole("button", { name: "Join" }));
    expect(onJoin).toHaveBeenCalledOnce();
  });

  it("wires the empty state's start button", async () => {
    const onStart = vi.fn();
    render(<WorkRoomCard state="empty" name="No rooms yet" tag="Be the first" onStart={onStart} />);
    await userEvent.setup({ advanceTimers: vi.advanceTimersByTime }).click(screen.getByRole("button", { name: "Start" }));
    expect(onStart).toHaveBeenCalledOnce();
  });
});
