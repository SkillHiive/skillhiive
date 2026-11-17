import { supabase } from "./supabase";

/** The username for a profile id, or null when it has none yet or can't be read. */
export async function usernameForId(id: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  const username = (data as { username: string | null }).username;
  return username && username.trim() ? username : null;
}
