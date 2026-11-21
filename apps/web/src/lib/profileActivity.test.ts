import { describe, expect, it } from "vitest";
import type { UserCodingTime } from "./timeTracker";
import type { FocusStats, HeatmapDay, ShippedNote } from "./todayData";
import {
  activityHeatmap,
  countUpValue,
  dayActivity,
  dayLabel,
  isEmptyDay,
  profileSummary,
  utcDayKey,
} from "./profileActivity";

const coding = (over: Partial<UserCodingTime> = {}): UserCodingTime => ({
  total_seconds: 20 * 3600 + 32 * 60,
  language_breakdown: [],
  daily_breakdown: [
    { date: "2026-11-18", seconds: 3600 },
    { date: "2026-11-19", seconds: 0 },
    { date: "2026-11-20", seconds: 1800 },
  ],
  current_streak_days: 1,
  longest_streak_days: 3,
  last_coded_at: null,
  is_public: true,
  ...over,
});

const focus = (over: Partial<FocusStats> = {}): FocusStats => ({
  total_minutes: 0,
  total_sessions: 0,
  days_active: 0,
  last_7d_minutes: 0,
  current_streak: 0,
  ...over,
});

const note = (id: string, created_at: string): ShippedNote => ({
  id,
  body: `shipped ${id}`,
  blockers: null,
  actual_min: null,
  created_at,
});

describe("profileSummary", () => {
  it("leads with coding time, its streak and its active days", () => {
    expect(profileSummary(coding(), focus())).toEqual({
      unit: "coding",
      totalSeconds: 20 * 3600 + 32 * 60,
      streakDays: 1,
      activeDays: 2,
      sessions: 0,
    });
  });

  it("keeps focus sessions alongside coding time", () => {
    expect(profileSummary(coding(), focus({ total_sessions: 4, total_minutes: 90 }))?.sessions).toBe(4);
  });

  it("falls back to focus time when nothing was coded", () => {
    expect(
      profileSummary(coding({ total_seconds: 0 }), focus({ total_minutes: 90, total_sessions: 3, days_active: 2, current_streak: 2 })),
    ).toEqual({ unit: "focus", totalSeconds: 5400, streakDays: 2, activeDays: 2, sessions: 3 });
  });

  it("is null when there is nothing to show", () => {
    expect(profileSummary(null, null)).toBeNull();
    expect(profileSummary(coding({ total_seconds: 0 }), focus())).toBeNull();
  });
});

describe("activityHeatmap", () => {
  const focusDays: HeatmapDay[] = [{ day: "2026-11-18", minutes: 25, sessions: 1 }];

  it("uses coding minutes when there are any", () => {
    expect(activityHeatmap(coding(), focusDays)).toEqual({
      unit: "coding",
      days: [
        { day: "2026-11-18", minutes: 60, sessions: 0 },
        { day: "2026-11-20", minutes: 30, sessions: 0 },
      ],
    });
  });

  it("uses focus minutes otherwise, and is null when both are empty", () => {
    expect(activityHeatmap(coding({ daily_breakdown: [] }), focusDays)).toEqual({ unit: "focus", days: focusDays });
    expect(activityHeatmap(null, [])).toBeNull();
  });
});

describe("dayActivity", () => {
  it("collects a day's coding, focus and shipped notes", () => {
    const day = dayActivity(
      "2026-11-18",
      coding(),
      [
        { day: "2026-11-18", minutes: 25, sessions: 1 },
        { day: "2026-11-17", minutes: 50, sessions: 2 },
      ],
      [note("a", "2026-11-18T09:00:00Z"), note("b", "2026-11-17T23:59:00Z")],
    );
    expect(day.codingSeconds).toBe(3600);
    expect(day.focusMinutes).toBe(25);
    expect(day.sessions).toBe(1);
    expect(day.shipped.map((s) => s.id)).toEqual(["a"]);
    expect(isEmptyDay(day)).toBe(false);
  });

  it("is empty on a day with nothing", () => {
    expect(isEmptyDay(dayActivity("2026-01-01", null, [], []))).toBe(true);
  });
});

describe("utcDayKey and dayLabel", () => {
  it("reads timestamps as UTC days and labels a key without shifting it", () => {
    expect(utcDayKey("2026-11-18T23:30:00-02:00")).toBe("2026-11-19");
    expect(utcDayKey("not a date")).toBeNull();
    expect(dayLabel("2026-11-03", "en-GB")).toBe("Tue 3 Nov");
  });
});

describe("countUpValue", () => {
  it("eases from 0 and lands exactly on the target", () => {
    expect(countUpValue(100, 0, 600)).toBe(0);
    expect(countUpValue(100, 300, 600)).toBeGreaterThan(50);
    expect(countUpValue(100, 600, 600)).toBe(100);
    expect(countUpValue(100, 50, 0)).toBe(100);
  });
});
