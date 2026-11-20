import { supabase } from "./supabase";

// ── Types ──────────────────────────────────────────────────────────────────

export type CodingTimeSource = "tracker" | "cue";

export interface CueLinkPreview {
  device_name: string;
  platform: string;
  expires_at: string;
}

export interface CueDevice {
  id: string;
  name: string;
  platform: string;
  created_at: string;
  last_seen_at: string | null;
  revoked_at: string | null;
}

export interface CueProject {
  device_id: string;
  project_key: string;
  name: string;
  remote: string | null;
  today_project_id: string | null;
  total_seconds: number;
  last_date: string | null;
}

export interface ComparisonDay {
  date: string;
  cue_seconds: number;
  tracker_seconds: number;
}

export interface CodingExtras {
  source: CodingTimeSource;
  agent_seconds: number;
  /** First day counted from Cue, set when earlier days were carried over from a tracker. */
  cue_since: string | null;
}

export type CueResult = { ok: true } | { ok: false; error: string };

// ── Pure helpers ───────────────────────────────────────────────────────────

/**
 * Tidy a link code as typed or pasted: "abcd2345", " ABCD-2345 " and
 * "abcd 2345" all become "ABCD-2345". Returns null when it cannot be a code.
 */
export function normalizeLinkCode(raw: string | null | undefined): string | null {
  const compact = (raw ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (compact.length !== 8) return null;
  return compact.slice(0, 4) + "-" + compact.slice(4);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-11-16" as "16 Nov 2026"; null for anything that is not a calendar date. Avoids time zones on purpose. */
export function formatCueSince(date: string | null | undefined): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date ?? "");
  if (!match) return null;
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${day} ${MONTHS[month - 1]} ${match[1]}`;
}

/** The note under the source line when a Cue profile carries days from an earlier tracker. */
export function earlierHistoryNote(extras: Pick<CodingExtras, "source" | "cue_since"> | null): string | null {
  if (extras?.source !== "cue") return null;
  const since = formatCueSince(extras.cue_since);
  return since === null ? null : `Days before ${since} are from an earlier tracker.`;
}

/** Whole-number percentage of coding time that involved an agent; 0 when there is no time. */
export function agentSharePercent(totalSeconds: number, agentSeconds: number): number {
  if (!(totalSeconds > 0) || !(agentSeconds > 0)) return 0;
  return Math.min(100, Math.round((agentSeconds / totalSeconds) * 100));
}

export interface ComparisonSummary {
  cueTotal: number;
  trackerTotal: number;
  /** Days where both sources reported time. */
  comparableDays: number;
  /** Of those, days where Cue is within 10% of the tracker. */
  closeDays: number;
}

/** Roll up a side-by-side comparison the way the accuracy check reads it. */
export function summarizeComparison(days: ComparisonDay[]): ComparisonSummary {
  let cueTotal = 0;
  let trackerTotal = 0;
  let comparableDays = 0;
  let closeDays = 0;
  for (const day of days) {
    cueTotal += day.cue_seconds;
    trackerTotal += day.tracker_seconds;
    if (day.cue_seconds > 0 && day.tracker_seconds > 0) {
      comparableDays += 1;
      if (Math.abs(day.cue_seconds - day.tracker_seconds) <= day.tracker_seconds * 0.1) closeDays += 1;
    }
  }
  return { cueTotal, trackerTotal, comparableDays, closeDays };
}

/** Turn a database error into a sentence a person can act on. */
export function cueErrorMessage(message: string | undefined, code?: string): string {
  const text = message ?? "";
  if (code === "PGRST202" || /could not find the function/i.test(text)) {
    return "Cue linking isn't switched on for this site yet.";
  }
  if (/link_expired/.test(text)) return "That code has expired. Run cue login again for a new one.";
  if (/link_used/.test(text)) return "That code was already used. Run cue login again for a new one.";
  if (/not_authenticated/.test(text)) return "Sign in first, then open the link again.";
  if (/not_found/.test(text)) return "That wasn't found. It may already have been removed.";
  if (text === "exists") return "You already have a project with that name. Add this to it instead.";
  return text.length > 0 ? text : "Something went wrong. Try again.";
}

// ── RPC wrappers ───────────────────────────────────────────────────────────

function rows(data: unknown): Record<string, unknown>[] {
  return Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
}

async function call(name: string, args?: Record<string, unknown>): Promise<CueResult> {
  try {
    const { error } = await supabase.rpc(name, args);
    if (error) return { ok: false, error: cueErrorMessage(error.message, error.code) };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: cueErrorMessage(e instanceof Error ? e.message : undefined) };
  }
}

/**
 * The device waiting behind a code. `preview` is null when the server does not know the code
 * (unknown, used or expired); `ok: false` means the server could not be asked, so try again.
 */
export type CueLinkPeek = { ok: true; preview: CueLinkPreview | null } | { ok: false; error: string };

export const CUE_UNREACHABLE = "Couldn't reach SkillHiive";

/** A failed lookup in words: the known server answers keep their meaning, anything else is "unreachable". */
function peekErrorMessage(message: string | undefined, code?: string): string {
  const text = message ?? "";
  if (code === "PGRST202" || /could not find the function|not_authenticated/i.test(text)) {
    return cueErrorMessage(text, code);
  }
  return CUE_UNREACHABLE;
}

export async function peekCueLink(code: string): Promise<CueLinkPeek> {
  try {
    const { data, error } = await supabase.rpc("peek_cue_link", { p_code: code });
    if (error) return { ok: false, error: peekErrorMessage(error.message, error.code) };
    const first = rows(data)[0];
    if (!first) return { ok: true, preview: null };
    return {
      ok: true,
      preview: {
        device_name: String(first["device_name"] ?? ""),
        platform: String(first["platform"] ?? ""),
        expires_at: String(first["expires_at"] ?? ""),
      },
    };
  } catch (e) {
    return { ok: false, error: peekErrorMessage(e instanceof Error ? e.message : undefined) };
  }
}

export function approveCueLink(code: string): Promise<CueResult> {
  return call("approve_cue_link", { p_code: code });
}

export async function fetchMyCueDevices(): Promise<CueDevice[]> {
  try {
    const { data, error } = await supabase.rpc("get_my_cue_devices");
    if (error) return [];
    return rows(data).map((r) => ({
      id: String(r["id"]),
      name: String(r["name"] ?? ""),
      platform: String(r["platform"] ?? ""),
      created_at: String(r["created_at"] ?? ""),
      last_seen_at: (r["last_seen_at"] as string | null) ?? null,
      revoked_at: (r["revoked_at"] as string | null) ?? null,
    }));
  } catch {
    return [];
  }
}

export function revokeCueDevice(deviceId: string, deleteData: boolean): Promise<CueResult> {
  return call("revoke_cue_device", { p_device_id: deviceId, p_delete_data: deleteData });
}

export async function fetchMyCueProjects(): Promise<CueProject[]> {
  try {
    const { data, error } = await supabase.rpc("get_my_cue_projects");
    if (error) return [];
    return rows(data).map((r) => ({
      device_id: String(r["device_id"]),
      project_key: String(r["project_key"]),
      name: String(r["name"] ?? ""),
      remote: (r["remote"] as string | null) ?? null,
      today_project_id: (r["today_project_id"] as string | null) ?? null,
      total_seconds: Number(r["total_seconds"] ?? 0),
      last_date: (r["last_date"] as string | null) ?? null,
    }));
  } catch {
    return [];
  }
}

export function mapCueProject(
  deviceId: string,
  projectKey: string,
  todayProjectId: string | null,
): Promise<CueResult> {
  return call("map_cue_project", {
    p_device_id: deviceId,
    p_project_key: projectKey,
    p_today_project_id: todayProjectId,
  });
}

/** One repository as its owner sees it: every machine's copy, joined by git remote. */
export interface CueProjectGroup {
  /** The git remote, or device and key for a project without one. */
  id: string;
  name: string;
  remote: string | null;
  members: { device_id: string; project_key: string }[];
  device_names: string[];
  today_project_id: string | null;
  total_seconds: number;
  last_date: string | null;
}

/** Joins each repository's copies across machines, most recently worked on first. */
export function groupCueProjects(projects: CueProject[], devices: CueDevice[]): CueProjectGroup[] {
  const deviceName = new Map(devices.map((device) => [device.id, device.name]));
  const groups = new Map<string, CueProjectGroup>();
  for (const project of projects) {
    const id = project.remote ?? `${project.device_id}:${project.project_key}`;
    let group = groups.get(id);
    if (!group) {
      group = {
        id,
        name: project.name,
        remote: project.remote,
        members: [],
        device_names: [],
        today_project_id: null,
        total_seconds: 0,
        last_date: null,
      };
      groups.set(id, group);
    }
    group.members.push({ device_id: project.device_id, project_key: project.project_key });
    const name = deviceName.get(project.device_id);
    if (name && !group.device_names.includes(name)) group.device_names.push(name);
    group.today_project_id ??= project.today_project_id;
    group.total_seconds += project.total_seconds;
    if (project.last_date && (!group.last_date || project.last_date > group.last_date)) {
      group.last_date = project.last_date;
      group.name = project.name;
    }
  }
  return [...groups.values()].sort(
    (a, b) => (b.last_date ?? "").localeCompare(a.last_date ?? "") || a.name.localeCompare(b.name),
  );
}

/** A SkillHiive project as the Projects card lists it. */
export interface PanelProject {
  id: string;
  name: string;
  /** Absent when the server predates project visibility; every project was public then. */
  is_public?: boolean;
}

/** Others see a project's Cue time only when the project and its coding time are both public. */
export function isPublicProject(project: PanelProject | undefined, codingPublic: Map<string, boolean>): boolean {
  if (!project) return false;
  return project.is_public !== false && codingPublic.get(project.id) === true;
}

/** The user's project that looks like this repository, by name or the repository's last path part. */
export function suggestedProject<T extends { id: string; name: string }>(group: CueProjectGroup, mine: T[]): T | null {
  const names = new Set([group.name.toLowerCase()]);
  const tail = group.remote?.split("/").pop();
  if (tail) names.add(tail.toLowerCase());
  return mine.find((project) => names.has(project.name.trim().toLowerCase())) ?? null;
}

/** A private SkillHiive project made from a Cue project, linked on every machine that has it. */
export async function createProjectFromCue(
  deviceId: string,
  projectKey: string,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const { data, error } = await supabase.rpc("create_project_from_cue", {
      p_device_id: deviceId,
      p_project_key: projectKey,
    });
    if (error) return { ok: false, error: cueErrorMessage(error.message, error.code) };
    return { ok: true, id: String(data) };
  } catch (e) {
    return { ok: false, error: cueErrorMessage(e instanceof Error ? e.message : undefined) };
  }
}

/** Shows or hides a project and its coding time together. */
export function setProjectVisibility(projectId: string, isPublic: boolean): Promise<CueResult> {
  return call("set_project_visibility", { p_project_id: projectId, p_is_public: isPublic });
}

/** Which of my projects have public coding time (rows are owner-readable). */
export async function fetchMyCodingVisibility(): Promise<Map<string, boolean>> {
  try {
    const { data, error } = await supabase.from("project_coding_time").select("project_id, is_public");
    if (error) return new Map();
    return new Map(rows(data).map((r) => [String(r["project_id"]), r["is_public"] === true]));
  } catch {
    return new Map();
  }
}

/** Whether a project is visible to others; true when the server predates project visibility. */
export async function fetchProjectIsPublic(projectId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.from("today_projects").select("is_public").eq("id", projectId).maybeSingle();
    if (error || !data) return true;
    return (data as Record<string, unknown>)["is_public"] !== false;
  } catch {
    return true;
  }
}

/** Seconds in projects kept on the user's machines, since a local date (YYYY-MM-DD). */
export async function fetchPrivateWorkSeconds(sinceDate: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from("cue_project_days")
      .select("seconds")
      .eq("project_key", "private")
      .gte("date", sinceDate);
    if (error) return 0;
    return rows(data).reduce((sum, r) => sum + Number(r["seconds"] ?? 0), 0);
  } catch {
    return 0;
  }
}

export async function fetchCodingTimeSource(): Promise<CodingTimeSource> {
  try {
    const { data, error } = await supabase.rpc("get_my_coding_time_source");
    return !error && data === "cue" ? "cue" : "tracker";
  } catch {
    return "tracker";
  }
}

export function setCodingTimeSource(source: CodingTimeSource): Promise<CueResult> {
  return call("set_coding_time_source", { p_source: source });
}

export async function fetchCodingTimeComparison(days = 7): Promise<ComparisonDay[]> {
  try {
    const { data, error } = await supabase.rpc("get_my_coding_time_comparison", { p_days: days });
    if (error) return [];
    return rows(data).map((r) => ({
      date: String(r["date"]),
      cue_seconds: Number(r["cue_seconds"] ?? 0),
      tracker_seconds: Number(r["tracker_seconds"] ?? 0),
    }));
  } catch {
    return [];
  }
}

/** Source and agent share for a profile; null when the stats are private or absent. */
export async function fetchUserCodingExtras(userId: string): Promise<CodingExtras | null> {
  try {
    const { data, error } = await supabase.rpc("get_user_coding_extras", { p_user_id: userId });
    const first = rows(data)[0];
    if (error || !first) return null;
    return {
      source: first["source"] === "cue" ? "cue" : "tracker",
      agent_seconds: Number(first["agent_seconds"] ?? 0),
      cue_since: typeof first["cue_since"] === "string" && formatCueSince(first["cue_since"]) !== null ? first["cue_since"] : null,
    };
  } catch {
    return null;
  }
}
