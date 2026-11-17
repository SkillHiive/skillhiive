import { errorMessage } from "./errors";

/**
 * Supabase auth errors in words a person can act on. Unknown messages pass through,
 * since they are usually already readable ("Password should be at least 6 characters").
 */
export function authErrorMessage(error: unknown, fallback = "Something went wrong. Try again."): string {
  const raw = errorMessage(error);
  if (!raw) return fallback;
  const text = raw.toLowerCase();
  if (text.includes("invalid login credentials")) {
    return "That email and password don't match an account.";
  }
  if (text.includes("email not confirmed")) {
    return "Confirm your email first: the link is in your inbox.";
  }
  if (text.includes("rate limit") || text.includes("too many requests") || text.includes("security purposes")) {
    return "Too many tries in a short time. Wait a minute, then try again.";
  }
  if (text.includes("failed to fetch") || text.includes("network")) {
    return "Can't reach SkillHiive right now. Check your connection and try again.";
  }
  if (text.includes("user already registered")) {
    return "There's already an account with that email. Log in instead.";
  }
  return raw;
}
