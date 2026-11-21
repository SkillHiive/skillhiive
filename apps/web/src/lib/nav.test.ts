import { describe, expect, it } from "vitest";
import { activeTab, hidesNav, showsFocusChip } from "./nav";

describe("activeTab", () => {
  it("maps each primary route to its tab", () => {
    expect(activeTab("/home")).toBe("today");
    expect(activeTab("/rooms")).toBe("rooms");
    expect(activeTab("/rooms/deep%20work")).toBe("rooms");
    expect(activeTab("/feed")).toBe("feed");
    expect(activeTab("/post/42")).toBe("feed");
    expect(activeTab("/profile")).toBe("you");
    expect(activeTab("/settings/trackers")).toBe("you");
    expect(activeTab("/projects")).toBe("you");
  });

  it("counts your own public profile as You, and nobody else's", () => {
    expect(activeTab("/p/thelinuxguy", "TheLinuxGuy")).toBe("you");
    expect(activeTab("/p/thelinuxguy/", "thelinuxguy")).toBe("you");
    expect(activeTab("/p/someone-else", "thelinuxguy")).toBeNull();
    expect(activeTab("/p/thelinuxguy")).toBeNull();
  });

  it("leaves pages outside the four tabs unselected", () => {
    expect(activeTab("/notifications")).toBeNull();
    expect(activeTab("/terms")).toBeNull();
    expect(activeTab("/projects/abc")).toBeNull();
  });

  it("does not throw on a malformed escape", () => {
    expect(activeTab("/p/%E0%A4%A", "x")).toBeNull();
  });
});

describe("hidesNav", () => {
  it("hides the nav inside a live room and in focus only", () => {
    expect(hidesNav("/rooms/night-shift")).toBe(true);
    expect(hidesNav("/focus")).toBe(true);
    expect(hidesNav("/focus/")).toBe(true);
    expect(hidesNav("/rooms")).toBe(false);
    expect(hidesNav("/rooms/")).toBe(false);
    expect(hidesNav("/home")).toBe(false);
  });
});

describe("showsFocusChip", () => {
  it("shows the timer while a session runs, anywhere but the focus page", () => {
    expect(showsFocusChip("/home", true)).toBe(true);
    expect(showsFocusChip("/feed", true)).toBe(true);
    expect(showsFocusChip("/focus", true)).toBe(false);
    expect(showsFocusChip("/focus/", true)).toBe(false);
    expect(showsFocusChip("/home", false)).toBe(false);
  });
});
