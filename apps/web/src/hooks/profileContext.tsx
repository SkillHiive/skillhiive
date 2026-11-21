import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { normalizeUsername, ProfileContext, profileErrorMessage, type Profile, type ProfileSaveResult } from "./useProfile";

export const ProfileProvider = ({ children }: { children: ReactNode }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  // The first sign-in after sign-up makes the row, from what Register put in the auth metadata.
  const create = useCallback(async (user: User) => {
    const email = user.email ?? "";
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const username = typeof meta["username"] === "string" ? normalizeUsername(meta["username"]) : "";
    const displayname =
      typeof meta["displayname"] === "string" && meta["displayname"].trim()
        ? meta["displayname"].trim()
        : email.split("@")[0];

    const insert = (row: Record<string, unknown>) =>
      supabase
        .from("profiles")
        .insert({ id: user.id, displayname, ...row })
        .select(
          "id, username, avatar, banner, bio, displayname, created_at, followers, following",
        )
        .single();

    let { data, error } = await insert(username ? { username } : {});
    // Someone took the username in the meantime: make the profile anyway, so it can be picked again in Settings.
    if (error?.code === "23505" && username) ({ data, error } = await insert({}));

    if (!isMounted.current) return;

    if (error || !data) {
      setError(profileErrorMessage(error));
      return;
    }

    setProfile({ ...data, email });
  }, []);

  const load = useCallback(async () => {
    if (!isMounted.current) return;
    setLoading(true);
    setError(null);

    const [
      {
        data: { session },
        error: sessionErr,
      },
      {
        data: { user },
        error: userErr,
      },
    ] = await Promise.all([
      supabase.auth.getSession(),
      supabase.auth.getUser(),
    ]);

    if (!isMounted.current) return;

    if (sessionErr || !session || userErr || !user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const { data, error: fetchErr } = await supabase
      .from("profiles")
      .select(
        "id, username, avatar, banner, bio, displayname, created_at",
      )
      .eq("id", user.id)
      .single();

    if (!isMounted.current) return;

    if (fetchErr) {
      if (fetchErr.code === "PGRST116") {
        await create(user);
      } else {
        setError("Couldn't load your profile. Reload to try again.");
      }
    } else {
      setProfile({ ...data, email: user.email ?? "" });
    }

    setLoading(false);
  }, [create]);

  useEffect(() => {
    isMounted.current = true;
    load();

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") load();
      if (event === "SIGNED_OUT") {
        setProfile(null);
        setError(null);
      }
    });

    return () => {
      isMounted.current = false;
      listener.subscription.unsubscribe();
    };
  }, [load]);

  const updateField = async (
    key: keyof Omit<Profile, "id" | "created_at" | "email">,
    value: string,
  ): Promise<ProfileSaveResult> => {
    if (!profile) return { ok: false, error: "Your session ended. Sign in again, then retry." };

    const stored = key === "username" ? normalizeUsername(value) : value;
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ [key]: stored })
        .eq("id", profile.id)
        .select()
        .single();

      if (error) return { ok: false, error: profileErrorMessage(error) };
    } catch (e) {
      return { ok: false, error: profileErrorMessage(e instanceof Error ? { message: e.message } : null) };
    }

    if (isMounted.current)
      setProfile((prev) => (prev ? { ...prev, [key]: stored } : prev));

    return { ok: true };
  };

  return (
    <ProfileContext.Provider
      value={{ profile, loading, error, updateField, reload: load }}
    >
      {children}
    </ProfileContext.Provider>
  );
};
