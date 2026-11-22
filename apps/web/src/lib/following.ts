import { supabase } from "./supabase";
import { withTimeout } from "./load";
import { fetchRecentShipped } from "./todayData";

/**
 * People you follow, for the Feed's rail: who they are and the last thing of theirs you can see
 * (a post or a shipped note). Never whether they are online or in a room. Chronological, not ranked.
 */

/** How many people the rail loads at most. */
export const FOLLOWING_LIMIT = 12;

export interface LatestWork {
  title: string;
  at: string;
  /** Set for posts, so the line can open it. */
  postId?: string;
}

export interface FollowedPerson {
  id: string;
  username: string | null;
  name: string;
  avatar: string | null;
  latest: LatestWork | null;
}

/** The first non-empty line of some text, trimmed. */
export function firstLine(text: string | null | undefined): string {
  if (!text) return "";
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed) return trimmed;
  }
  return "";
}

function time(iso: string | null | undefined): number {
  const t = iso ? new Date(iso).getTime() : Number.NaN;
  return Number.isNaN(t) ? Number.NEGATIVE_INFINITY : t;
}

/** The newer of two items, ignoring missing ones. */
export function newerWork(a: LatestWork | null, b: LatestWork | null): LatestWork | null {
  if (!a) return b;
  if (!b) return a;
  return time(b.at) > time(a.at) ? b : a;
}

/** Most recent work first; people with nothing to show sit at the end, by name. */
export function orderFollowing<T extends Pick<FollowedPerson, "latest" | "name">>(people: T[]): T[] {
  return [...people].sort((a, b) => {
    const diff = time(b.latest?.at) - time(a.latest?.at);
    if (diff !== 0 && !Number.isNaN(diff)) return diff;
    return a.name.localeCompare(b.name);
  });
}

interface PostRow {
  id: string;
  created_at: string;
  caption: string | null;
  project_posts: { title: string | null } | { title: string | null }[] | null;
}

async function latestPost(userId: string): Promise<LatestWork | null> {
  const { data, error } = await supabase
    .from("posts")
    .select("id, created_at, caption, project_posts:project_posts!project_posts_post_id_fkey ( title )")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as unknown as PostRow;
  const project = Array.isArray(row.project_posts) ? row.project_posts[0] : row.project_posts;
  const title = firstLine(project?.title) || firstLine(row.caption);
  return title ? { title, at: row.created_at, postId: row.id } : null;
}

async function latestShipped(userId: string): Promise<LatestWork | null> {
  // The same public list a profile page shows; it answers [] when it can't be read.
  const [note] = await fetchRecentShipped(userId, 1);
  const title = firstLine(note?.body);
  return note && title ? { title, at: note.created_at } : null;
}

/** The people behind these ids with their latest work. Throws only when the people can't be loaded. */
export async function fetchFollowing(ids: string[]): Promise<FollowedPerson[]> {
  const some = ids.slice(0, FOLLOWING_LIMIT);
  if (some.length === 0) return [];
  const res = await withTimeout(supabase.from("profiles").select("id, username, displayname, avatar").in("id", some));
  if (res.error) throw res.error;
  const rows = (res.data ?? []) as { id: string; username: string | null; displayname: string | null; avatar: string | null }[];
  const people = await withTimeout(
    Promise.all(
      rows.map(async (p) => {
        const [post, note] = await Promise.all([latestPost(p.id).catch(() => null), latestShipped(p.id).catch(() => null)]);
        return {
          id: p.id,
          username: p.username,
          name: p.displayname?.trim() || p.username || "Someone",
          avatar: p.avatar,
          latest: newerWork(post, note),
        };
      }),
    ),
  );
  return orderFollowing(people);
}
