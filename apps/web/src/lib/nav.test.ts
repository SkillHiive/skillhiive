import { describe, expect, it } from "vitest";
import { activeTab, hidesNav, isOverlayPage } from "./nav";

describe("activeTab", () => {
  it("maps each primary route to its tab", () => {
    expect(activeTab("/home")).toBe("today");
    expect(activeTab("/rooms")).toBe("rooms");
    expect(activeTab("/rooms/deep%20work")).toBe("rooms");
    expect(activeTab("/feed")).toBe("feed");
    expect(activeTab("/post/42")).toBe("feed");
    expect(activeTab("/profile")).toBe("you");
    expect(activeTab("/settings/trackers")).toBe("you");
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
  it("hides the nav inside a live room only", () => {
    expect(hidesNav("/rooms/night-shift")).toBe(true);
    expect(hidesNav("/rooms")).toBe(false);
    expect(hidesNav("/rooms/")).toBe(false);
  });
});

describe("isOverlayPage", () => {
  it("knows the signed-out pages drawn on dark media", () => {
    expect(isOverlayPage("/")).toBe(true);
    expect(isOverlayPage("/login")).toBe(true);
    expect(isOverlayPage("/home")).toBe(false);
  });
});
