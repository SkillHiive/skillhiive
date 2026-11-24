/**
 * The landing's "feed to space" scene, as plain numbers. The scene is a tall block with a pinned
 * stage; scrolling through it moves `progress` from 0 to 1 along one timeline:
 *
 *   chaos      the feed's noise drifts under "They want you to stay."
 *   merge      fourteen pieces of noise fly together and become the fourteen squares of the mark
 *   answer     "We want you to finish." under the big mark, gone before it starts to shrink
 *   settle     the big mark shrinks into its place in the full logo, as the letters appear round it
 *   dock       the full logo moves to the top left, with "This is a space." under it
 *   space      the floor plan comes in and shows each area in turn
 */

export const SPACE_ZONES = ["rooms", "cubicle", "break", "desk", "wall"] as const;
export type SpaceZone = (typeof SPACE_ZONES)[number];

/** The mark's own colours (from logo.png): yellow on top, orange below, and the light each gives off. */
export const MARK_YELLOW = "#ffe600";
export const MARK_ORANGE = "#e9a422";
export const MARK_GLOW = { y: "#fff39f", o: "#ffd995" } as const;

/**
 * The mark's fourteen squares, measured from the 3000 px logo.png: top left corner, then the
 * radius of each corner (top left, top right, bottom right, bottom left) in px of a 300 px square.
 * Corners that face the middle are rounder; the top and bottom squares are sharp. `shade` marks
 * the six squares that darken slightly towards their bottom edge.
 */
const MARK_BOX = { x: 584, y: 426, w: 1830, h: 2131, tile: 300 };
const MARK_SQUARES: { x: number; y: number; r: [number, number, number, number]; c: "y" | "o"; shade?: true }[] = [
  { x: 1345, y: 426, r: [0, 0, 0, 0], c: "y", shade: true },
  { x: 584, y: 793, r: [14, 14, 61, 14], c: "y" },
  { x: 1346, y: 796, r: [20, 20, 68, 68], c: "y", shade: true },
  { x: 2114, y: 793, r: [14, 14, 14, 61], c: "y" },
  { x: 987, y: 1161, r: [41, 68, 102, 68], c: "y" },
  { x: 1349, y: 1160, r: [68, 68, 109, 109], c: "o", shade: true },
  { x: 1712, y: 1161, r: [68, 44, 68, 102], c: "y", shade: true },
  { x: 987, y: 1524, r: [68, 102, 68, 41], c: "o" },
  { x: 1349, y: 1524, r: [113, 109, 68, 68], c: "o", shade: true },
  { x: 1712, y: 1524, r: [102, 68, 41, 68], c: "o" },
  { x: 584, y: 1868, r: [14, 58, 14, 14], c: "o" },
  { x: 2114, y: 1868, r: [61, 14, 14, 14], c: "o" },
  { x: 1346, y: 1897, r: [92, 92, 20, 20], c: "o", shade: true },
  { x: 1345, y: 2256, r: [0, 0, 0, 0], c: "o" },
];

/** Width over height of the mark. */
export const MARK_ASPECT = MARK_BOX.w / MARK_BOX.h;

/**
 * The glow's blur, as a fraction of the mark's height. logo.png measures 70 px on its 300 px
 * squares; the owner asked for a touch less (2026-11-22), so 60.
 */
export const MARK_GLOW_BLUR = 60 / MARK_BOX.h;

/** Each square as fractions of the mark's height: top left, size, corner radii, colour, glow, shade. */
export const MARK_TILES = MARK_SQUARES.map((q) => ({
  x: (q.x - MARK_BOX.x) / MARK_BOX.h,
  y: (q.y - MARK_BOX.y) / MARK_BOX.h,
  size: MARK_BOX.tile / MARK_BOX.h,
  radii: q.r.map((r) => r / MARK_BOX.h) as [number, number, number, number],
  color: q.c === "y" ? MARK_YELLOW : MARK_ORANGE,
  glow: MARK_GLOW[q.c],
  shade: q.shade === true,
}));

/** An SVG path for a square at (x, y) of side `s` with its own radius on each corner. */
export function roundedSquarePath(x: number, y: number, s: number, [tl, tr, br, bl]: [number, number, number, number]): string {
  return [
    `M${x + tl},${y}`,
    `H${x + s - tr}`,
    tr ? `A${tr},${tr} 0 0 1 ${x + s},${y + tr}` : "",
    `V${y + s - br}`,
    br ? `A${br},${br} 0 0 1 ${x + s - br},${y + s}` : "",
    `H${x + bl}`,
    bl ? `A${bl},${bl} 0 0 1 ${x},${y + s - bl}` : "",
    `V${y + tl}`,
    tl ? `A${tl},${tl} 0 0 1 ${x + tl},${y}` : "",
    "Z",
  ].join("");
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const span = (p: number, from: number, to: number) => clamp01((p - from) / (to - from));

/** How far through the scene the page is: 0 at its top, 1 when its end reaches the viewport's bottom. */
export function sceneProgress(top: number, height: number, viewport: number): number {
  const travel = height - viewport;
  return travel <= 0 ? 1 : clamp01(-top / travel);
}

export interface Timeline {
  /** "They want you to stay." fading out, 0 to 1. */
  feedOut: number;
  /** The noise flying into the mark's squares, 0 to 1, eased. */
  merge: number;
  /** The crisp mark taking over from the merged noise, 0 to 1. */
  markIn: number;
  /** "We want you to finish." under the big mark: in, held, then out again, 0 to 1. */
  finish: number;
  /** The big mark shrinking into its place in the full logo, 0 to 1, eased. */
  settle: number;
  /** The full logo's letters appearing round the mark as it settles, 0 to 1. */
  letters: number;
  /** The full logo moving to the top left, 0 to 1, eased. */
  dock: number;
  /** "This is a space." under the docked logo, 0 to 1. */
  spaceIn: number;
  /** The floor plan, 0 to 1. */
  plan: number;
}

export function timeline(p: number): Timeline {
  return {
    feedOut: span(p, 0.12, 0.2),
    merge: ease(span(p, 0.14, 0.34)),
    markIn: span(p, 0.32, 0.38),
    finish: span(p, 0.38, 0.43) * (1 - span(p, 0.52, 0.56)),
    settle: ease(span(p, 0.56, 0.68)),
    letters: span(p, 0.6, 0.68),
    dock: ease(span(p, 0.72, 0.8)),
    spaceIn: span(p, 0.78, 0.84),
    plan: span(p, 0.8, 0.86),
  };
}

/** Where in the scene the walk through the areas starts, and how much of it the walk gets. */
export const TOUR_START = 0.86;
export const TOUR_SPAN = 0.14;
/** One area's share of the walk. */
const TOUR_STEP = TOUR_SPAN / SPACE_ZONES.length;

/** The area the scene shows at this point, stepping through every area once the plan is in. */
export function zoneAt(p: number): SpaceZone {
  if (p <= TOUR_START) return SPACE_ZONES[0];
  const i = Math.floor(((p - TOUR_START) / TOUR_SPAN) * SPACE_ZONES.length);
  return SPACE_ZONES[Math.min(SPACE_ZONES.length - 1, i)]!;
}

/**
 * The area the timeline wants, holding the one already shown until the scroll is clearly inside
 * the next one. Resting on a boundary used to flip the title back and forth on every stray pixel
 * of trackpad drift.
 */
export function zoneAtSticky(p: number, current: SpaceZone, margin = 0.2): SpaceZone {
  const next = zoneAt(p);
  if (next === current) return current;
  const i = SPACE_ZONES.indexOf(next);
  const into = p - (TOUR_START + i * TOUR_STEP);
  // How far past the boundary we have come, whichever way we crossed it.
  const past = i > SPACE_ZONES.indexOf(current) ? into : TOUR_STEP - into;
  return past >= TOUR_STEP * margin ? next : current;
}

/** Who the shown area is following. */
export type ZoneOwner = "timeline" | "pointer" | "pick";

/**
 * Whether a pointer over an area meant it. Scrolling drags new elements under a cursor that never
 * moved, and the browser reports those as pointer events, so an accidental hover used to take the
 * walk over and keep it. A pointer has chosen only when it moved itself, clear of the last scroll.
 */
export function pointerChose(moved: boolean, sinceScrollMs: number, graceMs = 120): boolean {
  return moved && sinceScrollMs > graceMs;
}

/** How far the page must move before an area picked by click or tap gives way to the scroll. */
export const PICK_RELEASE_PX = 60;

export interface Box {
  x: number;
  y: number;
  /** The mark's height; its width is height times MARK_ASPECT. */
  h: number;
}

/** A full logo's place on screen: top left and width (its height follows from FULL_LOGO_ASPECT). */
export interface LogoBox {
  x: number;
  y: number;
  w: number;
}

/**
 * The full logo (logo_full.png, cropped to its visible 4651 by 1076 px) and where its mark sits in
 * it: the dot over the i after the h, 302 px tall, centred 3132.5 px from the left, 27 px down.
 */
const FULL = { w: 4651, h: 1076, markCx: 3132.5, markTop: 27, markH: 302 };
export const FULL_LOGO_ASPECT = FULL.w / FULL.h;

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/** Where the mark stands big (centred), where the full logo forms (centred) and where it docks (top left). */
export function sceneBoxes(vw: number, vh: number): { big: Box; center: LogoBox; dock: LogoBox } {
  const narrow = vw < 900;
  const bigH = Math.min(vh * 0.42, (vw * 0.7) / MARK_ASPECT, 380);
  const centerW = narrow ? vw - 32 : Math.min(vw * 0.72, 1040);
  const dockW = narrow ? 150 : 260;
  return {
    big: { x: vw / 2 - (bigH * MARK_ASPECT) / 2, y: vh * 0.44 - bigH / 2, h: bigH },
    center: { x: (vw - centerW) / 2, y: vh * 0.46 - centerW / FULL_LOGO_ASPECT / 2, w: centerW },
    dock: { x: narrow ? 16 : 40, y: narrow ? 26 : 44, w: dockW },
  };
}

/** The mark's box inside a full logo standing in `logo`. */
export function markInLogo(logo: LogoBox): Box {
  const k = logo.w / FULL.w;
  const h = FULL.markH * k;
  return { x: logo.x + FULL.markCx * k - (h * MARK_ASPECT) / 2, y: logo.y + FULL.markTop * k, h };
}

export function lerpBox(a: Box, b: Box, k: number): Box {
  return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), h: lerp(a.h, b.h, k) };
}

export function lerpLogo(a: LogoBox, b: LogoBox, k: number): LogoBox {
  return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), w: lerp(a.w, b.w, k) };
}

/**
 * The letters' box when drawn `grow` times larger than `logo`, growing round the mark's hole so
 * the hole stays exactly where the mark is.
 */
export function growRoundMark(logo: LogoBox, grow: number): LogoBox {
  const w = logo.w * grow;
  const fx = FULL.markCx / FULL.w;
  const fy = FULL.markTop / FULL.h;
  return { x: logo.x - (w - logo.w) * fx, y: logo.y - ((w - logo.w) / FULL_LOGO_ASPECT) * fy, w };
}

/** Where the full logo is at this point of the timeline: centred until it docks. */
export function logoAt(boxes: ReturnType<typeof sceneBoxes>, t: Timeline): LogoBox {
  return lerpLogo(boxes.center, boxes.dock, t.dock);
}

/** Where the mark is: big, then settling into the full logo, then riding along with it. */
export function markAt(boxes: ReturnType<typeof sceneBoxes>, t: Timeline): Box {
  if (t.dock > 0) return markInLogo(logoAt(boxes, t));
  return lerpBox(boxes.big, markInLogo(boxes.center), t.settle);
}

/** The screen rectangle of square `i` of a mark standing in `box`. */
export function tileRect(box: Box, i: number): { x: number; y: number; size: number } {
  const t = MARK_TILES[i]!;
  return { x: box.x + t.x * box.h, y: box.y + t.y * box.h, size: t.size * box.h };
}
