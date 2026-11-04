// LiveKit room management
import { Room, RoomEvent, Participant, Track, RemoteTrack, TrackPublication } from "livekit-client";

export interface RoomManagerConfig {
  url: string;
  token: string;
}

export interface RoomManagerCallbacks {
  onConnected?: () => void;
  onDisconnected?: (reason?: string) => void;
  onReconnecting?: () => void;
  onReconnected?: () => void;
  onParticipantJoined?: (participant: Participant) => void;
  onParticipantLeft?: (participant: Participant) => void;
  onTrackPublished?: (publication: TrackPublication, participant: Participant) => void;
  onTrackUnpublished?: (publication: TrackPublication, participant: Participant) => void;
  onTrackSubscribed?: (track: RemoteTrack, publication: TrackPublication, participant: Participant) => void;
  onTrackUnsubscribed?: (track: RemoteTrack, publication: TrackPublication, participant: Participant) => void;
  onLocalTrackPublished?: (publication: TrackPublication) => void;
  onDataReceived?: (data: Uint8Array, participant: Participant) => void;
  onActiveSpeakersChanged?: (speakers: Participant[]) => void;
  onConnectionQualityChanged?: (participant: Participant, quality: number) => void;
  onError?: (error: Error) => void;
}

export class RoomManager {
  private room: Room;
  private callbacks: RoomManagerCallbacks;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  
  constructor(config: RoomManagerConfig, callbacks: RoomManagerCallbacks = {}) {
    this.callbacks = callbacks;
    
    this.room = new Room({
      adaptiveStream: true,
      dynacast: true,
      reconnect: true,
    });
    
    this.setupEventListeners();
  }
  
  private setupEventListeners(): void {
    this.room.on(RoomEvent.Connected, () => {
      this.reconnectAttempts = 0;
      this.callbacks.onConnected?.();
    });
    
    this.room.on(RoomEvent.Disconnected, (reason) => {
      this.callbacks.onDisconnected?.(reason);
    });
    
    this.room.on(RoomEvent.Reconnecting, () => {
      this.callbacks.onReconnecting?.();
    });
    
    this.room.on(RoomEvent.Reconnected, () => {
      this.callbacks.onReconnected?.();
    });
    
    this.room.on(RoomEvent.ParticipantConnected, (participant) => {
      this.callbacks.onParticipantJoined?.(participant);
    });
    
    this.room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      this.callbacks.onParticipantLeft?.(participant);
    });
    
    this.room.on(RoomEvent.TrackPublished, (publication, participant) => {
      this.callbacks.onTrackPublished?.(publication, participant);
    });
    
    this.room.on(RoomEvent.TrackUnpublished, (publication, participant) => {
      this.callbacks.onTrackUnpublished?.(publication, participant);
    });
    
    this.room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      this.callbacks.onTrackSubscribed?.(track, publication, participant);
    });
    
    this.room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
      this.callbacks.onTrackUnsubscribed?.(track, publication, participant);
    });
    
    this.room.on(RoomEvent.LocalTrackPublished, (publication) => {
      this.callbacks.onLocalTrackPublished?.(publication);
    });
    
    this.room.on(RoomEvent.DataReceived, (data, participant) => {
      this.callbacks.onDataReceived?.(data, participant);
    });
    
    this.room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
      this.callbacks.onActiveSpeakersChanged?.(speakers);
    });
    
    this.room.on(RoomEvent.ConnectionQualityChanged, (participant, quality) => {
      this.callbacks.onConnectionQualityChanged?.(participant, quality);
    });
  }
  
  async connect(): Promise<void> {
    // This would need url and token from config
    // Implemented in subclasses or via connectWithToken
  }
  
  async connectWithToken(url: string, token: string): Promise<void> {
    await this.room.connect(url, token);
  }
  
  async disconnect(): Promise<void> {
    await this.room.disconnect();
  }
  
  getRoom(): Room {
    return this.room;
  }
  
  getLocalParticipant() {
    return this.room.localParticipant;
  }
  
  getRemoteParticipants(): Participant[] {
    return Array.from(this.room.remoteParticipants.values());
  }
  
  getAllParticipants(): Participant[] {
    return [this.room.localParticipant, ...this.getRemoteParticipants()];
  }
  
  async publishTrack(track: Track, options?: { name?: string; source?: Track.Source }): Promise<TrackPublication> {
    return this.room.localParticipant.publishTrack(track, options);
  }
  
  async unpublishTrack(trackSid: string): Promise<void> {
    await this.room.localParticipant.unpublishTrack(trackSid);
  }
  
  async setCameraEnabled(enabled: boolean): Promise<void> {
    await this.room.localParticipant.setCameraEnabled(enabled);
  }
  
  async setMicrophoneEnabled(enabled: boolean): Promise<void> {
    await this.room.localParticipant.setMicrophoneEnabled(enabled);
  }
  
  async setScreenShareEnabled(enabled: boolean): Promise<void> {
    if (enabled) {
      const tracks = await this.room.localParticipant.setScreenShareEnabled(true);
      return tracks[0] ? Promise.resolve() : Promise.reject(new Error("Failed to start screen share"));
    } else {
      await this.room.localParticipant.setScreenShareEnabled(false);
    }
  }
  
  sendData(data: Uint8Array, destinationIdentities?: string[]): void {
    this.room.localParticipant.publishData(data, {
      destinationIdentities,
    });
  }
  
  getConnectionState(): Room.ConnectionState {
    return this.room.connectionState;
  }
  
  isConnected(): boolean {
    return this.room.connectionState === "connected";
  }
  
  updateCallbacks(callbacks: Partial<RoomManagerCallbacks>): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }
}