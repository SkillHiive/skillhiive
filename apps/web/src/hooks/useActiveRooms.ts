import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { loadErrorMessage, withTimeout } from "@/lib/load";
import { useCallback, useEffect, useRef, useState } from "react";

export interface RoomParticipant {
  user_id: string;
  username: string;
  displayname: string;
  avatar: string | null;
}

export interface ActiveRoom {
  room_name: string;
  participant_count: number;
  started_at: string;
  session_started_at: string | null;
  participants: RoomParticipant[];
}

const POLL_INTERVAL = 8000;

async function loadRooms(): Promise<ActiveRoom[]> {
  const { data, error } = await withTimeout(
    supabase.from("active_rooms").select("*").order("started_at", { ascending: true }),
  );
  if (error) throw error;
  return (data ?? []) as ActiveRoom[];
}

export function useActiveRooms() {
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
    if (!session) return;
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
  }, [session, applyRooms, applyError]);

  // Signed out there is nothing to load, so it isn't "loading" either.
  return {
    rooms,
    loading: session === null ? false : loading,
    error,
    retrying,
    retry,
  };
}
