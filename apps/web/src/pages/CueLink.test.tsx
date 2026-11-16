import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import type { Session } from "@supabase/supabase-js";
import { AuthContext, type AuthState } from "@/hooks/authContext";
import * as cue from "@/lib/cue";
import CueLink from "./CueLink";

vi.mock("@/lib/supabase", () => ({ supabase: {} }));
vi.mock("@/lib/cue", async () => (await import("@/test/cueMock")).mockCueModule());

const signedIn = { user: { id: "u1" } } as unknown as Session;
const peek = vi.mocked(cue.peekCueLink);
const approve = vi.mocked(cue.approveCueLink);

function show(url: string, session: AuthState) {
  return render(
    <AuthContext.Provider value={session}>
      <MemoryRouter initialEntries={[url]}>
        <CueLink />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("CueLink", () => {
  it("asks a signed-out visitor to sign in and never looks the code up", () => {
    show("/link?code=ABCD-2345", null);
    // Signing in returns here with the code kept.
    expect(screen.getByRole("link", { name: "Sign in" }).getAttribute("href")).toBe("/login?next=%2Flink%3Fcode%3DABCD-2345");
    expect(peek).not.toHaveBeenCalled();
  });

  it("rejects a code that cannot be a code without calling the server", async () => {
    const user = userEvent.setup();
    show("/link", signedIn);
    await user.type(screen.getByLabelText(/Enter the code/), "ABC");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("alert").textContent).toContain("8-character code");
    expect(peek).not.toHaveBeenCalled();
  });

  it("says a code is no longer valid when the server does not know it", async () => {
    peek.mockResolvedValue(null);
    show("/link?code=abcd2345", signedIn);
    expect(await screen.findByText("That code isn't valid any more")).toBeTruthy();
    expect(peek).toHaveBeenCalledWith("ABCD-2345");
  });

  it("shows the device, links it on confirm, and says it is done", async () => {
    const user = userEvent.setup();
    peek.mockResolvedValue({ device_name: "rohans-air", platform: "darwin-arm64", expires_at: "2026-11-16T12:10:00Z" });
    approve.mockResolvedValue({ ok: true });
    show("/link?code=ABCD-2345", signedIn);
    expect(await screen.findByText("rohans-air")).toBeTruthy();
    expect(screen.getByText(/darwin-arm64 · code ABCD-2345/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Link this computer" }));
    expect(await screen.findByText("rohans-air is linked")).toBeTruthy();
    expect(approve).toHaveBeenCalledWith("ABCD-2345");
  });

  it("keeps the confirm step and shows the reason when approval fails", async () => {
    const user = userEvent.setup();
    peek.mockResolvedValue({ device_name: "rohans-air", platform: "darwin-arm64", expires_at: "2026-11-16T12:10:00Z" });
    approve.mockResolvedValue({ ok: false, error: "That code was already used." });
    show("/link?code=ABCD-2345", signedIn);
    await user.click(await screen.findByRole("button", { name: "Link this computer" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("That code was already used."));
    expect(screen.getByRole("button", { name: "Link this computer" })).toBeTruthy();
  });
});
