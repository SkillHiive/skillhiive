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
    render(<WorkRoomCard name="Deep work" count={2} sessionStartedAt={minutesAgo(20)} />);
    expect(screen.getByText("30:00")).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByText("29:55")).toBeTruthy();
  });

  it("shows the break with its real remaining time", () => {
    render(<WorkRoomCard name="Deep work" count={1} sessionStartedAt={minutesAgo(52)} />);
    expect(screen.getByText("break")).toBeTruthy();
    expect(screen.getByText("08:00")).toBeTruthy();
  });

  it("uses the server clock offset", () => {
    // Our clock is 1 minute behind the server's: 1 more minute of focus has passed.
    render(<WorkRoomCard name="R" count={1} sessionStartedAt={minutesAgo(20)} clockOffsetMs={60_000} />);
    expect(screen.getByText("29:00")).toBeTruthy();
  });

  it("flips to the break when focus runs out", () => {
    render(<WorkRoomCard name="R" count={1} sessionStartedAt={new Date(NOW - FOCUS_MS + 2000).toISOString()} />);
    expect(screen.getByText("focus")).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByText("break")).toBeTruthy();
  });

  it("joins from anywhere on the card, even before the clock starts", async () => {
    const onJoin = vi.fn();
    render(<WorkRoomCard name="R" count={1} sessionStartedAt={null} onJoin={onJoin} />);
    expect(screen.getByText("waiting")).toBeTruthy();
    expect(screen.getByText("1/12")).toBeTruthy();
    await userEvent.setup({ advanceTimers: vi.advanceTimersByTime }).click(screen.getByRole("button", { name: "Join R" }));
    expect(onJoin).toHaveBeenCalledOnce();
  });

  it("shows a full room before anyone tries to join it", async () => {
    const onJoin = vi.fn();
    render(<WorkRoomCard name="R" count={12} sessionStartedAt={minutesAgo(5)} onJoin={onJoin} />);
    const card = screen.getByRole("button", { name: "R, full" });
    expect(screen.getByText("full")).toBeTruthy();
    expect((card as HTMLButtonElement).disabled).toBe(true);
  });
});
