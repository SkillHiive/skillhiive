import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { loadErrorMessage, withTimeout } from "@/lib/load";
import { useCallback, useEffect, useRef, useState } from "react";
import { ROOM_NAME_PATTERN } from "@/lib/room";

export interface ActiveRoom {
  room_name: string;
  participant_count: number;
  started_at: string;
  session_started_at: string | null;
}

const POLL_INTERVAL = 8000;

async function loadRooms(): Promise<ActiveRoom[]> {
  const { data, error } = await withTimeout(
    // Only the count leaves the server for the list: who is inside is never shown (no individual presence).
    supabase
      .from("active_rooms")
      .select("room_name, participant_count, started_at, session_started_at")
      .order("started_at", { ascending: true }),
  );
  if (error) throw error;
  // Rooms opened before the token server's name rule can't be joined any more; leave them out.
  return ((data ?? []) as ActiveRoom[]).filter((r) => ROOM_NAME_PATTERN.test(r.room_name));
}

/** `enabled` false stops the polling, for screens that only need the list some of the time. */
export function useActiveRooms(enabled = true) {
  const session = useAuth();
  const [rooms, setRooms] = useState<ActiveRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const loadedOnce = useRef(false);

  const applyRooms = useCallback((list: ActiveRoom[]) => {
    setRooms(list);
    setError(null);
    setLoading(false);
    loadedOnce.current = true;
  }, []);

  const applyError = useCallback((e: unknown) => {
    // A failed background refresh keeps the list it already has.
    if (!loadedOnce.current) setError(loadErrorMessage(e, "the rooms"));
    setLoading(false);
  }, []);

  const retry = useCallback(() => {
    setRetrying(true);
    return loadRooms()
      .then(applyRooms, applyError)
      .finally(() => setRetrying(false));
  }, [applyRooms, applyError]);

  useEffect(() => {
    if (!session || !enabled) return;
    let cancelled = false;
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      loadRooms().then(
        (list) => !cancelled && applyRooms(list),
        (e) => !cancelled && applyError(e),
      );
    };

    refresh();
    const poll = setInterval(refresh, POLL_INTERVAL);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      cancelled = true;
      clearInterval(poll);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [session, enabled, applyRooms, applyError]);

  // Signed out there is nothing to load, so it isn't "loading" either.
  return {
    rooms,
    loading: session === null ? false : loading,
    error,
    retrying,
    retry,
  };
}
