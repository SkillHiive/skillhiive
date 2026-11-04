// LiveKit client
import { Room, RoomEvent, Participant, Track, RemoteTrack, TrackPublication, createLocalTracks } from "livekit-client";

export interface LiveKitConfig {
  url: string;
  token: string;
}

export interface LiveKitCallbacks {
  onConnected?: () => void;
  onDisconnected?: () => void;
  onParticipantConnected?: (participant: Participant) => void;
  onParticipantDisconnected?: (participant: Participant) => void;
  onTrackPublished?: (publication: TrackPublication, participant: Participant) => void;
  onTrackUnpublished?: (publication: TrackPublication, participant: Participant) => void;
  onTrackSubscribed?: (track: RemoteTrack, publication: TrackPublication, participant: Participant) => void;
  onTrackUnsubscribed?: (track: RemoteTrack, publication: TrackPublication, participant: Participant) => void;
  onLocalTrackPublished?: (publication: TrackPublication) => void;
  onDataReceived?: (data: Uint8Array, participant: Participant) => void;
  onConnectionQualityChanged?: (participant: Participant, quality: number) => void;
}

let roomInstance: Room | null = null;

export function createLiveKitRoom(config: LiveKitConfig, callbacks: LiveKitCallbacks = {}): Room {
  const room = new Room({
    adaptiveStream: true,
    dynacast: true,
  });
  
  // Set up event listeners
  room.on(RoomEvent.Connected, () => {
    callbacks.onConnected?.();
  });
  
  room.on(RoomEvent.Disconnected, () => {
    callbacks.onDisconnected?.();
  });
  
  room.on(RoomEvent.ParticipantConnected, (participant) => {
    callbacks.onParticipantConnected?.(participant);
  });
  
  room.on(RoomEvent.ParticipantDisconnected, (participant) => {
    callbacks.onParticipantDisconnected?.(participant);
  });
  
  room.on(RoomEvent.TrackPublished, (publication, participant) => {
    callbacks.onTrackPublished?.(publication, participant);
  });
  
  room.on(RoomEvent.TrackUnpublished, (publication, participant) => {
    callbacks.onTrackUnpublished?.(publication, participant);
  });
  
  room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
    callbacks.onTrackSubscribed?.(track, publication, participant);
  });
  
  room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
    callbacks.onTrackUnsubscribed?.(track, publication, participant);
  });
  
  room.on(RoomEvent.LocalTrackPublished, (publication) => {
    callbacks.onLocalTrackPublished?.(publication);
  });
  
  room.on(RoomEvent.DataReceived, (data, participant) => {
    callbacks.onDataReceived?.(data, participant);
  });
  
  room.on(RoomEvent.ConnectionQualityChanged, (participant, quality) => {
    callbacks.onConnectionQualityChanged?.(participant, quality);
  });
  
  roomInstance = room;
  return room;
}

export function getLiveKitRoom(): Room | null {
  return roomInstance;
}

export async function connectToRoom(config: LiveKitConfig): Promise<Room> {
  const room = roomInstance ?? new Room({
    adaptiveStream: true,
    dynacast: true,
  });
  
  await room.connect(config.url, config.token);
  roomInstance = room;
  return room;
}

export async function disconnectFromRoom(): Promise<void> {
  if (roomInstance) {
    await roomInstance.disconnect();
    roomInstance = null;
  }
}

export async function publishLocalTracks(
  options: { audio?: boolean; video?: boolean; screen?: boolean } = {}
): Promise<TrackPublication[]> {
  if (!roomInstance) throw new Error("Not connected to room");
  
  const tracks = await createLocalTracks(options);
  const publications: TrackPublication[] = [];
  
  for (const track of tracks) {
    const publication = await roomInstance.localParticipant.publishTrack(track);
    publications.push(publication);
  }
  
  return publications;
}

export async function unpublishLocalTrack(trackSid: string): Promise<void> {
  if (!roomInstance) throw new Error("Not connected to room");
  await roomInstance.localParticipant.unpublishTrack(trackSid);
}

export function getLocalParticipant() {
  return roomInstance?.localParticipant;
}

export function getRemoteParticipants(): Participant[] {
  return roomInstance ? Array.from(roomInstance.remoteParticipants.values()) : [];
}

export function getRoomState() {
  if (!roomInstance) return null;
  return {
    name: roomInstance.name,
    sid: roomInstance.sid,
    connectionState: roomInstance.connectionState,
    participants: getRemoteParticipants().map(p => ({
      identity: p.identity,
      name: p.name,
      isMuted: p.isMuted,
      isCameraOn: p.isCameraEnabled,
      connectionQuality: p.connectionQuality,
    })),
  };
}