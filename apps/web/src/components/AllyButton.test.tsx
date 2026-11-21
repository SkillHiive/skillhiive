import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import type { Session } from "@supabase/supabase-js";
import { AuthContext } from "@/hooks/authContext";
import ConfirmProvider from "./ConfirmProvider";
import ToastProvider from "./ToastProvider";

const allies = vi.hoisted(() => ({
  fetchAllyStatus: vi.fn(),
  sendAllyRequest: vi.fn(),
  acceptAllyRequest: vi.fn(),
  removeAlly: vi.fn(),
}));
vi.mock("@/lib/allies", () => allies);

import AllyButton from "./AllyButton";

const session = { user: { id: "me" } } as unknown as Session;

function show(onAlliesChanged = vi.fn()) {
  render(
    <AuthContext.Provider value={session}>
      <ConfirmProvider>
        <ToastProvider>
          <MemoryRouter>
            <AllyButton profileId="them" returnTo="/p/them" onAlliesChanged={onAlliesChanged} />
          </MemoryRouter>
        </ToastProvider>
      </ConfirmProvider>
    </AuthContext.Provider>,
  );
  return onAlliesChanged;
}

describe("AllyButton", () => {
  beforeEach(() => {
    Object.values(allies).forEach((fn) => fn.mockReset());
  });

  it("sends a request, says so, and can undo it", async () => {
    const user = userEvent.setup();
    allies.fetchAllyStatus.mockResolvedValue("none");
    allies.sendAllyRequest.mockResolvedValue(undefined);
    allies.removeAlly.mockResolvedValue(undefined);
    show();

    await user.click(await screen.findByRole("button", { name: "Ally" }));
    expect(allies.sendAllyRequest).toHaveBeenCalledWith("me", "them");
    expect(await screen.findByText("Request sent")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Requested" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(allies.removeAlly).toHaveBeenCalledWith("me", "them");
    expect(await screen.findByRole("button", { name: "Ally" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
  });

  it("asks before ending an alliance", async () => {
    const user = userEvent.setup();
    allies.fetchAllyStatus.mockResolvedValue("accepted");
    allies.removeAlly.mockResolvedValue(undefined);
    const changed = show();

    await user.click(await screen.findByRole("button", { name: "Allied" }));
    expect(allies.removeAlly).not.toHaveBeenCalled();
    await user.click(await screen.findByRole("button", { name: "Remove" }));
    expect(allies.removeAlly).toHaveBeenCalledWith("me", "them");
    expect(changed).toHaveBeenCalledWith(-1);
    expect(await screen.findByRole("button", { name: "Ally" })).toBeTruthy();
  });

  it("shows a failure as a toast and keeps the state", async () => {
    const user = userEvent.setup();
    allies.fetchAllyStatus.mockResolvedValue("pending_received");
    allies.acceptAllyRequest.mockRejectedValue(new Error("offline"));
    const changed = show();

    await user.click(await screen.findByRole("button", { name: "Accept" }));
    expect(await screen.findByText("That didn't go through. Try again.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Accept" })).toBeTruthy();
    expect(changed).not.toHaveBeenCalled();
  });
});
