import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfileContext, type ProfileContextValue } from "@/hooks/useProfile";
import ToastProvider from "@/components/ToastProvider";

const upload = vi.hoisted(() => vi.fn());
vi.mock("@/lib/profiles", () => ({ uploadProfileImage: upload }));

import { EditableImage } from "./EditableImage";

const me = {
  id: "u1",
  username: "rohan",
  avatar: null,
  banner: null,
  bio: null,
  displayname: "Rohan",
  created_at: "2026-01-01T00:00:00Z",
  email: "r@example.com",
};

function show(editable: boolean, updateField: ProfileContextValue["updateField"], onSaved = vi.fn()) {
  render(
    <ProfileContext.Provider value={{ profile: me, loading: false, error: null, updateField, reload: async () => {} }}>
      <ToastProvider>
        <EditableImage kind="avatar" editable={editable} radius="50%" onSaved={onSaved}>
          <img alt="Rohan" src="data:," />
        </EditableImage>
      </ToastProvider>
    </ProfileContext.Provider>,
  );
  return onSaved;
}

describe("EditableImage", () => {
  beforeEach(() => {
    upload.mockReset();
    URL.createObjectURL = vi.fn(() => "blob:picked");
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLImageElement.prototype, "getBoundingClientRect").mockReturnValue({
      width: 300,
      height: 200,
    } as DOMRect);
    Object.defineProperty(HTMLImageElement.prototype, "naturalWidth", { configurable: true, get: () => 1200 });
    Object.defineProperty(HTMLImageElement.prototype, "naturalHeight", { configurable: true, get: () => 800 });
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage: vi.fn() } as never);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((cb) => cb(new Blob(["jpg"], { type: "image/jpeg" })));
  });
  afterEach(() => vi.restoreAllMocks());

  it("is just the picture for visitors", () => {
    show(false, vi.fn());
    expect(screen.getByAltText("Rohan")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Change avatar" })).toBeNull();
  });

  it("crops a picked image, uploads it, saves the profile and says so", async () => {
    const user = userEvent.setup();
    upload.mockResolvedValue("https://cdn/u1/avatar-1.jpg");
    const updateField = vi.fn().mockResolvedValue({ ok: true });
    const onSaved = show(true, updateField);

    expect(screen.getByRole("button", { name: "Change avatar" })).toBeTruthy();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, new File(["x"], "me.png", { type: "image/png" }));

    const dialog = await screen.findByRole("dialog", { name: "Avatar" });
    fireEvent.load(dialog.querySelector("img")!);
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(upload).toHaveBeenCalledWith("u1", "avatar", expect.any(Blob));
    expect(updateField).toHaveBeenCalledWith("avatar", "https://cdn/u1/avatar-1.jpg");
    expect(onSaved).toHaveBeenCalledWith("https://cdn/u1/avatar-1.jpg");
    expect(await screen.findByText("Avatar updated")).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("keeps the dialog open and shows a toast when the upload fails", async () => {
    const user = userEvent.setup();
    upload.mockRejectedValue(new Error("denied"));
    const updateField = vi.fn();
    const onSaved = show(true, updateField);

    await user.upload(document.querySelector('input[type="file"]') as HTMLInputElement, new File(["x"], "me.png", { type: "image/png" }));
    const dialog = await screen.findByRole("dialog", { name: "Avatar" });
    fireEvent.load(dialog.querySelector("img")!);
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Couldn't upload your avatar. Try again.")).toBeTruthy();
    expect(updateField).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Avatar" })).toBeTruthy();
  });
});
