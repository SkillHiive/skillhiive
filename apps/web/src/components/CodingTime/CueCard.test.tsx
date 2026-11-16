import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as cue from "@/lib/cue";
import * as today from "@/lib/todayData";
import { CueCard } from "./CueCard";

vi.mock("@/lib/supabase", () => ({ supabase: {} }));
vi.mock("@/lib/cue", async () => (await import("@/test/cueMock")).mockCueModule());
vi.mock("@/lib/todayData", () => ({ fetchMyProjects: vi.fn() }));

const device = { id: "d1", name: "rohans-air", platform: "darwin-arm64", created_at: "2026-11-01T00:00:00Z", last_seen_at: null, revoked_at: null };
const project = { device_id: "d1", project_key: "p_0123456789abcdef", name: "HerebyInvite", remote: "github.com/me/herebyinvite", today_project_id: null, total_seconds: 5400, last_date: "2026-11-15" };

const m = {
  devices: vi.mocked(cue.fetchMyCueDevices),
  projects: vi.mocked(cue.fetchMyCueProjects),
  source: vi.mocked(cue.fetchCodingTimeSource),
  comparison: vi.mocked(cue.fetchCodingTimeComparison),
  revoke: vi.mocked(cue.revokeCueDevice),
  map: vi.mocked(cue.mapCueProject),
  setSource: vi.mocked(cue.setCodingTimeSource),
  mine: vi.mocked(today.fetchMyProjects),
};

beforeEach(() => {
  vi.resetAllMocks();
  m.devices.mockResolvedValue([device]);
  m.projects.mockResolvedValue([project]);
  m.source.mockResolvedValue("tracker");
  m.comparison.mockResolvedValue([]);
  m.mine.mockResolvedValue([{ id: "t1", name: "Herebyinvite site" }] as never);
  m.revoke.mockResolvedValue({ ok: true });
  m.map.mockResolvedValue({ ok: true });
  m.setSource.mockResolvedValue({ ok: true });
});

describe("CueCard", () => {
  it("explains how to link when no device is linked", async () => {
    m.devices.mockResolvedValue([]);
    render(<CueCard hasTracker={false} />);
    expect(await screen.findByText(/Install Cue on your computer/)).toBeTruthy();
    expect(screen.queryByText("Linked devices")).toBeNull();
  });

  it("removes a device and keeps its history", async () => {
    const user = userEvent.setup();
    const changed = vi.fn();
    render(<CueCard hasTracker={false} onChanged={changed} />);
    await user.click(await screen.findByRole("button", { name: "Remove rohans-air" }));
    await user.click(screen.getByRole("button", { name: "Remove, keep history" }));
    expect(m.revoke).toHaveBeenCalledWith("d1", false);
    expect((await screen.findByRole("status")).textContent).toBe("Device removed. Its history was kept.");
    expect(changed).toHaveBeenCalledTimes(1);
  });

  it("removes a device and deletes what it sent", async () => {
    const user = userEvent.setup();
    render(<CueCard hasTracker={false} />);
    await user.click(await screen.findByRole("button", { name: "Remove rohans-air" }));
    await user.click(screen.getByRole("button", { name: "Remove and delete its data" }));
    expect(m.revoke).toHaveBeenCalledWith("d1", true);
    expect((await screen.findByRole("status")).textContent).toBe("Device and everything it sent were deleted.");
  });

  it("backs out of a removal without calling the server", async () => {
    const user = userEvent.setup();
    render(<CueCard hasTracker={false} />);
    await user.click(await screen.findByRole("button", { name: "Remove rohans-air" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(m.revoke).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Remove rohans-air" })).toBeTruthy();
  });

  it("shows a failed removal's reason and does not reload", async () => {
    const user = userEvent.setup();
    m.revoke.mockResolvedValue({ ok: false, error: "Not allowed." });
    const changed = vi.fn();
    render(<CueCard hasTracker={false} onChanged={changed} />);
    await user.click(await screen.findByRole("button", { name: "Remove rohans-air" }));
    await user.click(screen.getByRole("button", { name: "Remove, keep history" }));
    expect((await screen.findByRole("status")).textContent).toBe("Not allowed.");
    expect(changed).not.toHaveBeenCalled();
  });

  it("maps a published project to one of my projects, and unmaps it", async () => {
    const user = userEvent.setup();
    render(<CueCard hasTracker={false} />);
    const select = await screen.findByLabelText("SkillHive project for HerebyInvite");
    await user.selectOptions(select, "t1");
    expect(m.map).toHaveBeenCalledWith("d1", "p_0123456789abcdef", "t1");
    expect((await screen.findByRole("status")).textContent).toBe("Project linked.");
    await user.selectOptions(select, "");
    await waitFor(() => expect(m.map).toHaveBeenLastCalledWith("d1", "p_0123456789abcdef", null));
  });

  it("offers a source choice only with a tracker, and switching says history is kept", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<CueCard hasTracker={false} />);
    await screen.findByText("rohans-air");
    expect(screen.queryByRole("radiogroup")).toBeNull();
    unmount();

    render(<CueCard hasTracker />);
    const group = await screen.findByRole("radiogroup", { name: "Profile source" });
    expect(screen.getByText(/Switching to Cue keeps your earlier history/)).toBeTruthy();
    expect(within(group).getByRole("radio", { name: "Wakatime / Hackatime" }).getAttribute("aria-checked")).toBe("true");
    await user.click(within(group).getByRole("radio", { name: "Cue" }));
    expect(m.setSource).toHaveBeenCalledWith("cue");
    expect((await screen.findByRole("status")).textContent).toBe("Your profile now shows time from Cue.");
  });
});
