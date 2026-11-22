import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { SpaceScene } from "./SpaceScene";

function mockReducedMotion(reduce: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: reduce && query.includes("reduce"),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })),
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("SpaceScene", () => {
  it("with reduced motion, shows both lines, the mark and the plan as a still page", () => {
    mockReducedMotion(true);
    render(<SpaceScene />);
    expect(screen.getByText("They want you to stay.")).toBeTruthy();
    expect(screen.getByText("We want you to finish.")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("This is a space.");
    expect(screen.getByRole("group", { name: "Floor plan of your space" })).toBeTruthy();
    expect(screen.queryByText("212 day streak. Don't break it.")).toBeNull();
  });

  it("shows each area when it is picked, from the plan or the buttons", () => {
    mockReducedMotion(true);
    render(<SpaceScene />);
    expect(screen.getByRole("heading", { level: 3 }).textContent).toBe("Work beside people.");
    fireEvent.click(within(screen.getByRole("group", { name: "Areas" })).getByRole("button", { name: "break room" }));
    expect(screen.getByRole("heading", { level: 3 }).textContent).toBe("Talk at the break.");
    const plan = screen.getByRole("group", { name: "Floor plan of your space" });
    fireEvent.keyDown(within(plan).getByRole("button", { name: "your wall" }), { key: "Enter" });
    expect(screen.getByRole("heading", { level: 3 }).textContent).toBe("Proof of what you made.");
  });

  it("opens with the feed's noise when motion is allowed", () => {
    mockReducedMotion(false);
    render(<SpaceScene />);
    expect(screen.getByText("212 day streak. Don't break it.")).toBeTruthy();
    expect(screen.getByText("They want you to stay.")).toBeTruthy();
    expect(screen.getByText("We want you to finish.")).toBeTruthy();
    // Fourteen pieces of noise, one for each square of the mark they become.
    expect(document.querySelectorAll(".lp-noise-card")).toHaveLength(14);
    expect(document.querySelectorAll('.lp-mark-svg path[fill="#ffe600"], .lp-mark-svg path[fill="#e9a422"]')).toHaveLength(14);
  });
});
