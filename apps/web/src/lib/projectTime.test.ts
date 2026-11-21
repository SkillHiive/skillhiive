import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({ supabase: {} }));

import { allTimeByProject, localDate, pickSpotlight, projectSeconds, sumWeekCoding, timeByProject } from "./projectTime";

describe("projectSeconds", () => {
  it("counts the larger of focus and coded time, never both", () => {
    expect(projectSeconds({ focus: 1800, coded: 3600 })).toBe(3600);
    expect(projectSeconds({ focus: 5400, coded: 0 })).toBe(5400);
    expect(projectSeconds(undefined)).toBe(0);
  });
});

describe("timeByProject", () => {
  it("adds focus sessions and linked Cue days per project", () => {
    const time = timeByProject(
      [
        { project_id: "p1", duration_seconds: 600 },
        { project_id: "p1", duration_seconds: 1200 },
        { project_id: null, duration_seconds: 999 },
      ],
      [
        { device_id: "d1", project_key: "p_a", seconds: 3600 },
        { device_id: "d2", project_key: "p_a", seconds: 1800 },
        { device_id: "d1", project_key: "p_b", seconds: 100 },
      ],
      [
        { device_id: "d1", project_key: "p_a", today_project_id: "p1" },
        { device_id: "d2", project_key: "p_a", today_project_id: "p2" },
        { device_id: "d1", project_key: "p_b", today_project_id: null },
      ],
    );
    expect(time.get("p1")).toEqual({ focus: 1800, coded: 3600 });
    expect(time.get("p2")).toEqual({ focus: 0, coded: 1800 });
    expect(time.size).toBe(2);
  });
});

describe("allTimeByProject", () => {
  it("joins each project's focus minutes with its linked Cue seconds", () => {
    const time = allTimeByProject(
      [
        { id: "p1", total_minutes: 30 },
        { id: "p2", total_minutes: 0 },
      ],
      [
        { today_project_id: "p2", total_seconds: 7200 },
        { today_project_id: "p2", total_seconds: 3600 },
        { today_project_id: "gone", total_seconds: 50 },
        { today_project_id: null, total_seconds: 50 },
      ],
    );
    expect(time.get("p1")).toEqual({ focus: 1800, coded: 0 });
    expect(time.get("p2")).toEqual({ focus: 0, coded: 10800 });
    expect(time.has("gone")).toBe(false);
  });
});

describe("pickSpotlight", () => {
  const projects = [
    { id: "a", name: "api" },
    { id: "b", name: "skillhiive" },
  ];

  it("picks the project with the most time", () => {
    const time = new Map([
      ["a", { focus: 600, coded: 0 }],
      ["b", { focus: 0, coded: 10800 }],
    ]);
    expect(pickSpotlight(projects, time)).toEqual({ project: projects[1], seconds: 10800 });
  });

  it("has nothing to show when no project has time", () => {
    expect(pickSpotlight(projects, new Map())).toBeNull();
    expect(pickSpotlight([], new Map([["a", { focus: 5, coded: 5 }]]))).toBeNull();
  });
});

describe("localDate", () => {
  it("counts back calendar days in local time", () => {
    const now = new Date(2026, 10, 3, 9, 30);
    expect(localDate(0, now)).toBe("2026-11-03");
    expect(localDate(6, now)).toBe("2026-10-28");
  });
});

describe("sumWeekCoding", () => {
  it("adds every row, the private bucket included, and keeps a per-day total", () => {
    const week = sumWeekCoding([
      { date: "2026-11-20", seconds: 3600 },
      { date: "2026-11-20", seconds: 600 },
      { date: "2026-11-21", seconds: null },
      { date: "2026-11-21", seconds: 1200 },
    ]);
    expect(week.total).toBe(5400);
    expect(week.byDay.get("2026-11-20")).toBe(4200);
    expect(week.byDay.get("2026-11-21")).toBe(1200);
  });
});
