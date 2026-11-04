// LiveKit token generation
import { AccessToken } from "livekit-server-sdk";

export interface TokenOptions {
  roomName: string;
  participantName: string;
  participantIdentity: string;
  metadata?: string;
  ttl?: number; // seconds
  canPublish?: boolean;
  canSubscribe?: boolean;
  canPublishData?: boolean;
}

export function generateLiveKitToken(
  apiKey: string,
  apiSecret: string,
  options: TokenOptions
): string {
  const {
    roomName,
    participantName,
    participantIdentity,
    metadata,
    ttl = 60 * 60, // 1 hour default
    canPublish = true,
    canSubscribe = true,
    canPublishData = true,
  } = options;
  
  const at = new AccessToken(apiKey, apiSecret, {
    identity: participantIdentity,
    name: participantName,
    ttl,
  });
  
  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish,
    canSubscribe,
    canPublishData,
    canPublishSources: ["camera", "microphone", "screen_share"],
  });
  
  if (metadata) {
    at.addGrant({ metadata });
  }
  
  return at.toJwt();
}

export function parseLiveKitToken(token: string): {
  identity: string;
  name: string;
  room: string;
  grants: Record<string, any>;
  exp: number;
  iat: number;
} | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(atob(parts[1]));
    return {
      identity: payload.identity,
      name: payload.name,
      room: payload.video?.room,
      grants: payload.video,
      exp: payload.exp,
      iat: payload.iat,
    };
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const parsed = parseLiveKitToken(token);
  if (!parsed) return true;
  return Date.now() >= parsed.exp * 1000;
}