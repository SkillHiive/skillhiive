import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

  /** With motion allowed and no layout, the scroll timeline sits at the end of the walk: the wall. */
  function scrolling() {
    let now = 0;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    mockReducedMotion(false);
    render(<SpaceScene />);
    const plan = screen.getByRole("group", { name: "Floor plan of your space" });
    return {
      rooms: within(plan).getByRole("button", { name: "rooms" }),
      wrap: document.querySelector(".lp-plan-wrap")!,
      shown: () => screen.getByRole("heading", { level: 3 }).textContent,
      wait: (ms: number) => {
        now += ms;
      },
      // jsdom has no PointerEvent, and fireEvent.pointerMove drops clientX and clientY with it.
      move: (el: Element, x: number, y: number) =>
        fireEvent(el, new MouseEvent("pointermove", { bubbles: true, clientX: x, clientY: y })),
    };
  }

  it("keeps the walk on the scroll when the pointer only happens to lie on the plan", async () => {
    const s = scrolling();
    // The first frame puts the walk where the scroll is.
    await waitFor(() => expect(s.shown()).toBe("Proof of what you made."));

    // Scrolling drags areas under a still cursor, and the browser reports those as moves.
    fireEvent.scroll(window);
    s.move(s.rooms, 10, 10);
    expect(s.shown()).toBe("Proof of what you made.");

    // The same movement, once the scrolling has stopped, is a choice.
    s.wait(500);
    s.move(s.rooms, 11, 12);
    expect(s.shown()).toBe("Work beside people.");
  });

  it("hands the walk back to the scroll when the pointer leaves the plan", async () => {
    const s = scrolling();
    await waitFor(() => expect(s.shown()).toBe("Proof of what you made."));
    s.wait(500);
    s.move(s.rooms, 11, 12);
    expect(s.shown()).toBe("Work beside people.");

    fireEvent.pointerLeave(s.wrap);
    expect(s.shown()).toBe("Proof of what you made.");
  });
});
