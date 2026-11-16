/** Pure helpers for rooms: the shared clock and the cubicle messages. */

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
