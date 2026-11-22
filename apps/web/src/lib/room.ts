/** Pure helpers for rooms: the shared clock, focus time, seats and the cubicle messages. */

import { CYCLE_MS, FOCUS_MS } from "@/hooks/sessionPhase";

/** Monospace stack for room labels and clocks. */
export const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';

/** mm:ss, for the room clocks. */
export function clockLabel(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export const TILE_ASPECT = 16 / 9;
export const GRID_GAP = 8;

export interface GridLayout {
  cols: number;
  rows: number;
  tileW: number;
  tileH: number;
}

/** The biggest equal tiles that fit `count` people in the box. */
export function computeOptimalGrid(
  count: number,
  containerW: number,
  containerH: number,
  gap: number = GRID_GAP,
  aspect: number = TILE_ASPECT,
): GridLayout {
  if (count <= 0 || containerW <= 0 || containerH <= 0) {
    return { cols: 1, rows: 1, tileW: Math.max(containerW, 0), tileH: Math.max(containerH, 0) };
  }
  let best: GridLayout = { cols: 1, rows: count, tileW: 0, tileH: 0 };
  let bestArea = 0;
  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols);
    let tileW = (containerW - gap * (cols - 1)) / cols;
    let tileH = tileW / aspect;
    if (tileH * rows + gap * (rows - 1) > containerH) {
      tileH = (containerH - gap * (rows - 1)) / rows;
      tileW = tileH * aspect;
    }
    if (tileW <= 0 || tileH <= 0) continue;
    if (tileW * tileH > bestArea) {
      bestArea = tileW * tileH;
      best = { cols, rows, tileW, tileH };
    }
  }
  return best;
}

/** The token server's default seat limit (`ROOM_CAP` in the backend). */
export const ROOM_CAP = 12;

/** The token server's rule for a room name (`ROOM_NAME` in backend/src/rooms.js). */
export const ROOM_NAME_PATTERN = /^[a-z0-9][a-z0-9-]{1,62}$/;

/** What a room name field shows while someone types: lower case, hyphens for spaces, nothing else. */
export function roomNameInput(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+/, "")
    .slice(0, 63);
}

/** The room a typed or old free-text name stands for, or null when nothing usable is left. */
export function roomSlug(text: string): string | null {
  const slug = roomNameInput(text).replace(/-+$/, "");
  return ROOM_NAME_PATTERN.test(slug) ? slug : null;
}

/**
 * Rooms that are always listed, even with nobody inside, so there is always somewhere to start.
 * An empty room says nothing about who is online.
 */
export const STANDING_ROOMS = ["deep-work", "writing", "design", "late-night"] as const;

export interface FloorRoom {
  phase: "waiting" | "focus" | "break";
  remainingSeconds: number;
}

/** The Floor at a glance, from the open rooms' clocks: how many are in focus, on break, and when the next break starts. */
export function floorSummary(rooms: FloorRoom[]): { open: number; focus: number; onBreak: number; nextBreakSeconds: number | null } {
  let focus = 0;
  let onBreak = 0;
  let next: number | null = null;
  for (const r of rooms) {
    if (r.phase === "focus") {
      focus++;
      next = next === null ? r.remainingSeconds : Math.min(next, r.remainingSeconds);
    } else if (r.phase === "break") onBreak++;
  }
  return { open: rooms.length, focus, onBreak, nextBreakSeconds: next };
}

/**
 * Which room "start in a room" suggests: one on break first (people are talking, a good moment to
 * arrive), then the room in focus closest to its break, then the first standing room.
 */
export function suggestRoom(rooms: (FloorRoom & { name: string })[]): string {
  const onBreak = rooms.find((r) => r.phase === "break");
  if (onBreak) return onBreak.name;
  const focus = rooms.filter((r) => r.phase === "focus").sort((a, b) => a.remainingSeconds - b.remainingSeconds)[0];
  if (focus) return focus.name;
  return rooms[0]?.name ?? STANDING_ROOMS[0];
}

/**
 * A post written from a room ends with its fact, like "52m in deep-work" (the leave sheet adds it).
 * Splits that line off so the card can show it as a tag. Null when the caption has none.
 */
export function roomFact(caption: string): { body: string; duration: string; room: string } | null {
  const lines = caption.trimEnd().split(/\r?\n/);
  const last = lines[lines.length - 1]?.trim() ?? "";
  const m = /^(\d+h(?: \d+m)?|\d+m) in ([a-z0-9][a-z0-9-]{1,62})$/.exec(last);
  if (!m || !m[1] || !m[2]) return null;
  return { body: lines.slice(0, -1).join("\n").trim(), duration: m[1], room: m[2] };
}

/** Under a minute of focus is not worth a session row. */
export const MIN_SAVED_FOCUS_SECONDS = 60;

/**
 * Whole seconds of focus between `fromMs` and `toMs` (server time), on the room's 50/10 clock
 * that began at `sessionStartedAt`. Breaks and time before the clock started do not count.
 */
export function focusSecondsBetween(sessionStartedAt: string | null, fromMs: number, toMs: number): number {
  if (!sessionStartedAt || !(toMs > fromMs)) return 0;
  const start = new Date(sessionStartedAt).getTime();
  if (!Number.isFinite(start)) return 0;
  const from = Math.max(fromMs, start);
  if (!(toMs > from)) return 0;

  // Position inside the cycle, counted from the clock's start.
  const a = from - start;
  const b = toMs - start;
  const focusUntil = (t: number) => Math.floor(t / CYCLE_MS) * FOCUS_MS + Math.min(t % CYCLE_MS, FOCUS_MS);
  return Math.floor((focusUntil(b) - focusUntil(a)) / 1000);
}

/**
 * How far this computer's clock is behind the server's, in milliseconds (add it to Date.now()).
 * The server stamped its time somewhere between the request leaving and the answer arriving,
 * so the best guess is the midpoint of the round trip.
 */
export function clockOffset(sentAt: number, receivedAt: number, serverTime: number): number {
  if (!Number.isFinite(serverTime) || receivedAt < sentAt) return 0;
  return Math.round(serverTime - (sentAt + receivedAt) / 2);
}

/** Server-aligned "now" for the focus and break phases. */
export function serverNow(offset: number, localNow: number = Date.now()): number {
  return localNow + offset;
}

let lastOffset = 0;

/** Keep the offset the token server last gave us, so the rooms list can use the same clock. */
export function rememberClockOffset(offset: number): void {
  if (Number.isFinite(offset)) lastOffset = offset;
}

/** The last offset measured in this tab, or 0 before any room was joined. */
export function lastClockOffset(): number {
  return lastOffset;
}

export const CUBICLE_TOPIC = "cubicle";
export const CUBICLE_ROOM_PATTERN = /^cub_[0-9a-f]{24}$/;

export type CubicleEvent = "request" | "accept" | "decline" | "end";
const EVENTS: readonly CubicleEvent[] = ["request", "accept", "decline", "end"];

/**
 * A cubicle message. Who sent it is never in here: the receiver takes that from the
 * LiveKit participant the message arrived from, which the server has authenticated.
 */
export interface CubicleMessage {
  event: CubicleEvent;
  cubicleRoomName?: string;
}

export function encodeCubicleMessage(message: CubicleMessage): ReturnType<TextEncoder["encode"]> {
  const body: CubicleMessage = { event: message.event };
  if (message.cubicleRoomName !== undefined) body.cubicleRoomName = message.cubicleRoomName;
  return new TextEncoder().encode(JSON.stringify(body));
}

/** The message in these bytes, or null when it is not a well-formed cubicle message. */
export function decodeCubicleMessage(bytes: Uint8Array): CubicleMessage | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const { event, cubicleRoomName } = parsed as Record<string, unknown>;
  if (typeof event !== "string" || !EVENTS.includes(event as CubicleEvent)) return null;
  if (cubicleRoomName !== undefined && (typeof cubicleRoomName !== "string" || !CUBICLE_ROOM_PATTERN.test(cubicleRoomName))) {
    return null;
  }
  // A request is useless without the room it names.
  if (event === "request" && cubicleRoomName === undefined) return null;
  return cubicleRoomName === undefined ? { event: event as CubicleEvent } : { event: event as CubicleEvent, cubicleRoomName };
}
