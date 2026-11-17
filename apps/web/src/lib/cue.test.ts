import { describe, expect, it, vi } from "vitest";

vi.mock("./supabase", () => ({ supabase: { rpc: vi.fn() } }));

import { supabase } from "./supabase";
import { agentSharePercent, cueErrorMessage, earlierHistoryNote, fetchUserCodingExtras, formatCueSince, groupCueProjects, normalizeLinkCode, suggestedProject, summarizeComparison } from "./cue";

describe("normalizeLinkCode", () => {
  it("accepts the code however it was typed", () => {
    for (const raw of ["ABCD-2345", "abcd2345", " abcd 2345 ", "ab-cd-23-45"]) {
      expect(normalizeLinkCode(raw)).toBe("ABCD-2345");
    }
  });

  it("rejects anything that cannot be a code", () => {
    for (const raw of [null, undefined, "", "ABCD", "ABCD-23456", "!!!!-!!!!"]) {
      expect(normalizeLinkCode(raw)).toBeNull();
    }
  });
});

describe("agentSharePercent", () => {
  it("is a whole percentage, never above 100, and 0 without time", () => {
    expect(agentSharePercent(3600, 900)).toBe(25);
    expect(agentSharePercent(3600, 3600)).toBe(100);
    expect(agentSharePercent(100, 500)).toBe(100);
    expect(agentSharePercent(0, 0)).toBe(0);
    expect(agentSharePercent(0, 50)).toBe(0);
    expect(agentSharePercent(3600, 0)).toBe(0);
  });
});

describe("summarizeComparison", () => {
  it("counts only days both sources reported, and which of those are within 10%", () => {
    const summary = summarizeComparison([
      { date: "2026-11-10", cue_seconds: 3600, tracker_seconds: 3500 },
      { date: "2026-11-11", cue_seconds: 7200, tracker_seconds: 3600 },
      { date: "2026-11-12", cue_seconds: 1800, tracker_seconds: 0 },
      { date: "2026-11-13", cue_seconds: 0, tracker_seconds: 0 },
      { date: "2026-11-14", cue_seconds: 3240, tracker_seconds: 3600 },
    ]);
    expect(summary).toEqual({ cueTotal: 15840, trackerTotal: 10700, comparableDays: 3, closeDays: 2 });
  });

  it("handles an empty range", () => {
    expect(summarizeComparison([])).toEqual({ cueTotal: 0, trackerTotal: 0, comparableDays: 0, closeDays: 0 });
  });
});

describe("cueErrorMessage", () => {
  it("explains the cases a person can act on", () => {
    expect(cueErrorMessage("link_expired")).toContain("cue login");
    expect(cueErrorMessage("link_used")).toContain("already used");
    expect(cueErrorMessage("not_authenticated")).toContain("Sign in");
    expect(cueErrorMessage("Could not find the function public.approve_cue_link", "PGRST202")).toContain("isn't switched on");
    expect(cueErrorMessage(undefined)).toBe("Something went wrong. Try again.");
  });
});

describe("fetchUserCodingExtras", () => {
  const rpc = vi.mocked(supabase.rpc);

  it("reads the first Cue day when earlier days were carried", async () => {
    rpc.mockResolvedValueOnce({ data: [{ source: "cue", agent_seconds: 600, cue_since: "2026-11-16" }], error: null } as never);
    expect(await fetchUserCodingExtras("u1")).toEqual({ source: "cue", agent_seconds: 600, cue_since: "2026-11-16" });
  });

  it("leaves cue_since empty when nothing was carried or the value is not a date", async () => {
    rpc.mockResolvedValueOnce({ data: [{ source: "cue", agent_seconds: 0, cue_since: null }], error: null } as never);
    expect((await fetchUserCodingExtras("u1"))?.cue_since).toBeNull();
    rpc.mockResolvedValueOnce({ data: [{ source: "tracker", agent_seconds: 0, cue_since: "soon" }], error: null } as never);
    expect((await fetchUserCodingExtras("u1"))?.cue_since).toBeNull();
  });
});

describe("earlierHistoryNote", () => {
  it("names the first Cue day only on a Cue profile that carried history", () => {
    expect(formatCueSince("2026-11-05")).toBe("5 Nov 2026");
    expect(formatCueSince("2026-13-05")).toBeNull();
    expect(earlierHistoryNote({ source: "cue", cue_since: "2026-11-16" })).toBe("Days before 16 Nov 2026 are from an earlier tracker.");
    expect(earlierHistoryNote({ source: "cue", cue_since: null })).toBeNull();
    expect(earlierHistoryNote({ source: "tracker", cue_since: "2026-11-16" })).toBeNull();
    expect(earlierHistoryNote(null)).toBeNull();
  });
});

describe("groupCueProjects", () => {
  const devices = [
    { id: "d1", name: "air", platform: "", created_at: "", last_seen_at: null, revoked_at: null },
    { id: "d2", name: "studio", platform: "", created_at: "", last_seen_at: null, revoked_at: null },
  ];
  const row = (device_id: string, project_key: string, name: string, remote: string | null, seconds: number, last_date: string | null, today_project_id: string | null = null) =>
    ({ device_id, project_key, name, remote, today_project_id, total_seconds: seconds, last_date });

  it("joins one repository's copies across machines by remote", () => {
    const groups = groupCueProjects(
      [row("d1", "p_a", "stager-1", "github.com/me/stager-1", 600, "2026-11-15"), row("d2", "p_b", "stager", "github.com/me/stager-1", 300, "2026-11-16", "t1")],
      devices,
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ name: "stager", total_seconds: 900, device_names: ["air", "studio"], today_project_id: "t1", last_date: "2026-11-16" });
    expect(groups[0]!.members).toHaveLength(2);
  });

  it("keeps projects without a remote apart, most recent first", () => {
    const groups = groupCueProjects(
      [row("d1", "p_a", "notes", null, 60, "2026-11-01"), row("d2", "p_b", "notes", null, 60, "2026-11-10"), row("d1", "p_c", "old", null, 60, null)],
      devices,
    );
    expect(groups.map((group) => group.id)).toEqual(["d2:p_b", "d1:p_a", "d1:p_c"]);
  });
});

describe("suggestedProject", () => {
  const group = { id: "github.com/me/herebyinvite", name: "hbi-web", remote: "github.com/me/herebyinvite", members: [], device_names: [], today_project_id: null, total_seconds: 0, last_date: null };
  it("matches by name or by the repository's last path part, ignoring case", () => {
    expect(suggestedProject(group, [{ id: "a", name: "Other" }, { id: "b", name: "HerebyInvite " }])?.id).toBe("b");
    expect(suggestedProject({ ...group, remote: null }, [{ id: "c", name: "HBI-web" }])?.id).toBe("c");
    expect(suggestedProject({ ...group, remote: null }, [{ id: "b", name: "HerebyInvite" }])).toBeNull();
  });
});
