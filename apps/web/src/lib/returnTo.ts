/**
 * Where to go after signing in, from `?next=/path`. Only a path inside this site is accepted:
 * it must start with a single "/" so `//evil.test` and `https://evil.test` are ignored.
 */
export function safeNext(search: string): string | null {
  const next = new URLSearchParams(search).get("next");
  if (next === null || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null;
  if (isAuthPage(next)) return null;
  return next;
}

function isAuthPage(path: string): boolean {
  return ["/login", "/register"].some((page) => path === page || path.startsWith(page + "?"));
}

/** The sign-in address that brings the visitor back to `here` (path plus query) afterwards. */
export function loginUrlFor(here: string): string {
  return "/login?next=" + encodeURIComponent(here);
}

/** The sign-up address that brings the new account back to `here` afterwards. */
export function registerUrlFor(here: string): string {
  return "/register?next=" + encodeURIComponent(here);
}

/** `path`, carrying `next` along when there is one (for links between the sign-in and sign-up pages). */
export function withNext(path: string, next: string | null): string {
  return next === null ? path : path + "?next=" + encodeURIComponent(next);
}
