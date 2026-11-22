import { useEffect, useState } from "react";
import { fetchFollowing, type FollowedPerson } from "@/lib/following";

/** The people behind these ids with their latest work; null while loading, [] when it fails. */
export function useFollowing(ids: string[] | null): FollowedPerson[] | null {
  const key = ids ? ids.join(",") : null;
  const [state, setState] = useState<{ for: string; people: FollowedPerson[] } | null>(null);
  useEffect(() => {
    if (key === null) return;
    let cancelled = false;
    fetchFollowing(key ? key.split(",") : []).then(
      (people) => !cancelled && setState({ for: key, people }),
      () => !cancelled && setState({ for: key, people: [] }),
    );
    return () => {
      cancelled = true;
    };
  }, [key]);
  return state && state.for === key ? state.people : null;
}
