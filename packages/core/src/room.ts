// Room types and helpers
import { Room, Participant, Phase, RoomSettings, JoinRoomRequest, JoinRoomResponse } from "@skillhiive/contracts";

export type { Room, Participant, Phase, RoomSettings, JoinRoomRequest, JoinRoomResponse };

export interface RoomProvider {
  joinRoom: (request: JoinRoomRequest) => Promise<JoinRoomResponse>;
  leaveRoom: (roomId: string) => Promise<void>;
  getRoom: (roomId: string) => Promise<Room>;
  createRoom: (data: Partial<Room>) => Promise<Room>;
  updateRoom: (roomId: string, data: Partial<Room>) => Promise<Room>;
  onRoomStateChange: (callback: (room: Room) => void) => () => void;
  onParticipantJoin: (callback: (participant: Participant) => void) => () => void;
  onParticipantLeave: (callback: (participant: Participant) => void) => () => void;
  onPhaseChange: (callback: (phase: Phase) => void) => () => void;
}

// Re-export from client for convenience
export { joinRoom, leaveRoom, createRoom, getRoom, listRooms } from "@skillhiive/client";