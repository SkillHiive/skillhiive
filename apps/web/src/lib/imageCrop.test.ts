import { describe, expect, it } from "vitest";
import {
  MIN_CROP,
  PROFILE_IMAGE_ASPECT,
  clampCropBox,
  initialCropBox,
  moveCropBox,
  resizeCropBox,
  toSourcePixels,
} from "./imageCrop";

describe("initialCropBox", () => {
  it("fits the widest box of the aspect, centred", () => {
    expect(initialCropBox(400, 300, 1)).toEqual({ x: 50, y: 0, w: 300, h: 300 });
    const banner = initialCropBox(400, 300, PROFILE_IMAGE_ASPECT.banner);
    expect(banner.w).toBe(400);
    expect(banner.h).toBeCloseTo(140);
    expect(banner.y).toBeCloseTo(80);
  });
});

describe("moving and resizing", () => {
  it("keeps the box inside the image", () => {
    expect(clampCropBox({ x: -10, y: 290, w: 100, h: 100 }, 400, 300)).toEqual({ x: 0, y: 200, w: 100, h: 100 });
    expect(moveCropBox({ x: 0, y: 0, w: 100, h: 100 }, 500, 500, 400, 300)).toEqual({ x: 300, y: 200, w: 100, h: 100 });
  });

  it("resizes from a corner, keeping the aspect and the opposite corner", () => {
    const start = { x: 100, y: 100, w: 100, h: 100 };
    expect(resizeCropBox(start, "br", 20, 1, 400, 300)).toEqual({ x: 100, y: 100, w: 120, h: 120 });
    expect(resizeCropBox(start, "tl", 20, 1, 400, 300)).toEqual({ x: 120, y: 120, w: 80, h: 80 });
  });

  it("never shrinks below the minimum or grows past the image", () => {
    const start = { x: 0, y: 0, w: 100, h: 100 };
    expect(resizeCropBox(start, "br", -500, 1, 400, 300).w).toBe(MIN_CROP);
    const big = resizeCropBox(start, "br", 900, 1, 400, 300);
    expect(big.w).toBe(300);
    expect(big.h).toBe(300);
  });
});

describe("toSourcePixels", () => {
  it("scales the on-screen box to the image's own pixels", () => {
    expect(toSourcePixels({ x: 10, y: 20, w: 100, h: 50 }, { w: 200, h: 100 }, { w: 2000, h: 1000 })).toEqual({
      x: 100,
      y: 200,
      w: 1000,
      h: 500,
    });
  });
});
