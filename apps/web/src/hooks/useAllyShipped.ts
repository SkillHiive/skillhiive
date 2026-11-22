import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { fetchAllyIds } from "@/lib/allies";
import { POST_SELECT } from "@/lib/posts";
import { withTimeout } from "@/lib/load";
import type { PostModel } from "@/components/feed/PostCards";

/**
 * The latest few posts from people you follow, newest first: what they shipped, not whether they
 * are around. Null while loading; empty when you follow nobody or nothing came back.
 */
export function useAllyShipped(myId: string | null | undefined, limit = 3): PostModel[] | null {
  const [state, setState] = useState<{ for: string; posts: PostModel[] } | null>(null);

  useEffect(() => {
    if (!myId) return;
    let cancelled = false;
    void (async () => {
      try {
        const allies = await fetchAllyIds(myId);
        if (allies.length === 0) {
          if (!cancelled) setState({ for: myId, posts: [] });
          return;
        }
        const { data, error } = await withTimeout(
          supabase
            .from("posts")
            .select(POST_SELECT)
            .in("user_id", allies)
            .order("created_at", { ascending: false })
            .limit(limit),
        );
        if (!cancelled) setState({ for: myId, posts: error ? [] : ((data ?? []) as unknown as PostModel[]) });
      } catch {
        if (!cancelled) setState({ for: myId, posts: [] });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [myId, limit]);

  return state && state.for === myId ? state.posts : null;
}
