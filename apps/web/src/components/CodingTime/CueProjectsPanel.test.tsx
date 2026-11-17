import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as cue from "@/lib/cue";
import { CueProjectsPanel } from "./CueProjectsPanel";

vi.mock("@/lib/supabase", () => ({ supabase: {} }));
vi.mock("@/lib/cue", async () => (await import("@/test/cueMock")).mockCueModule());

const air = { id: "d1", name: "air", platform: "darwin-arm64", created_at: "", last_seen_at: null, revoked_at: null };
const studio = { id: "d2", name: "studio", platform: "darwin-arm64", created_at: "", last_seen_at: null, revoked_at: null };
const cueRow = (device_id: string, project_key: string, name: string, remote: string | null, today_project_id: string | null = null) =>
  ({ device_id, project_key, name, remote, today_project_id, total_seconds: 3600, last_date: "2026-11-16" });

const m = {
  devices: vi.mocked(cue.fetchMyCueDevices),
  projects: vi.mocked(cue.fetchMyCueProjects),
  coding: vi.mocked(cue.fetchMyCodingVisibility),
  privateSeconds: vi.mocked(cue.fetchPrivateWorkSeconds),
  map: vi.mocked(cue.mapCueProject),
  create: vi.mocked(cue.createProjectFromCue),
  visibility: vi.mocked(cue.setProjectVisibility),
};

beforeEach(() => {
  vi.resetAllMocks();
  m.devices.mockResolvedValue([air, studio]);
  m.projects.mockResolvedValue([]);
  m.coding.mockResolvedValue(new Map());
  m.privateSeconds.mockResolvedValue(0);
  m.map.mockResolvedValue({ ok: true });
  m.create.mockResolvedValue({ ok: true, id: "new" });
  m.visibility.mockResolvedValue({ ok: true });
});

describe("CueProjectsPanel", () => {
  it("shows nothing for someone who never linked Cue", async () => {
    m.devices.mockResolvedValue([]);
    const { container } = render(<CueProjectsPanel projects={[]} />);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(container.textContent).toBe("");
  });

  it("lists one row per repository, across machines, and says only the owner sees it", async () => {
    m.projects.mockResolvedValue([
      cueRow("d1", "p_a", "stager-1", "github.com/me/stager-1"),
      cueRow("d2", "p_b", "stager-1", "github.com/me/stager-1"),
    ]);
    render(<CueProjectsPanel projects={[]} />);
    expect(await screen.findByText("stager-1")).toBeTruthy();
    expect(screen.getByText(/2h · air, studio/)).toBeTruthy();
    expect(screen.getByText(/Only you can see these/)).toBeTruthy();
  });

  it("creates a private project from a Cue project", async () => {
    const user = userEvent.setup();
    const changed = vi.fn();
    m.projects.mockResolvedValue([cueRow("d1", "p_a", "stager-1", "github.com/me/stager-1")]);
    render(<CueProjectsPanel projects={[{ id: "t1", name: "Something else" }]} onChanged={changed} />);
    await user.click(await screen.findByRole("button", { name: "Create project" }));
    expect(m.create).toHaveBeenCalledWith("d1", "p_a");
    expect((await screen.findByRole("status")).textContent).toBe("stager-1 is now a project. Only you can see it.");
    expect(changed).toHaveBeenCalledTimes(1);
    expect(m.visibility).not.toHaveBeenCalled();
  });

  it("suggests the project with the same name instead of creating a second one", async () => {
    const user = userEvent.setup();
    m.projects.mockResolvedValue([cueRow("d1", "p_a", "herebyinvite", "github.com/me/herebyinvite")]);
    render(<CueProjectsPanel projects={[{ id: "t1", name: "HerebyInvite" }]} />);
    await user.click(await screen.findByRole("button", { name: "Link to HerebyInvite" }));
    expect(m.map).toHaveBeenCalledWith("d1", "p_a", "t1");
    expect(screen.queryByRole("button", { name: "Create project" })).toBeNull();
  });

  it("adds a Cue project to any existing project", async () => {
    const user = userEvent.setup();
    m.projects.mockResolvedValue([cueRow("d1", "p_a", "api", null)]);
    render(<CueProjectsPanel projects={[{ id: "t1", name: "Herebyinvite" }]} />);
    await user.selectOptions(await screen.findByLabelText("Add api to a project"), "t1");
    expect(m.map).toHaveBeenCalledWith("d1", "p_a", "t1");
  });

  it("makes a linked project public only after confirming what others will see", async () => {
    const user = userEvent.setup();
    m.projects.mockResolvedValue([cueRow("d1", "p_a", "stager-1", "github.com/me/stager-1", "t1")]);
    render(<CueProjectsPanel projects={[{ id: "t1", name: "Stager", is_public: false }]} />);
    expect(await screen.findByText("Only you")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Make public…" }));
    expect(m.visibility).not.toHaveBeenCalled();
    const confirm = screen.getByRole("group", { name: "Make Stager public" });
    expect(within(confirm).getByText(/repository address/)).toBeTruthy();
    await user.click(within(confirm).getByRole("button", { name: "Make public" }));
    expect(m.visibility).toHaveBeenCalledWith("t1", true);
  });

  it("counts an old public project as public only when its coding time is public too", async () => {
    m.projects.mockResolvedValue([cueRow("d1", "p_a", "stager-1", null, "t1")]);
    m.coding.mockResolvedValue(new Map([["t1", false]]));
    const { unmount } = render(<CueProjectsPanel projects={[{ id: "t1", name: "Stager" }]} />);
    expect(await screen.findByText("Only you")).toBeTruthy();
    unmount();
    m.coding.mockResolvedValue(new Map([["t1", true]]));
    render(<CueProjectsPanel projects={[{ id: "t1", name: "Stager" }]} />);
    expect(await screen.findByText("Public")).toBeTruthy();
  });

  it("unlinks a repository", async () => {
    const user = userEvent.setup();
    m.projects.mockResolvedValue([cueRow("d2", "p_b", "stager-1", "github.com/me/stager-1", "t1")]);
    render(<CueProjectsPanel projects={[{ id: "t1", name: "Stager" }]} />);
    await user.click(await screen.findByRole("button", { name: "Unlink stager-1" }));
    expect(m.map).toHaveBeenCalledWith("d2", "p_b", null);
  });

  it("mentions time in projects kept on the computer, without naming them", async () => {
    m.privateSeconds.mockResolvedValue(5400);
    render(<CueProjectsPanel projects={[]} />);
    expect(await screen.findByText(/1h 30m this week in projects you keep on your computer/)).toBeTruthy();
  });
});
