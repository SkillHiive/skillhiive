/**
 * One time number per project, wherever it shows (Today's spotlight, /projects).
 *
 * A project collects time two ways: focus sessions tagged to it, and coding time
 * from the Cue projects linked to it. A focus session is usually spent coding, so
 * adding the two would count the same hour twice; the project's time is the
 * larger of the two.
 */
import { supabase } from "./supabase";
import { fetchMyCueProjects, type CueProject } from "./cue";

export interface ProjectTime {
  focus: number;
  coded: number;
}

export function projectSeconds(time: ProjectTime | undefined): number {
  if (!time) return 0;
  return Math.max(time.focus, time.coded);
}

export interface FocusRow {
  project_id: string | null;
  duration_seconds: number | null;
}

export interface CueDayRow {
  device_id: string;
  project_key: string;
  seconds: number | null;
}

type CueLink = Pick<CueProject, "device_id" | "project_key" | "today_project_id">;

/** Focus and coded seconds per SkillHiive project, from raw rows. */
export function timeByProject(focus: FocusRow[], cueDays: CueDayRow[], links: CueLink[]): Map<string, ProjectTime> {
  const out = new Map<string, ProjectTime>();
  const entry = (id: string) => {
    let t = out.get(id);
    if (!t) {
      t = { focus: 0, coded: 0 };
      out.set(id, t);
    }
    return t;
  };
  for (const row of focus) {
    if (row.project_id) entry(row.project_id).focus += Math.max(0, Number(row.duration_seconds) || 0);
  }
  const target = new Map<string, string>();
  for (const link of links) {
    if (link.today_project_id) target.set(`${link.device_id}:${link.project_key}`, link.today_project_id);
  }
  for (const day of cueDays) {
    const id = target.get(`${day.device_id}:${day.project_key}`);
    if (id) entry(id).coded += Math.max(0, Number(day.seconds) || 0);
  }
  return out;
}

/** All-time time per project: focus minutes from the project list, coded seconds from Cue. */
export function allTimeByProject(
  projects: { id: string; total_minutes: number }[],
  cueProjects: Pick<CueProject, "today_project_id" | "total_seconds">[],
): Map<string, ProjectTime> {
  const out = new Map<string, ProjectTime>();
  for (const p of projects) out.set(p.id, { focus: Math.max(0, p.total_minutes) * 60, coded: 0 });
  for (const c of cueProjects) {
    const t = c.today_project_id ? out.get(c.today_project_id) : undefined;
    if (t) t.coded += Math.max(0, c.total_seconds);
  }
  return out;
}

/** The project with the most time, or null when none has any. */
export function pickSpotlight<T extends { id: string }>(
  projects: T[],
  time: Map<string, ProjectTime>,
): { project: T; seconds: number } | null {
  let best: { project: T; seconds: number } | null = null;
  for (const project of projects) {
    const seconds = projectSeconds(time.get(project.id));
    if (seconds > 0 && (!best || seconds > best.seconds)) best = { project, seconds };
  }
  return best;
}

/** Local calendar date `daysAgo` days back, as YYYY-MM-DD. */
export function localDate(daysAgo: number, now = new Date()): string {
  const day = new Date(now);
  day.setDate(day.getDate() - daysAgo);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
}

/** Each project's time over the last seven days (today included). Empty when offline. */
export async function fetchWeekProjectTime(userId: string): Promise<Map<string, ProjectTime>> {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - 6);
  try {
    const [focus, days, links] = await Promise.all([
      supabase
        .from("focus_sessions")
        .select("project_id, duration_seconds")
        .eq("user_id", userId)
        .not("project_id", "is", null)
        .gte("completed_at", since.toISOString()),
      supabase
        .from("cue_project_days")
        .select("device_id, project_key, seconds")
        .eq("user_id", userId)
        .neq("project_key", "private")
        .gte("date", localDate(6)),
      fetchMyCueProjects(),
    ]);
    return timeByProject(
      focus.error ? [] : ((focus.data ?? []) as FocusRow[]),
      days.error ? [] : ((days.data ?? []) as CueDayRow[]),
      links,
    );
  } catch {
    return new Map();
  }
}

/** This week's coding: total seconds, seconds per local date, and the coding streak. */
export interface WeekCoding {
  total: number;
  byDay: Map<string, number>;
  streak: number;
}

/** Sums Cue day rows (the private bucket included) into a total and per-day seconds. */
export function sumWeekCoding(rows: { date: string; seconds: number | null }[]): Omit<WeekCoding, "streak"> {
  const byDay = new Map<string, number>();
  let total = 0;
  for (const row of rows) {
    const seconds = Math.max(0, Number(row.seconds) || 0);
    total += seconds;
    byDay.set(row.date, (byDay.get(row.date) ?? 0) + seconds);
  }
  return { total, byDay };
}

/**
 * Your coding time over the last seven days, for Today's header. It follows the
 * profile's rule (lib/profileActivity.ts): when there is coding time, it leads.
 */
export async function fetchWeekCoding(userId: string): Promise<WeekCoding> {
  try {
    const [days, stats] = await Promise.all([
      supabase.from("cue_project_days").select("date, seconds").eq("user_id", userId).gte("date", localDate(6)),
      supabase.from("user_coding_stats").select("current_streak_days").eq("user_id", userId).maybeSingle(),
    ]);
    const summed = sumWeekCoding(days.error ? [] : ((days.data ?? []) as { date: string; seconds: number | null }[]));
    const streak = Number((stats.data as { current_streak_days?: number } | null)?.current_streak_days ?? 0) || 0;
    return { ...summed, streak };
  } catch {
    return { total: 0, byDay: new Map(), streak: 0 };
  }
}
