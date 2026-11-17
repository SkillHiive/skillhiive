import { errorMessage } from "./errors";

/** How long a page waits for the server before saying so. */
export const LOAD_TIMEOUT_MS = 10_000;

export class TimeoutError extends Error {
  constructor(ms: number) {
    super(`Timed out after ${ms}ms`);
    this.name = "TimeoutError";
  }
}

/**
 * Resolves like `work`, or rejects with a TimeoutError once `ms` have passed. Supabase
 * queries are thenables, so they can be passed straight in.
 */
export function withTimeout<T>(work: PromiseLike<T>, ms = LOAD_TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(ms)), ms);
  });
  return Promise.race([Promise.resolve(work), timeout]).finally(() => clearTimeout(timer));
}

/** What to tell someone when loading `what` ("your rooms", "posts") failed. */
export function loadErrorMessage(error: unknown, what: string): string {
  if (error instanceof TimeoutError) {
    return `Couldn't load ${what}: the server is taking too long to answer. It may be busy; try again in a moment.`;
  }
  const raw = errorMessage(error)?.toLowerCase() ?? "";
  if (raw.includes("failed to fetch") || raw.includes("network") || raw.includes("load failed")) {
    return `Couldn't load ${what}: can't reach SkillHiive. Check your connection.`;
  }
  return `Couldn't load ${what}. Try again in a moment.`;
}
