/**
 * Shared cases for the Cue sync contract. The contracts tests run them through
 * the Zod schemas; the web tests run the same cases through the edge function's
 * own validator and require the two to agree.
 */

const KEY = "p_0123456789abcdef";

/** A well-formed POST /v1/days body for the given dates. */
export function validDaysBody(today: string, yesterday: string): Record<string, unknown> {
  return {
    schema: 1,
    cueVersion: "0.2.0",
    timezone: "Asia/Kolkata",
    projects: [{ key: KEY, name: "herebyinvite", remote: "github.com/me/herebyinvite" }],
    days: [
      {
        date: yesterday,
        projectKey: KEY,
        seconds: 5400,
        agentSeconds: 1800,
        sources: { shell: 900, fs: 2700, agent: 1800, git: 0 },
        languages: [{ name: "TypeScript", seconds: 4000 }],
        commits: 3,
      },
      {
        date: today,
        projectKey: "private",
        seconds: 3600,
        agentSeconds: 0,
        sources: { shell: 3600, fs: 0, agent: 0, git: 0 },
        languages: [],
        commits: 0,
      },
    ],
  };
}

type Mutation = { name: string; apply: (body: any) => void };

/** Each entry breaks exactly one rule of an otherwise valid body. */
export const INVALID_DAYS_MUTATIONS: Mutation[] = [
  { name: "wrong schema version", apply: (b) => { b.schema = 2; } },
  { name: "missing timezone", apply: (b) => { delete b.timezone; } },
  { name: "project key in the wrong shape", apply: (b) => { b.projects[0].key = "herebyinvite"; b.days[0].projectKey = "herebyinvite"; } },
  { name: "empty project name", apply: (b) => { b.projects[0].name = "  "; } },
  { name: "remote with a scheme", apply: (b) => { b.projects[0].remote = "https://github.com/me/herebyinvite"; } },
  { name: "remote with credentials", apply: (b) => { b.projects[0].remote = "token@github.com/me/herebyinvite"; } },
  { name: "duplicate project key", apply: (b) => { b.projects.push({ ...b.projects[0] }); } },
  { name: "day for a project that is not listed", apply: (b) => { b.days[0].projectKey = "p_ffffffffffffffff"; } },
  { name: "malformed date", apply: (b) => { b.days[0].date = "15-11-2026"; } },
  { name: "more seconds than a day", apply: (b) => { b.days[0].seconds = 86_401; } },
  { name: "fractional seconds", apply: (b) => { b.days[0].seconds = 10.5; b.days[0].agentSeconds = 0; } },
  { name: "negative seconds", apply: (b) => { b.days[0].seconds = -1; b.days[0].agentSeconds = 0; } },
  { name: "agent time above total time", apply: (b) => { b.days[0].agentSeconds = b.days[0].seconds + 1; } },
  { name: "private row with languages", apply: (b) => { b.days[1].languages = [{ name: "SQL", seconds: 10 }]; } },
  { name: "private row with commits", apply: (b) => { b.days[1].commits = 2; } },
  { name: "same date and project twice", apply: (b) => { b.days.push({ ...b.days[0] }); } },
  { name: "one date adding up to more than a day", apply: (b) => { b.days[1].date = b.days[0].date; b.days[1].seconds = 86_000; } },
  { name: "source that is not a number", apply: (b) => { b.days[0].sources.fs = "2700"; } },
  { name: "language without a name", apply: (b) => { b.days[0].languages = [{ name: "", seconds: 5 }]; } },
  { name: "negative commits", apply: (b) => { b.days[0].commits = -1; } },
  { name: "days is not a list", apply: (b) => { b.days = {}; } },
];

export function invalidDaysBodies(today: string, yesterday: string): { name: string; body: Record<string, unknown> }[] {
  return INVALID_DAYS_MUTATIONS.map((mutation) => {
    const body = structuredClone(validDaysBody(today, yesterday));
    mutation.apply(body);
    return { name: mutation.name, body };
  });
}
