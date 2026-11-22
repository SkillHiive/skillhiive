import { createContext, useContext } from "react";

/** What the pre-join screen hands over: which room, and how to arrive. */
export interface RoomCallRequest {
  roomName: string;
  withCam: boolean;
  frontCam: boolean;
  /** The task you started the room with on Home: it becomes what shipped when you leave. */
  task?: { text: string } | null;
}

export interface RoomCallValue {
  /** The room this tab is in, or null. It outlives the room page, so the app stays usable. */
  active: RoomCallRequest | null;
  /** Join a room; joining another one leaves the first. */
  start: (request: RoomCallRequest) => void;
  /** Forget the call after it has disconnected. */
  end: () => void;
}

export const RoomCallContext = createContext<RoomCallValue | null>(null);

/** The call, or null outside a RoomCallProvider (pages rendered on their own, tests). */
export function useOptionalRoomCall(): RoomCallValue | null {
  return useContext(RoomCallContext);
}

export function useRoomCall(): RoomCallValue {
  const value = useContext(RoomCallContext);
  if (!value) throw new Error("useRoomCall needs a RoomCallProvider");
  return value;
}
