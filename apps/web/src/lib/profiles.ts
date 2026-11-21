import { supabase } from "./supabase";

/** The username for a profile id, or null when it has none yet or can't be read. */
export async function usernameForId(id: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  const username = (data as { username: string | null }).username;
  return username && username.trim() ? username : null;
}

/** Where avatars and banners live. The same bucket and paths the original profile page used. */
export const PROFILE_IMAGES_BUCKET = "profile-images";

/** `<user id>/avatar-<ms>.jpg`: a new name each time, so the browser never shows a cached old picture. */
export function profileImagePath(userId: string, kind: "avatar" | "banner", now = Date.now()): string {
  return `${userId}/${kind}-${now}.jpg`;
}

/** Uploads a cropped JPEG and returns its public URL. Throws on failure. */
export async function uploadProfileImage(
  userId: string,
  kind: "avatar" | "banner",
  blob: Blob,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(PROFILE_IMAGES_BUCKET)
    .upload(profileImagePath(userId, kind), blob, { contentType: "image/jpeg", upsert: true });
  if (error) throw error;
  const { data: url } = supabase.storage.from(PROFILE_IMAGES_BUCKET).getPublicUrl(data.path);
  return url.publicUrl;
}
