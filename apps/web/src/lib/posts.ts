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
