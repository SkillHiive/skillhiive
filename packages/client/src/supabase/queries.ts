// Supabase queries
import { getSupabaseClient } from "./client";

export interface Project {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  created_at: string;
}

export interface ProjectWithStats extends Project {
  total_minutes: number;
  total_sessions: number;
}

export interface HeatmapDay {
  day: string;
  minutes: number;
  sessions: number;
}

export interface FocusStats {
  total_minutes: number;
  total_sessions: number;
  days_active: number;
  last_7d_minutes: number;
  current_streak: number;
}

export interface ShippedNote {
  id: string;
  body: string;
  blockers: string | null;
  actual_min: number | null;
  created_at: string;
}

export interface ProjectSummary {
  name: string;
  description: string | null;
  created_at: string;
  owner_username: string | null;
  owner_id?: string | null;
  total_minutes: number;
  total_sessions: number;
  shipped_count: number;
}

export interface PublicProfile {
  id: string;
  username: string | null;
  displayname: string | null;
  avatar: string | null;
  banner: string | null;
  bio: string | null;
}

// Type for RPC responses
interface RpcRow {
  [key: string]: unknown;
}

// Query functions
export async function fetchMyProjects(): Promise<Project[]> {
  const client = getSupabaseClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return [];
  
  const { data, error } = await client
    .from("today_projects")
    .select("id, name, description, color, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  
  if (error) return [];
  return (data as Project[]) ?? [];
}

export async function fetchHeatmap(userId: string, days = 365): Promise<HeatmapDay[]> {
  const client = getSupabaseClient();
  const { data, error } = await client.rpc("get_focus_heatmap", {
    p_user_id: userId,
    p_days: days,
  });
  if (error) return [];
  return (data as HeatmapDay[]) ?? [];
}

export async function fetchFocusStats(userId: string): Promise<FocusStats | null> {
  const client = getSupabaseClient();
  const { data, error } = await client.rpc("get_focus_stats", {
    p_user_id: userId,
  });
  if (error || !data || !Array.isArray(data) || data.length === 0) return null;
  const r = data[0] as RpcRow;
  return {
    total_minutes: Number(r["total_minutes"] ?? 0),
    total_sessions: Number(r["total_sessions"] ?? 0),
    days_active: Number(r["days_active"] ?? 0),
    last_7d_minutes: Number(r["last_7d_minutes"] ?? 0),
    current_streak: Number(r["current_streak"] ?? 0),
  };
}

export async function fetchRecentShipped(userId: string, limit = 10): Promise<ShippedNote[]> {
  const client = getSupabaseClient();
  const { data, error } = await client.rpc("get_recent_shipped", {
    p_user_id: userId,
    p_limit: limit,
  });
  if (error) return [];
  return (data as ShippedNote[]) ?? [];
}

export async function fetchUserProjects(userId: string): Promise<ProjectWithStats[]> {
  const client = getSupabaseClient();
  const { data, error } = await client.rpc("get_user_projects", {
    p_user_id: userId,
  });
  if (error) return [];
  return (data as ProjectWithStats[]) ?? [];
}

export async function fetchProjectSummary(projectId: string): Promise<ProjectSummary | null> {
  const client = getSupabaseClient();
  const { data, error } = await client.rpc("get_project_summary", {
    p_project_id: projectId,
  });
  if (error || !data || !Array.isArray(data) || data.length === 0) return null;
  const r = data[0] as RpcRow;
  return {
    name: String(r["name"] ?? "Untitled"),
    description: (r["description"] as string) ?? null,
    created_at: String(r["created_at"] ?? ""),
    owner_username: (r["owner_username"] as string) ?? null,
    owner_id: (r["owner_id"] as string) ?? null,
    total_minutes: Number(r["total_minutes"] ?? 0),
    total_sessions: Number(r["total_sessions"] ?? 0),
    shipped_count: Number(r["shipped_count"] ?? 0),
  };
}

export async function fetchPublicProfile(username: string): Promise<PublicProfile | null> {
  const client = getSupabaseClient();
  const { data, error } = await client.rpc("get_public_profile", {
    p_username: username,
  });
  if (error || !data || !Array.isArray(data) || data.length === 0) return null;
  return data[0] as PublicProfile;
}

export async function fetchProjectShipped(projectId: string, limit = 50): Promise<ShippedNote[]> {
  const client = getSupabaseClient();
  const { data, error } = await client.rpc("get_project_shipped", {
    p_project_id: projectId,
    p_limit: limit,
  });
  if (error) return [];
  return (data as ShippedNote[]) ?? [];
}