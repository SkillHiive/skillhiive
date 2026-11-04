// API endpoints
import { apiGet, apiPost, apiPut, apiDelete, supabaseApiRequest } from "./client";

export interface LiveKitTokenResponse {
  token: string;
  url: string;
  roomName: string;
}

export interface Room {
  id: string;
  name: string;
  description: string | null;
  hostId: string;
  phase: string;
  settings: Record<string, any>;
  capacity: { max: number; current: number };
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
  isPrivate: boolean;
  inviteCode?: string;
}

export interface Participant {
  id: string;
  roomId: string;
  userId: string;
  identity: string;
  name: string;
  avatar: string | null;
  role: string;
  joinedAt: string;
  leftAt: string | null;
  isLocal: boolean;
  isMuted: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
}

export interface JoinRoomResponse {
  room: Room & { participants: Participant[]; currentUserRole: string };
  liveKitToken: string;
  liveKitUrl: string;
  participant: Participant;
}

export interface SyncTimeTrackersResponse {
  ok: boolean;
  error?: string;
}

export interface TriggerSyncResponse {
  ok: boolean;
  error?: string;
}

// Room endpoints
export async function getLiveKitToken(roomId: string): Promise<LiveKitTokenResponse> {
  return supabaseApiRequest<LiveKitTokenResponse>(`/livekit/token?roomId=${roomId}`);
}

export async function joinRoom(roomId: string): Promise<JoinRoomResponse> {
  return supabaseApiRequest<JoinRoomResponse>(`/rooms/${roomId}/join`, {
    method: "POST",
  });
}

export async function leaveRoom(roomId: string): Promise<{ ok: boolean }> {
  return supabaseApiRequest<{ ok: boolean }>(`/rooms/${roomId}/leave`, {
    method: "POST",
  });
}

export async function createRoom(data: {
  name: string;
  description?: string;
  isPrivate?: boolean;
  settings?: Record<string, any>;
}): Promise<Room> {
  return supabaseApiRequest<Room>("/rooms", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateRoom(roomId: string, data: Partial<Room>): Promise<Room> {
  return supabaseApiRequest<Room>(`/rooms/${roomId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteRoom(roomId: string): Promise<{ ok: boolean }> {
  return supabaseApiRequest<{ ok: boolean }>(`/rooms/${roomId}`, {
    method: "DELETE",
  });
}

export async function getRoom(roomId: string): Promise<Room> {
  return supabaseApiRequest<Room>(`/rooms/${roomId}`);
}

export async function listRooms(params?: {
  page?: number;
  limit?: number;
  isPrivate?: boolean;
}): Promise<{ rooms: Room[]; total: number }> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.isPrivate !== undefined) searchParams.set("isPrivate", String(params.isPrivate));
  
  return supabaseApiRequest<{ rooms: Room[]; total: number }>(`/rooms?${searchParams}`);
}

// Time tracker sync endpoints
export async function triggerSync(force = false): Promise<TriggerSyncResponse> {
  return supabaseApiRequest<TriggerSyncResponse>(`/sync-time-trackers${force ? "?force=1" : ""}`, {
    method: "POST",
  });
}

export async function syncTimeTrackers(force = false): Promise<SyncTimeTrackersResponse> {
  return supabaseApiRequest<SyncTimeTrackersResponse>(`/sync-time-trackers${force ? "?force=1" : ""}`, {
    method: "POST",
  });
}

// User endpoints
export interface UserProfile {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  banner: string | null;
  bio: string | null;
  email: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function fetchCurrentUser(): Promise<UserProfile> {
  return supabaseApiRequest<UserProfile>("/user/me");
}

export async function updateProfile(data: {
  displayName?: string;
  bio?: string;
  avatar?: string;
  banner?: string;
  timezone?: string;
  locale?: string;
}): Promise<UserProfile> {
  return supabaseApiRequest<UserProfile>("/user/me", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function getUserProfile(userId: string): Promise<UserProfile> {
  return supabaseApiRequest<UserProfile>(`/users/${userId}`);
}

// Team endpoints
export interface Team {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  avatar: string | null;
  banner: string | null;
  ownerId: string;
  isPrivate: boolean;
  inviteCode?: string;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: string;
  joinedAt: string;
  invitedBy: string | null;
  isActive: boolean;
}

export async function createTeam(data: {
  name: string;
  slug: string;
  description?: string;
  isPrivate?: boolean;
}): Promise<Team> {
  return supabaseApiRequest<Team>("/teams", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getTeam(teamId: string): Promise<Team> {
  return supabaseApiRequest<Team>(`/teams/${teamId}`);
}

export async function listTeams(): Promise<Team[]> {
  return supabaseApiRequest<Team[]>("/teams");
}

export async function updateTeam(teamId: string, data: Partial<Team>): Promise<Team> {
  return supabaseApiRequest<Team>(`/teams/${teamId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteTeam(teamId: string): Promise<{ ok: boolean }> {
  return supabaseApiRequest<{ ok: boolean }>(`/teams/${teamId}`, {
    method: "DELETE",
  });
}

export async function inviteToTeam(teamId: string, data: {
  userId?: string;
  email?: string;
  role?: string;
}): Promise<TeamMember> {
  return supabaseApiRequest<TeamMember>(`/teams/${teamId}/invite`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function removeTeamMember(teamId: string, memberId: string): Promise<{ ok: boolean }> {
  return supabaseApiRequest<{ ok: boolean }>(`/teams/${teamId}/members/${memberId}`, {
    method: "DELETE",
  });
}

export async function updateTeamMemberRole(teamId: string, memberId: string, role: string): Promise<TeamMember> {
  return supabaseApiRequest<TeamMember>(`/teams/${teamId}/members/${memberId}`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

// Team rhythm endpoints
export interface TeamRhythm {
  teamId: string;
  enabled: boolean;
  timezone: string;
  schedule: Array<{
    dayOfWeek: number;
    startTime: string;
    durationMinutes: number;
    focusDurationMinutes: number;
    breakDurationMinutes: number;
    cycles: number;
  }>;
  autoStart: boolean;
  adminOnlyStart: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function getTeamRhythm(teamId: string): Promise<TeamRhythm> {
  return supabaseApiRequest<TeamRhythm>(`/teams/${teamId}/rhythm`);
}

export async function updateTeamRhythm(teamId: string, data: Partial<TeamRhythm>): Promise<TeamRhythm> {
  return supabaseApiRequest<TeamRhythm>(`/teams/${teamId}/rhythm`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

// Team analytics endpoints
export interface TeamAnalytics {
  teamId: string;
  period: string;
  startDate: string;
  endDate: string;
  totalFocusHours: number;
  totalSessions: number;
  activeMembers: number;
  syncRate: number;
  averageSessionLength: number;
  memberStats: Array<{
    userId: string;
    username: string;
    focusHours: number;
    sessions: number;
    syncRate: number;
  }>;
}

export async function getTeamAnalytics(teamId: string, period: string): Promise<TeamAnalytics> {
  return supabaseApiRequest<TeamAnalytics>(`/teams/${teamId}/analytics?period=${period}`);
}