import { describe, expect, it } from "vitest";
import {
  FULL_LOGO_ASPECT,
  growRoundMark,
  MARK_ASPECT,
  MARK_TILES,
  markAt,
  markInLogo,
  roundedSquarePath,
  sceneBoxes,
  sceneProgress,
  tileRect,
  timeline,
  zoneAt,
} from "./spaceScene";

describe("sceneProgress", () => {
  it("runs from 0 at the scene's top to 1 when its end reaches the bottom of the screen", () => {
    expect(sceneProgress(100, 3000, 1000)).toBe(0);
    expect(sceneProgress(0, 3000, 1000)).toBe(0);
    expect(sceneProgress(-1000, 3000, 1000)).toBe(0.5);
    expect(sceneProgress(-2000, 3000, 1000)).toBe(1);
    expect(sceneProgress(-5000, 3000, 1000)).toBe(1);
  });

  it("is done when the scene is no taller than the screen", () => {
    expect(sceneProgress(0, 800, 1000)).toBe(1);
  });
});

describe("timeline", () => {
  it("starts as pure chaos", () => {
    expect(timeline(0)).toEqual({ feedOut: 0, merge: 0, markIn: 0, finish: 0, settle: 0, letters: 0, dock: 0, spaceIn: 0, plan: 0 });
  });

  it("merges the noise into the big mark before anything else moves", () => {
    const t = timeline(0.38);
    expect(t.merge).toBe(1);
    expect(t.markIn).toBe(1);
    expect(t.finish).toBe(0);
    expect(t.settle).toBe(0);
    expect(t.letters).toBe(0);
  });

  it("holds \"We want you to finish.\" under the big mark, gone before it shrinks", () => {
    expect(timeline(0.46).finish).toBe(1);
    expect(timeline(0.46).settle).toBe(0);
    expect(timeline(0.56).finish).toBe(0);
    expect(timeline(0.56).settle).toBe(0);
  });

  it("settles the mark into the full logo as the letters appear, then docks it", () => {
    const mid = timeline(0.64);
    expect(mid.settle).toBeGreaterThan(0.5);
    expect(mid.letters).toBeGreaterThan(0);
    expect(mid.dock).toBe(0);
    const end = timeline(0.9);
    expect(end.settle).toBe(1);
    expect(end.letters).toBe(1);
    expect(end.dock).toBe(1);
    expect(end.spaceIn).toBe(1);
    expect(end.plan).toBe(1);
  });

  it("keeps every value between 0 and 1", () => {
    for (let p = 0; p <= 1; p += 0.01) {
      for (const v of Object.values(timeline(p))) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("zoneAt", () => {
  it("steps through every area once the plan is in", () => {
    expect(zoneAt(0.2)).toBe("rooms");
    expect(zoneAt(0.86)).toBe("rooms");
    expect(zoneAt(0.89)).toBe("cubicle");
    expect(zoneAt(0.92)).toBe("break");
    expect(zoneAt(0.95)).toBe("desk");
    expect(zoneAt(0.99)).toBe("wall");
    expect(zoneAt(1)).toBe("wall");
  });
});

describe("the logo's journey", () => {
  const boxes = sceneBoxes(1440, 900);
  const expectSameBox = (a: { x: number; y: number; h: number }, b: { x: number; y: number; h: number }) => {
    expect(a.x).toBeCloseTo(b.x);
    expect(a.y).toBeCloseTo(b.y);
    expect(a.h).toBeCloseTo(b.h);
  };

  it("stands the mark big in the middle first", () => {
    expectSameBox(markAt(boxes, timeline(0.4)), boxes.big);
    expect(boxes.big.x + (boxes.big.h * MARK_ASPECT) / 2).toBeCloseTo(720);
  });

  it("lands the mark exactly in its place in the centred full logo", () => {
    const placed = markAt(boxes, timeline(0.7));
    expectSameBox(placed, markInLogo(boxes.center));
    // The dot over the i after the h: right of centre, at the top of the logo.
    expect(placed.x).toBeGreaterThan(720);
    expect(placed.y).toBeCloseTo(boxes.center.y + (27 / 4651) * boxes.center.w);
  });

  it("rides along with the full logo to the top left", () => {
    expectSameBox(markAt(boxes, timeline(1)), markInLogo(boxes.dock));
    expect(boxes.dock).toEqual({ x: 40, y: 44, w: 260 });
    expect(sceneBoxes(375, 812).dock.w).toBe(150);
    expect(boxes.center.w / FULL_LOGO_ASPECT).toBeLessThan(900);
  });

  it("grows the letters round the mark's hole, so the hole stays on the mark", () => {
    const grown = growRoundMark(boxes.center, 1.04);
    const before = markInLogo(boxes.center);
    const after = markInLogo(grown);
    expect(after.x + (after.h * MARK_ASPECT) / 2).toBeCloseTo(before.x + (before.h * MARK_ASPECT) / 2);
    expect(after.y).toBeCloseTo(before.y);
    expect(growRoundMark(boxes.center, 1)).toEqual(boxes.center);
  });
});

describe("the mark", () => {
  it("has the logo's fourteen squares, all inside its box", () => {
    expect(MARK_TILES).toHaveLength(14);
    for (const t of MARK_TILES) {
      expect(t.x).toBeGreaterThanOrEqual(0);
      expect(t.y).toBeGreaterThanOrEqual(0);
      expect(t.x + t.size).toBeLessThanOrEqual(MARK_ASPECT + 1e-9);
      expect(t.y + t.size).toBeLessThanOrEqual(1 + 1e-9);
    }
  });

  it("places each square inside the mark's box", () => {
    const box = { x: 100, y: 50, h: 200 };
    const top = tileRect(box, 0);
    expect(top.y).toBe(50);
    expect(top.size).toBeCloseTo(200 * (300 / 2131));
  });

  it("keeps the logo's corners: sharp at the top and bottom, rounder towards the middle", () => {
    expect(MARK_TILES[0]!.radii).toEqual([0, 0, 0, 0]);
    expect(MARK_TILES[13]!.radii).toEqual([0, 0, 0, 0]);
    // The arch below the centre: big top corners, small bottom ones.
    const arch = MARK_TILES[12]!.radii;
    expect(arch[0]).toBeGreaterThan(arch[3] * 4);
    expect(MARK_TILES.filter((t) => t.shade)).toHaveLength(6);
  });

  it("draws a square with its own radius on each corner", () => {
    expect(roundedSquarePath(0, 0, 10, [0, 0, 0, 0])).toBe("M0,0H10V10H0V0Z");
    expect(roundedSquarePath(0, 0, 10, [2, 0, 0, 0])).toBe("M2,0H10V10H0V2A2,2 0 0 1 2,0Z");
  });
});
