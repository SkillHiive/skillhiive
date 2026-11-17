export interface CommitLogEntry {
  hash: string;
  repo: string;
  /** The conventional-commit type ("feat", "fix", …), or "commit" when there is none. */
  kind: string;
  scope?: string;
  message: string;
  /** Short age: "today", "3d", "2w", "4mo". */
  date: string;
  at: number;
  url?: string;
}

const CONVENTIONAL = /^([a-z]+)(?:\(([^)]+)\))?!?:\s*(.+)$/i;

/** "today", "1d", "2w", "3mo" for a past time. */
export function shortAge(at: number, now: number): string {
  const days = Math.floor((now - at) / 86_400_000);
  if (days < 1) return "today";
  if (days < 14) return `${days}d`;
  if (days < 60) return `${Math.floor(days / 7)}w`;
  return `${Math.floor(days / 30)}mo`;
}

/** One repository's commits from GitHub's REST API into log entries. Unknown shapes are skipped. */
export function parseRepoCommits(repo: string, data: unknown, now: number): CommitLogEntry[] {
  if (!Array.isArray(data)) return [];
  const entries: CommitLogEntry[] = [];
  for (const item of data) {
    const sha = typeof item?.sha === "string" ? item.sha : null;
    const message = typeof item?.commit?.message === "string" ? item.commit.message : null;
    const dateText = item?.commit?.author?.date ?? item?.commit?.committer?.date;
    const at = typeof dateText === "string" ? Date.parse(dateText) : NaN;
    if (!sha || !message || Number.isNaN(at)) continue;

    const firstLine = message.split("\n")[0]!.trim();
    if (!firstLine || firstLine.startsWith("Merge ")) continue;
    const match = CONVENTIONAL.exec(firstLine);
    entries.push({
      hash: sha.slice(0, 7),
      repo,
      kind: match ? match[1]!.toLowerCase() : "commit",
      scope: match?.[2],
      message: match ? match[3]! : firstLine,
      date: shortAge(at, now),
      at,
      url: typeof item?.html_url === "string" ? item.html_url : undefined,
    });
  }
  return entries;
}

/**
 * The newest commits across an organisation's most recently pushed public repositories,
 * or an empty list when GitHub can't be reached (so the page shows nothing rather than
 * made-up history).
 */
export async function fetchRecentCommits(
  org: string,
  repos: { name: string; pushed_at?: string | null }[],
  limit = 5,
): Promise<CommitLogEntry[]> {
  const recent = [...repos]
    .filter((r) => r.pushed_at)
    .sort((a, b) => Date.parse(b.pushed_at!) - Date.parse(a.pushed_at!))
    .slice(0, 3);
  const now = Date.now();
  const lists = await Promise.all(
    recent.map(async (repo) => {
      try {
        const res = await fetch(
          `https://api.github.com/repos/${org}/${encodeURIComponent(repo.name)}/commits?per_page=4`,
        );
        if (!res.ok) return [];
        return parseRepoCommits(repo.name, await res.json(), now);
      } catch {
        return [];
      }
    }),
  );
  return lists
    .flat()
    .sort((a, b) => b.at - a.at)
    .slice(0, limit);
}
