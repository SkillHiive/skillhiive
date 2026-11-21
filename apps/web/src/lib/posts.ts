import { supabase } from "./supabase";
import { withTimeout } from "./load";
import type { PostModel } from "@/components/feed/PostCards";

/** The columns a post card needs, with its author and attachments. */
export const POST_SELECT = `
  id,
  user_id,
  post_type,
  caption,
  likes_count,
  comments_count,
  created_at,
  profiles:profiles!posts_user_id_profiles_fkey ( id, username, avatar ),
  project_posts:project_posts!project_posts_post_id_fkey ( title, description, started_at, ended_at, status ),
  offer_posts:offer_posts!offer_posts_post_id_fkey ( company, role, salary_range, location, offer_type ),
  post_images:post_images!post_images_post_id_fkey ( url, sort_order )
`;

/** One person's newest posts. Throws on failure. */
export async function fetchUserPosts(userId: string, limit = 10): Promise<PostModel[]> {
  const { data, error } = await withTimeout(
    supabase
      .from("posts")
      .select(POST_SELECT)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit)
      .returns<PostModel[]>(),
  );
  if (error) throw error;
  return data ?? [];
}

/** One post with everything a card needs. Throws on failure. */
export async function fetchPost(postId: string): Promise<PostModel> {
  const { data, error } = await withTimeout(
    supabase.from("posts").select(POST_SELECT).eq("id", postId).single().returns<PostModel>(),
  );
  if (error) throw error;
  return data;
}

export const CAPTION_MAX = 500;

export interface NewPost {
  userId: string;
  caption: string;
  /** A project's name, to file the post under it. Optional. */
  projectName?: string | null;
}

/**
 * The rows a new post writes, in the shapes the feed has always written them:
 * a `project` post with its `project_posts` row when it is filed under a project,
 * otherwise a `media` post (a caption, maybe a picture).
 */
export function newPostRows({ userId, caption, projectName }: NewPost) {
  const title = projectName?.trim().slice(0, 80) || null;
  const text = caption.trim().slice(0, CAPTION_MAX);
  return {
    post: { user_id: userId, post_type: title ? ("project" as const) : ("media" as const), caption: text || null },
    project: title
      ? { title, description: null, started_at: null, ended_at: null, status: "active" as const }
      : null,
  };
}

/** Uploads a post picture and returns its public URL. Throws on failure. */
export async function uploadPostImage(file: File): Promise<string> {
  const fileName = `${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from("post-images")
    .upload(fileName, file, { contentType: file.type || "image/jpeg" });
  if (error) throw error;
  return supabase.storage.from("post-images").getPublicUrl(fileName).data.publicUrl;
}

/**
 * Publishes a post and returns it as the feed shows it. The picture goes up first, so a
 * failed upload leaves nothing behind; if a later step fails, the half-made post is removed.
 */
export async function createPost(input: NewPost & { image?: File | null }): Promise<PostModel> {
  const rows = newPostRows(input);
  const imageUrl = input.image ? await uploadPostImage(input.image) : null;

  const { data: created, error: postErr } = await supabase.from("posts").insert(rows.post).select("id").single();
  if (postErr) throw postErr;
  const postId = (created as { id: string }).id;

  try {
    if (rows.project) {
      const { error } = await supabase.from("project_posts").insert({ post_id: postId, ...rows.project });
      if (error) throw error;
    }
    if (imageUrl) {
      const { error } = await supabase.from("post_images").insert({ post_id: postId, url: imageUrl, sort_order: 0 });
      if (error) throw error;
    }
  } catch (e) {
    await supabase.from("posts").delete().eq("id", postId);
    throw e;
  }

  return fetchPost(postId);
}
