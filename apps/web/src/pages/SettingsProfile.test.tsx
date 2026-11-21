import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { ProfileContext, type ProfileContextValue } from "@/hooks/useProfile";
import SettingsProfile from "./SettingsProfile";

const profile = {
  id: "u1",
  username: "rohan",
  avatar: null,
  banner: null,
  bio: null,
  displayname: "Rohan",
  created_at: "2026-01-01T00:00:00Z",
  email: "r@example.com",
};

function show(updateField: ProfileContextValue["updateField"]) {
  return render(
    <ProfileContext.Provider value={{ profile, loading: false, error: null, updateField, reload: async () => {} }}>
      <MemoryRouter>
        <SettingsProfile />
      </MemoryRouter>
    </ProfileContext.Provider>,
  );
}

describe("SettingsProfile", () => {
  it("keeps the editor open with the reason when a save fails", async () => {
    const user = userEvent.setup();
    const updateField = vi.fn().mockResolvedValue({ ok: false, error: "That username is taken. Try another." });
    show(updateField);
    await user.click(screen.getByText("Username"));
    const input = screen.getByRole("textbox", { name: "Username" });
    await user.clear(input);
    await user.type(input, "taken{Enter}");
    expect(updateField).toHaveBeenCalledWith("username", "taken");
    expect((await screen.findByRole("alert")).textContent).toBe("That username is taken. Try another.");
    expect(screen.getByText("Edit Username")).toBeTruthy();
    // Typing again clears the message.
    await user.type(input, "2");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("closes the editor when the save works", async () => {
    const user = userEvent.setup();
    const updateField = vi.fn().mockResolvedValue({ ok: true });
    show(updateField);
    await user.click(screen.getByText("Bio"));
    await user.type(screen.getByRole("textbox", { name: "Bio" }), "Hello");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(updateField).toHaveBeenCalledWith("bio", "Hello");
    expect(screen.queryByText("Edit Bio")).toBeNull();
  });
});
