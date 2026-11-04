// Supabase mutations
import { getSupabaseClient } from "./client";

export interface SessionInput {
  project_id?: string | null;
  task_text?: string | null;
  estimate_min?: number | null;
  duration_seconds: number;
  interrupted?: boolean;
  completed_at?: string;
}

export interface NoteInput {
  project_id?: string | null;
  ritual_type: "checkin" | "checkout" | "capture" | "weekly_review";
  body: string;
  blockers?: string | null;
  actual_min?: number | null;
}

const QUEUE_KEY = "skillhive:today-sync-queue";

type QueueItem =
  | { kind: "session"; payload: Record<string, unknown>; ts: number }
  | { kind: "note"; payload: Record<string, unknown>; ts: number };

function readQueue(): QueueItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueueItem[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(items: QueueItem[]) {
  try {
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

function enqueue(item: QueueItem) {
  writeQueue([...readQueue(), item]);
}

function isOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  // @ts-ignore - navigator.onLine exists but not in types
  return navigator.onLine ?? true;
}

async function currentUserId(): Promise<string | null> {
  const client = getSupabaseClient();
  const { data: { user } } = await client.auth.getUser();
  return user?.id ?? null;
}

async function pushItem(item: QueueItem): Promise<boolean> {
  const client = getSupabaseClient();
  try {
    const table = item.kind === "session" ? "focus_sessions" : "session_notes";
    const { error } = await client.from(table).insert(item.payload);
    return !error;
  } catch {
    return false;
  }
}

export async function flushSyncQueue(): Promise<void> {
  if (typeof window === "undefined" || !isOnline()) return;
  const items = readQueue();
  if (items.length === 0) return;
  const remaining: QueueItem[] = [];
  for (const item of items) {
    const ok = await pushItem(item);
    if (!ok) remaining.push(item);
  }
  writeQueue(remaining);
}

export function pendingSyncCount(): number {
  return readQueue().length;
}

export async function saveSession(input: SessionInput): Promise<void> {
  const user_id = await currentUserId();
  if (!user_id) return;
  const payload = {
    user_id,
    project_id: input.project_id ?? null,
    task_text: input.task_text ?? null,
    estimate_min: input.estimate_min ?? null,
    duration_seconds: input.duration_seconds,
    interrupted: input.interrupted ?? false,
    completed_at: input.completed_at ?? new Date().toISOString(),
  };
  const item: QueueItem = { kind: "session", payload, ts: Date.now() };
  if (!isOnline() || !(await pushItem(item))) enqueue(item);
}

export async function saveNote(input: NoteInput): Promise<void> {
  const user_id = await currentUserId();
  if (!user_id) return;
  const payload = {
    user_id,
    project_id: input.project_id ?? null,
    ritual_type: input.ritual_type,
    body: input.body,
    blockers: input.blockers ?? null,
    actual_min: input.actual_min ?? null,
  };
  const item: QueueItem = { kind: "note", payload, ts: Date.now() };
  if (!isOnline() || !(await pushItem(item))) enqueue(item);
}

export async function ensureProject(
  name: string,
  description?: string
): Promise<string | null> {
  const client = getSupabaseClient();
  const user_id = await currentUserId();
  if (!user_id) return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  try {
    const { data } = await client
      .from("today_projects")
      .select("id")
      .eq("user_id", user_id)
      .eq("name", trimmed)
      .limit(1)
      .maybeSingle();
    if (data?.id) return data.id as string;
    const { data: inserted, error } = await client
      .from("today_projects")
      .insert({ user_id, name: trimmed, description })
      .select("id")
      .single();
    if (error) return null;
    return inserted?.id ?? null;
  } catch {
    return null;
  }
}

export async function deleteProject(id: string): Promise<boolean> {
  const client = getSupabaseClient();
  try {
    const { error } = await client
      .from("today_projects")
      .delete()
      .eq("id", id);
    return !error;
  } catch {
    return false;
  }
}

export async function setProjectCodingVisibility(
  projectId: string,
  isPublic: boolean
): Promise<boolean> {
  const client = getSupabaseClient();
  try {
    const { error } = await client.rpc("set_project_coding_visibility", {
      p_project_id: projectId,
      p_is_public: isPublic,
    });
    return !error;
  } catch {
    return false;
  }
}

export async function setMyCodingStatsVisibility(
  isPublic: boolean
): Promise<boolean> {
  const client = getSupabaseClient();
  try {
    const { error } = await client.rpc("set_my_coding_stats_visibility", {
      p_is_public: isPublic,
    });
    return !error;
  } catch {
    return false;
  }
}