import { createContext, useContext } from "react";

export type Profile = {
  id: string;
  username: string | null;
  avatar: string | null;
  banner: string | null;
  bio: string | null;
  displayname: string;
  created_at: string;
  email: string;
};

export type ProfileSaveResult = { ok: true } | { ok: false; error: string };

export type ProfileContextValue = {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  updateField: (
    key: keyof Omit<Profile, "id" | "created_at" | "email">,
    value: string,
  ) => Promise<ProfileSaveResult>;
  reload: () => Promise<void>;
};

export const ProfileContext = createContext<ProfileContextValue | null>(null);

/** Usernames are stored trimmed and lower-case, wherever they are written. */
export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

/** A failed profile write in words a person can act on. Never the raw database text. */
export function profileErrorMessage(error: { message?: string; code?: string } | null | undefined): string {
  const message = error?.message ?? "";
  const code = error?.code ?? "";
  if (code === "23505") {
    return /username/i.test(message) ? "That username is taken. Try another." : "That's already in use. Try another.";
  }
  if (code === "22001") return "That's too long. Shorten it and try again.";
  if (code === "23514" || code === "22P02") return "That isn't allowed here. Try something else.";
  if (code === "42501" || /jwt|not authenticated/i.test(message)) return "Your session ended. Sign in again, then retry.";
  if (/failed to fetch|network/i.test(message)) return "Couldn't reach SkillHiive. Check your connection and try again.";
  return "Couldn't save. Try again.";
}

export const useProfile = (): ProfileContextValue => {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used inside ProfileProvider");
  return ctx;
};
