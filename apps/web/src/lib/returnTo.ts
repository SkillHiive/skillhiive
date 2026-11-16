/**
 * Where to go after signing in, from `?next=/path`. Only a path inside this site is accepted:
 * it must start with a single "/" so `//evil.test` and `https://evil.test` are ignored.
 */
export function safeNext(search: string): string | null {
  const next = new URLSearchParams(search).get("next");
  if (next === null || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null;
  if (next === "/login" || next.startsWith("/login?")) return null;
  return next;
}

/** The sign-in address that brings the visitor back to `here` (path plus query) afterwards. */
export function loginUrlFor(here: string): string {
  return "/login?next=" + encodeURIComponent(here);
}
