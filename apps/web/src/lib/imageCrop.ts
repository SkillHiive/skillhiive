/** What a profile picture is for. */
export type ProfileImageKind = "avatar" | "banner";

/** Width ÷ height of each kind, as the old profile page cropped them. */
export const PROFILE_IMAGE_ASPECT: Record<ProfileImageKind, number> = {
  avatar: 1,
  banner: 1000 / 350,
};

/** Pixel width of the uploaded JPEG; height follows the aspect. */
export const PROFILE_IMAGE_WIDTH: Record<ProfileImageKind, number> = {
  avatar: 512,
  banner: 1000,
};

/** A crop rectangle in on-screen pixels, relative to the shown image. */
export interface CropBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type CropCorner = "tl" | "tr" | "bl" | "br";

/** The smallest crop box side, in on-screen pixels. */
export const MIN_CROP = 40;

/** The largest box of `aspect` that fits the shown image, centred. */
export function initialCropBox(width: number, height: number, aspect: number): CropBox {
  let w = width;
  let h = w / aspect;
  if (h > height) {
    h = height;
    w = h * aspect;
  }
  return { x: (width - w) / 2, y: (height - h) / 2, w, h };
}

/** Keeps the box inside the shown image. */
export function clampCropBox(box: CropBox, width: number, height: number): CropBox {
  const w = Math.min(box.w, width);
  const h = Math.min(box.h, height);
  return {
    x: Math.max(0, Math.min(box.x, width - w)),
    y: Math.max(0, Math.min(box.y, height - h)),
    w,
    h,
  };
}

/** Drags one corner by dx, keeping the aspect and the opposite corner where it was, then clamps. */
export function resizeCropBox(
  start: CropBox,
  corner: CropCorner,
  dx: number,
  aspect: number,
  width: number,
  height: number,
): CropBox {
  const grows = corner === "br" || corner === "tr" ? dx : -dx;
  // Never larger than the image allows at this aspect, so the clamp can't break the ratio.
  const maxW = Math.min(width, height * aspect);
  const w = Math.min(maxW, Math.max(MIN_CROP, start.w + grows));
  const h = w / aspect;
  const x = corner === "tl" || corner === "bl" ? start.x + (start.w - w) : start.x;
  const y = corner === "tl" || corner === "tr" ? start.y + (start.h - h) : start.y;
  return clampCropBox({ x, y, w, h }, width, height);
}

/** Moves the box by (dx, dy), kept inside the image. */
export function moveCropBox(start: CropBox, dx: number, dy: number, width: number, height: number): CropBox {
  return clampCropBox({ ...start, x: start.x + dx, y: start.y + dy }, width, height);
}

/** The same box in the image's own pixels, for drawing the crop. */
export function toSourcePixels(
  box: CropBox,
  shown: { w: number; h: number },
  natural: { w: number; h: number },
): CropBox {
  const sx = shown.w > 0 ? natural.w / shown.w : 1;
  const sy = shown.h > 0 ? natural.h / shown.h : 1;
  return { x: box.x * sx, y: box.y * sy, w: box.w * sx, h: box.h * sy };
}
