export type NavTab = "today" | "rooms" | "feed" | "you";

function normalise(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}

/**
 * Which primary tab a path belongs to, or null when none does (someone else's
 * profile, legal pages, notifications). Your own public profile counts as "you".
 */
export function activeTab(pathname: string, myUsername?: string | null): NavTab | null {
  const path = normalise(pathname);
  if (path === "/home" || path === "/review") return "today";
  if (path === "/rooms" || path.startsWith("/rooms/")) return "rooms";
  if (path === "/feed" || path.startsWith("/post/")) return "feed";
  if (path === "/profile" || path === "/projects" || path === "/settings" || path.startsWith("/settings/")) {
    return "you";
  }
  if (myUsername) {
    let decoded = path;
    try {
      decoded = decodeURIComponent(path);
    } catch {
      // A malformed escape in the URL: compare it as it is.
    }
    if (decoded.toLowerCase() === `/p/${myUsername.toLowerCase()}`) return "you";
  }
  return null;
}

/**
 * A live room and focus draw their own full-screen controls, and the landing page has its own
 * header, so the app nav steps aside.
 */
export function hidesNav(pathname: string): boolean {
  const path = normalise(pathname);
  return path === "/" || path === "/focus" || /^\/rooms\/[^/]+/.test(path);
}

/** The nav's focus timer chip shows while a session runs, except on the focus page itself. */
export function showsFocusChip(pathname: string, sessionActive: boolean): boolean {
  return sessionActive && normalise(pathname) !== "/focus";
}
