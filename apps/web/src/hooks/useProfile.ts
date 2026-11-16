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
export type ProfileContextValue = {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  updateField: (
    key: keyof Omit<Profile, "id" | "created_at" | "email">,
    value: string,
  ) => Promise<boolean>;
  reload: () => Promise<void>;
};

export const ProfileContext = createContext<ProfileContextValue | null>(null);


export const useProfile = (): ProfileContextValue => {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used inside ProfileProvider");
  return ctx;
};
