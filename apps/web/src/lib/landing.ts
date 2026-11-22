import { ROOM_NAME_PATTERN } from "@/lib/room";
import { parseRepoCommits } from "@/lib/github";

/** What the status page says right now: how many of its services answered their last check. */
export interface ServiceStatus {
  up: number;
  total: number;
}

// Uptime Kuma's beat states: 0 down, 1 up, 2 pending, 3 maintenance.
const UP = 1;
const MAINTENANCE = 3;

/**
 * The status page's heartbeat list (`/api/status-page/heartbeat/<slug>`) as a count of services
 * whose latest beat is up. Planned maintenance counts as up. Anything unreadable is null, so the
 * page shows no claim at all rather than a wrong one.
 */
export function serviceStatus(data: unknown): ServiceStatus | null {
  const list = (data as { heartbeatList?: unknown } | null)?.heartbeatList;
  if (!list || typeof list !== "object") return null;
  let up = 0;
  let total = 0;
  for (const beats of Object.values(list as Record<string, unknown>)) {
    if (!Array.isArray(beats) || beats.length === 0) continue;
    const latest = beats[beats.length - 1] as { status?: unknown } | null;
    if (typeof latest?.status !== "number") continue;
    total += 1;
    if (latest.status === UP || latest.status === MAINTENANCE) up += 1;
  }
  return total === 0 ? null : { up, total };
}

/** "up", or "1 of 3 down": the state in as few words as it takes. */
export function statusLabel(s: ServiceStatus): string {
  const down = s.total - s.up;
  return down === 0 ? "up" : `${down} of ${s.total} down`;
}

/** Open rooms with someone in them. A total only: never who, never which. */
export function openRoomCount(rows: { room_name: string; participant_count: number }[]): number {
  return rows.filter((r) => r.participant_count > 0 && ROOM_NAME_PATTERN.test(r.room_name)).length;
}

/** "just now", "12m ago", "3h ago", "4d ago", "2mo ago". */
export function sinceLabel(at: number, now: number): string {
  const minutes = Math.max(0, Math.floor((now - at) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 60) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export interface LandingCommit {
  repo: string;
  kind: string;
  message: string;
  at: number;
  url?: string;
}

/**
 * The commits read when the site was built (`{ repo, items }` per repository, items as GitHub's
 * commits API returns them), newest first. Merges are skipped and only GitHub links are kept.
 */
export function readCommits(raw: unknown, limit = 3): LandingCommit[] {
  if (!Array.isArray(raw)) return [];
  const all: LandingCommit[] = [];
  for (const entry of raw) {
    const { repo, items } = (entry ?? {}) as { repo?: unknown; items?: unknown };
    if (typeof repo !== "string") continue;
    for (const c of parseRepoCommits(repo, items, Date.now())) {
      all.push({
        repo: c.repo,
        kind: c.kind,
        message: c.message,
        at: c.at,
        url: c.url?.startsWith("https://github.com/") ? c.url : undefined,
      });
    }
  }
  return all.sort((a, b) => b.at - a.at).slice(0, limit);
}

/** Filled in by vite.config.ts at build time; absent in tests. */
export const BUILT_COMMITS: LandingCommit[] = readCommits(
  typeof __RECENT_COMMITS__ === "undefined" ? [] : __RECENT_COMMITS__,
);
