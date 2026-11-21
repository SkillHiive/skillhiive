import { supabase } from "./supabase";
import { withTimeout } from "./load";
import { CUBICLE_ROOM_PATTERN } from "./room";
import { fetchRecentShipped } from "./todayData";

/**
 * The ally strip at the top of the feed: who your allies are, whether they are in a room
 * right now, and the last thing of theirs you can see. Chronological, never ranked.
 */

/** A room heartbeat is sent every 30s; two minutes without one means they have gone. */
export const LIVE_WINDOW_MS = 2 * 60_000;

/** How many allies the strip loads at most. */
export const STRIP_LIMIT = 24;

export interface PresenceRow {
  user_id: string;
  room_name: string;
  last_seen: string | null;
  joined_at: string | null;
}

export interface Presence {
  room: string;
  seenAt: string;
}

export interface LatestItem {
  kind: "post" | "shipped";
  title: string;
  at: string;
  /** Set for posts, so the card can open it. */
  postId?: string;
}

export interface AllyProfile {
  id: string;
  username: string | null;
  displayname: string | null;
  avatar: string | null;
}

export interface AllyCardModel {
  id: string;
  username: string | null;
  name: string;
  avatar: string | null;
  /** The room they are in now, or null. */
  live: Presence | null;
  /** The latest time you can see them doing anything: a post, a shipped note, a room. */
  lastActiveAt: string | null;
  latest: LatestItem | null;
}

function time(iso: string | null | undefined): number {
  if (!iso) return Number.NaN;
  return new Date(iso).getTime();
}

function later(a: string | null, b: string | null): string | null {
  const ta = time(a);
  const tb = time(b);
  if (Number.isNaN(ta)) return Number.isNaN(tb) ? null : b;
  if (Number.isNaN(tb)) return a;
  return tb > ta ? b : a;
}

/** When a presence row last showed them there: the heartbeat, or the join before the first one. */
function seenAt(row: PresenceRow): string | null {
  return row.last_seen ?? row.joined_at;
}

/**
 * Who is in a room now, by user id: rows seen within the live window. Private cubicles are
 * left out (they are two-person calls nobody else can join). The most recent row wins.
 */
export function livePresence(rows: PresenceRow[], now: number = Date.now()): Map<string, Presence> {
  const live = new Map<string, Presence>();
  for (const row of rows) {
    if (!row.room_name || CUBICLE_ROOM_PATTERN.test(row.room_name)) continue;
    const seen = seenAt(row);
    const t = time(seen);
    if (!seen || Number.isNaN(t) || now - t > LIVE_WINDOW_MS) continue;
    const prev = live.get(row.user_id);
    if (!prev || t > time(prev.seenAt)) live.set(row.user_id, { room: row.room_name, seenAt: seen });
  }
  return live;
}

/** The last time each person was seen in any room, live or not. */
export function lastRoomSeen(rows: PresenceRow[]): Map<string, string> {
  const seen = new Map<string, string>();
  for (const row of rows) {
    const at = seenAt(row);
    if (!at) continue;
    const prev = seen.get(row.user_id) ?? null;
    const next = later(prev, at);
    if (next) seen.set(row.user_id, next);
  }
  return seen;
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

interface PostSummaryRow {
  id: string;
  created_at: string;
  caption: string | null;
  project_posts: { title: string | null } | { title: string | null }[] | null;
}

/** What to call a post in one line: its project's title, else the first line of its caption. */
export function postTitle(post: PostSummaryRow): string {
  const project = Array.isArray(post.project_posts) ? post.project_posts[0] : post.project_posts;
  return firstLine(project?.title) || firstLine(post.caption);
}

/** The newer of two items, ignoring missing ones. */
export function newerItem(a: LatestItem | null, b: LatestItem | null): LatestItem | null {
  if (!a) return b;
  if (!b) return a;
  return time(b.at) > time(a.at) ? b : a;
}

/** The time a card is ordered by: now-ish when they are in a room, else their last activity. */
export function activityTime(card: Pick<AllyCardModel, "live" | "lastActiveAt">): number {
  const t = time(later(card.lastActiveAt, card.live?.seenAt ?? null));
  return Number.isNaN(t) ? Number.NEGATIVE_INFINITY : t;
}

/** Most recent activity first; people with none sit at the end, by name. Not a ranking. */
export function orderAllies<T extends Pick<AllyCardModel, "live" | "lastActiveAt" | "name">>(cards: T[]): T[] {
  return [...cards].sort((a, b) => {
    const diff = activityTime(b) - activityTime(a);
    if (diff !== 0 && !Number.isNaN(diff)) return diff;
    return a.name.localeCompare(b.name);
  });
}

/** Puts one card together from what was loaded. */
export function buildAllyCard(
  profile: AllyProfile,
  latestPost: LatestItem | null,
  latestShipped: LatestItem | null,
  presenceRows: PresenceRow[],
  now: number = Date.now(),
): AllyCardModel {
  const mine = presenceRows.filter((r) => r.user_id === profile.id);
  const live = livePresence(mine, now).get(profile.id) ?? null;
  const latest = newerItem(latestPost, latestShipped);
  const roomSeen = lastRoomSeen(mine).get(profile.id) ?? null;
  return {
    id: profile.id,
    username: profile.username,
    name: profile.displayname?.trim() || profile.username || "Ally",
    avatar: profile.avatar,
    live,
    lastActiveAt: later(latest?.at ?? null, roomSeen),
    latest,
  };
}

/** Swaps in fresh presence without touching anything else, so a refresh never flashes. */
export function withPresence(cards: AllyCardModel[], rows: PresenceRow[], now: number = Date.now()): AllyCardModel[] {
  const live = livePresence(rows, now);
  const roomSeen = lastRoomSeen(rows);
  return cards.map((card) => ({
    ...card,
    live: live.get(card.id) ?? null,
    // Never moves backwards: leaving a room deletes its row, but they were still just here.
    lastActiveAt: later(card.lastActiveAt, live.get(card.id)?.seenAt ?? roomSeen.get(card.id) ?? null),
  }));
}

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

/** Room rows for these people. Throws on failure. */
export async function fetchPresence(ids: string[]): Promise<PresenceRow[]> {
  if (ids.length === 0) return [];
  const { data, error } = await withTimeout(
    supabase.from("room_participants").select("user_id, room_name, last_seen, joined_at").in("user_id", ids),
  );
  if (error) throw error;
  return (data ?? []) as PresenceRow[];
}

async function fetchLatestPost(userId: string): Promise<LatestItem | null> {
  const { data, error } = await supabase
    .from("posts")
    .select("id, created_at, caption, project_posts:project_posts!project_posts_post_id_fkey ( title )")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as unknown as PostSummaryRow;
  return { kind: "post", title: postTitle(row), at: row.created_at, postId: row.id };
}

async function fetchLatestShipped(userId: string): Promise<LatestItem | null> {
  // The same public list a profile page shows; it answers [] when it can't be read.
  const [note] = await fetchRecentShipped(userId, 1);
  if (!note) return null;
  const title = firstLine(note.body);
  return title ? { kind: "shipped", title, at: note.created_at } : null;
}

/**
 * Everything the strip shows for these allies, in order. Throws only when the people
 * themselves can't be loaded; a missing post, note or room just leaves that part out.
 */
export async function fetchAllyStrip(allyIds: string[], now: number = Date.now()): Promise<AllyCardModel[]> {
  const ids = allyIds.slice(0, STRIP_LIMIT);
  if (ids.length === 0) return [];

  const [profilesRes, presence] = await Promise.all([
    withTimeout(supabase.from("profiles").select("id, username, displayname, avatar").in("id", ids)),
    fetchPresence(ids).catch(() => [] as PresenceRow[]),
  ]);
  if (profilesRes.error) throw profilesRes.error;
  const profiles = (profilesRes.data ?? []) as AllyProfile[];

  const cards = await withTimeout(
    Promise.all(
      profiles.map(async (profile) => {
        const [post, shipped] = await Promise.all([
          fetchLatestPost(profile.id).catch(() => null),
          fetchLatestShipped(profile.id).catch(() => null),
        ]);
        return buildAllyCard(profile, post, shipped, presence, now);
      }),
    ),
  );
  return orderAllies(cards);
}
