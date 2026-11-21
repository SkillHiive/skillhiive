import { beforeEach, describe, expect, it, vi } from "vitest";

const upload = vi.fn();
const getPublicUrl = vi.fn();
const from = vi.fn<(bucket: string) => unknown>(() => ({ upload, getPublicUrl }));

vi.mock("./supabase", () => ({ supabase: { storage: { from: (bucket: string) => from(bucket) } } }));

import { PROFILE_IMAGES_BUCKET, profileImagePath, uploadProfileImage } from "./profiles";

describe("profile images", () => {
  beforeEach(() => {
    upload.mockReset();
    getPublicUrl.mockReset();
    from.mockClear();
  });

  it("names files the way the original profile page did", () => {
    expect(PROFILE_IMAGES_BUCKET).toBe("profile-images");
    expect(profileImagePath("u1", "banner", 123)).toBe("u1/banner-123.jpg");
  });

  it("uploads a JPEG to the profile-images bucket and returns its public URL", async () => {
    upload.mockResolvedValue({ data: { path: "u1/avatar-1.jpg" }, error: null });
    getPublicUrl.mockReturnValue({ data: { publicUrl: "https://cdn/u1/avatar-1.jpg" } });
    const blob = new Blob(["x"], { type: "image/jpeg" });

    await expect(uploadProfileImage("u1", "avatar", blob)).resolves.toBe("https://cdn/u1/avatar-1.jpg");
    expect(from).toHaveBeenCalledWith("profile-images");
    const [path, body, options] = upload.mock.calls[0]!;
    expect(path).toMatch(/^u1\/avatar-\d+\.jpg$/);
    expect(body).toBe(blob);
    expect(options).toEqual({ contentType: "image/jpeg", upsert: true });
    expect(getPublicUrl).toHaveBeenCalledWith("u1/avatar-1.jpg");
  });

  it("throws when the upload fails", async () => {
    upload.mockResolvedValue({ data: null, error: new Error("denied") });
    await expect(uploadProfileImage("u1", "avatar", new Blob())).rejects.toThrow("denied");
  });
});
