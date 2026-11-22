import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// Shared across rooms in this tab, so tiles don't flash initials every time someone joins.
const cache = new Map<string, string | null>();

/** Profile pictures for the people in a room, by username. Missing ones fall back to initials. */
export function useAvatars(usernames: string[]): Map<string, string | null> {
  const key = [...new Set(usernames)].sort().join(",");
  const [, setVersion] = useState(0);

  useEffect(() => {
    const missing = key ? key.split(",").filter((u) => u && !cache.has(u)) : [];
    if (missing.length === 0) return;
    let cancelled = false;
    void supabase
      .from("profiles")
      .select("username, avatar")
      .in("username", missing)
      .then(({ data }) => {
        for (const u of missing) cache.set(u, null);
        for (const row of (data ?? []) as { username: string | null; avatar: string | null }[]) {
          if (row.username) cache.set(row.username, row.avatar?.trim() || null);
        }
        if (!cancelled) setVersion((v) => v + 1);
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return cache;
}
