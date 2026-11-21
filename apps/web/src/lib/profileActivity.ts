import type { UserCodingTime } from "./timeTracker";
import type { FocusStats, HeatmapDay, ShippedNote } from "./todayData";

/** Which kind of time a number or heatmap counts. */
export type ActivityUnit = "coding" | "focus";

/** The one summary a profile shows: a headline total, its streak and active days, and focus sessions. */
export interface ProfileSummary {
  unit: ActivityUnit;
  /** The headline total, in seconds. */
  totalSeconds: number;
  streakDays: number;
  activeDays: number;
  /** Focus sessions (0 when there are none, and then not shown). */
  sessions: number;
}

/**
 * Coding time (Cue or a tracker) leads when there is any; otherwise focus time does.
 * Null when neither has anything to show.
 */
export function profileSummary(
  coding: UserCodingTime | null,
  focus: FocusStats | null,
): ProfileSummary | null {
  const sessions = focus?.total_sessions ?? 0;
  if (coding && coding.total_seconds > 0) {
    return {
      unit: "coding",
      totalSeconds: coding.total_seconds,
      streakDays: coding.current_streak_days,
      activeDays: coding.daily_breakdown.filter((d) => d.seconds > 0).length,
      sessions,
    };
  }
  if (focus && (focus.total_minutes > 0 || focus.total_sessions > 0)) {
    return {
      unit: "focus",
      totalSeconds: focus.total_minutes * 60,
      streakDays: focus.current_streak,
      activeDays: focus.days_active,
      sessions,
    };
  }
  return null;
}

/** One heatmap: coding minutes when there are any, else focus minutes. Null when both are empty. */
export function activityHeatmap(
  coding: UserCodingTime | null,
  focusDays: HeatmapDay[],
): { unit: ActivityUnit; days: HeatmapDay[] } | null {
  const codingDays = (coding?.daily_breakdown ?? []).filter((d) => d.seconds > 0);
  if (codingDays.length > 0) {
    return {
      unit: "coding",
      days: codingDays.map((d) => ({ day: d.date, minutes: Math.round(d.seconds / 60), sessions: 0 })),
    };
  }
  if (focusDays.some((d) => d.minutes > 0 || d.sessions > 0)) return { unit: "focus", days: focusDays };
  return null;
}

/**
 * The calendar day (YYYY-MM-DD) of a timestamp, in UTC: the same days the focus
 * heatmap is grouped by (get_focus_heatmap), so a day's sessions and notes line up.
 */
export function utcDayKey(iso: string): string | null {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return new Date(t).toISOString().slice(0, 10);
}

/** Everything known about one day, for the heatmap's day popover. */
export interface DayActivity {
  day: string;
  codingSeconds: number;
  focusMinutes: number;
  sessions: number;
  shipped: ShippedNote[];
}

export function dayActivity(
  day: string,
  coding: UserCodingTime | null,
  focusDays: HeatmapDay[],
  shipped: ShippedNote[],
): DayActivity {
  const codingSeconds = (coding?.daily_breakdown ?? [])
    .filter((d) => d.date === day)
    .reduce((sum, d) => sum + d.seconds, 0);
  const focus = focusDays.filter((d) => d.day === day);
  return {
    day,
    codingSeconds,
    focusMinutes: focus.reduce((sum, d) => sum + d.minutes, 0),
    sessions: focus.reduce((sum, d) => sum + Number(d.sessions ?? 0), 0),
    shipped: shipped.filter((s) => utcDayKey(s.created_at) === day),
  };
}

export function isEmptyDay(d: DayActivity): boolean {
  return d.codingSeconds <= 0 && d.focusMinutes <= 0 && d.sessions <= 0 && d.shipped.length === 0;
}

/** "Mon, 3 Nov" for a YYYY-MM-DD key, read as a calendar day (no time-zone shift). */
export function dayLabel(day: string, locale?: string): string {
  const [y, m, d] = day.split("-").map(Number);
  if (!y || !m || !d) return day;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/** Where a count-up is after `elapsedMs` of `durationMs`: ease-out, whole numbers, ending exactly on target. */
export function countUpValue(target: number, elapsedMs: number, durationMs: number): number {
  if (durationMs <= 0 || elapsedMs >= durationMs) return target;
  const t = Math.max(0, elapsedMs) / durationMs;
  const eased = 1 - Math.pow(1 - t, 3);
  return Math.round(target * eased);
}
