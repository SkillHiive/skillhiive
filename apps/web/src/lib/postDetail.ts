import { supabase } from "./supabase";
import { withTimeout } from "./load";
import { timeAgo } from "./timeAgo";
import { CAPTION_MAX } from "./posts";

/**
 * One post and its conversation, as the post page and the post sheet show them
 * (plans/UI_FEEL_AUDIT.md, "Post"). Fetching, shaping and writing live here; the
 * components only render.
 */

export interface PostAuthor {
  id: string;
  username: string | null;
  displayname: string | null;
  avatar: string | null;
}

export interface PostOffer {
  company: string | null;
  role: string | null;
  salary_range: string | null;
  location: string | null;
  offer_type: string | null;
}

export interface PostDetail {
  id: string;
  user_id: string;
  post_type: "project" | "media" | "offer";
  caption: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  author: PostAuthor | null;
  /** The project it's filed under, if any. Older project posts may carry a description. */
  project: { title: string; description: string | null } | null;
  /** Older offer posts. New posts never have one. */
  offer: PostOffer | null;
  /** Image URLs in display order. */
  images: string[];
}

export interface PostComment {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  author: PostAuthor | null;
  /** Sent but not yet confirmed by the server. */
  pending?: boolean;
  /** The id it had while pending, kept so the row isn't re-created when the real id arrives. */
  clientKey?: string;
}

const AUTHOR_COLUMNS = "id, username, displayname, avatar";

const POST_DETAIL_SELECT = `
  id,
  user_id,
  post_type,
  caption,
  likes_count,
  comments_count,
  created_at,
  profiles:profiles!posts_user_id_profiles_fkey ( ${AUTHOR_COLUMNS} ),
  project_posts:project_posts!project_posts_post_id_fkey ( title, description ),
  offer_posts:offer_posts!offer_posts_post_id_fkey ( company, role, salary_range, location, offer_type ),
  post_images:post_images!post_images_post_id_fkey ( url, sort_order )
`;

const COMMENT_SELECT = `id, body, created_at, user_id, profiles:profiles ( ${AUTHOR_COLUMNS} )`;

type OneOrMany<T> = T | T[] | null | undefined;

/** PostgREST returns a to-one relation as an object or a one-item array, depending on the query. */
function one<T>(value: OneOrMany<T>): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function toAuthor(raw: OneOrMany<Partial<PostAuthor>>, fallbackId: string): PostAuthor | null {
  const a = one(raw);
  if (!a) return null;
  return {
    id: a.id ?? fallbackId,
    username: a.username ?? null,
    displayname: a.displayname ?? null,
    avatar: a.avatar ?? null,
  };
}

export interface RawPost {
  id: string;
  user_id: string;
  post_type: PostDetail["post_type"];
  caption: string | null;
  likes_count: number | null;
  comments_count: number | null;
  created_at: string;
  profiles?: OneOrMany<Partial<PostAuthor>>;
  project_posts?: OneOrMany<{ title: string; description: string | null }>;
  offer_posts?: OneOrMany<PostOffer>;
  post_images?: { url: string; sort_order: number }[] | null;
}

export interface RawComment {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  profiles?: OneOrMany<Partial<PostAuthor>>;
}

export function normalizePost(raw: RawPost): PostDetail {
  const project = one(raw.project_posts);
  return {
    id: raw.id,
    user_id: raw.user_id,
    post_type: raw.post_type,
    caption: raw.caption,
    likes_count: raw.likes_count ?? 0,
    comments_count: raw.comments_count ?? 0,
    created_at: raw.created_at,
    author: toAuthor(raw.profiles, raw.user_id),
    project: project?.title ? { title: project.title, description: project.description ?? null } : null,
    offer: one(raw.offer_posts),
    images: [...(raw.post_images ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((i) => i.url)
      .filter(Boolean),
  };
}

export function normalizeComment(raw: RawComment): PostComment {
  return {
    id: raw.id,
    body: raw.body,
    created_at: raw.created_at,
    user_id: raw.user_id,
    author: toAuthor(raw.profiles, raw.user_id),
  };
}

/** The post, or null when it doesn't exist (or isn't visible to you). Throws on failure. */
export async function fetchPostDetail(postId: string): Promise<PostDetail | null> {
  const { data, error } = await withTimeout(
    supabase.from("posts").select(POST_DETAIL_SELECT).eq("id", postId).maybeSingle(),
  );
  if (error) {
    // A malformed id can't match any post.
    if ((error as { code?: string }).code === "22P02") return null;
    throw error;
  }
  return data ? normalizePost(data as unknown as RawPost) : null;
}

/** The conversation under a post, oldest first. Throws on failure. */
export async function fetchComments(postId: string): Promise<PostComment[]> {
  const { data, error } = await withTimeout(
    supabase.from("comments").select(COMMENT_SELECT).eq("post_id", postId).order("created_at", { ascending: true }),
  );
  if (error) throw error;
  return ((data ?? []) as unknown as RawComment[]).map(normalizeComment);
}

export const COMMENT_MAX = 2000;

/** Adds a comment and returns it as the server stored it. Throws on failure. */
export async function addComment(postId: string, userId: string, body: string): Promise<PostComment> {
  const { data, error } = await withTimeout(
    supabase
      .from("comments")
      .insert({ post_id: postId, user_id: userId, body: body.slice(0, COMMENT_MAX), parent_id: null })
      .select(COMMENT_SELECT)
      .single(),
  );
  if (error) throw error;
  return normalizeComment(data as unknown as RawComment);
}

/** Throws on failure. */
export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await withTimeout(supabase.from("comments").delete().eq("id", commentId));
  if (error) throw error;
}

/** Throws on failure. */
export async function deletePost(postId: string): Promise<void> {
  const { error } = await withTimeout(supabase.from("posts").delete().eq("id", postId));
  if (error) throw error;
}

/** Saves a new caption and returns what was stored. Throws on failure. */
export async function updateCaption(postId: string, caption: string): Promise<string | null> {
  const value = caption.trim().slice(0, CAPTION_MAX) || null;
  const { error } = await withTimeout(supabase.from("posts").update({ caption: value }).eq("id", postId));
  if (error) throw error;
  return value;
}

/** The name to show for someone: their display name, else their username. */
export function authorName(author: PostAuthor | null | undefined): string {
  return author?.displayname?.trim() || author?.username || "Unknown";
}

/** Their public page by username, else by id. */
export function authorHref(author: PostAuthor | null | undefined, fallbackId?: string): string | null {
  if (author?.username) return `/p/${encodeURIComponent(author.username)}`;
  const id = author?.id ?? fallbackId;
  return id ? `/profile/${id}` : null;
}

/** "just now", "5m", "3h" within a day; then "Jul 17", with the year once it isn't this year. */
export function shortDate(iso: string, now = Date.now(), locale?: string): string {
  const then = new Date(iso);
  if (now - then.getTime() < 86_400_000) return timeAgo(iso, now);
  const sameYear = then.getFullYear() === new Date(now).getFullYear();
  return then.toLocaleDateString(locale, sameYear ? { month: "short", day: "numeric" } : { month: "short", day: "numeric", year: "numeric" });
}

const OFFER_LABELS: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  internship: "Internship",
  contract: "Contract",
};

/** An old offer post as one plain line: "Engineer · Acme · Full-time · Berlin · €80k". */
export function offerLine(offer: PostOffer | null): string | null {
  if (!offer) return null;
  const type = offer.offer_type ? (OFFER_LABELS[offer.offer_type] ?? offer.offer_type) : null;
  const parts = [offer.role, offer.company, type, offer.location, offer.salary_range]
    .map((p) => p?.trim())
    .filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

/**
 * Changes made in the post sheet, so the feed underneath can match them without a refetch.
 * `patch` holds the post-card fields that changed.
 */
export type PostChange =
  | { id: string; deleted: true }
  | { id: string; deleted?: false; patch: { caption?: string | null; comments_count?: number } };

const POST_CHANGE_EVENT = "skillhiive:post-change";

export function announcePostChange(change: PostChange): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<PostChange>(POST_CHANGE_EVENT, { detail: change }));
}

/** Calls `listener` for every change; returns the unsubscribe. */
export function onPostChange(listener: (change: PostChange) => void): () => void {
  const handler = (e: Event) => listener((e as CustomEvent<PostChange>).detail);
  window.addEventListener(POST_CHANGE_EVENT, handler);
  return () => window.removeEventListener(POST_CHANGE_EVENT, handler);
}
