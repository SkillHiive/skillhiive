import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { loadErrorMessage, withTimeout } from "@/lib/load";
import { useAuth } from "./useAuth";

export type AllyRequest = {
  id: string;
  requester_id: string;
  created_at: string;
  status: string;
  requester: {
    id: string;
    displayname: string | null;
    username: string | null;
    avatar: string | null;
  };
};

const ALLY_QUERY = `
  id,
  requester_id,
  created_at,
  status,
  requester:profiles!allies_requester_id_fkey (
    id,
    displayname,
    username,
    avatar
  )
`;

const REFRESH_MS = 30_000;

/**
 * Notifications = ally requests waiting for you, plus the people who recently became
 * your allies. Reads the user from the session, so it works both in the top-bar bell
 * and on the notifications page.
 *
 * `loading` is true only until the first answer arrives: the 30-second background
 * refresh never flashes a spinner, and a failed refresh keeps what is on screen.
 */
export function useNotifications() {
  const session = useAuth();
  const userId = session?.user?.id ?? null;

  const [requests, setRequests] = useState<AllyRequest[]>([]);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error: queryError } = await withTimeout(
        supabase
          .from("allies")
          .select(ALLY_QUERY)
          .eq("receiver_id", userId)
          .order("created_at", { ascending: false }),
      );
      if (queryError) throw queryError;
      setRequests((data ?? []) as unknown as AllyRequest[]);
      setLoadedUserId(userId);
      setError(null);
    } catch (e) {
      setError(loadErrorMessage(e, "your notifications"));
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    void fetchRequests();
    const poll = setInterval(() => {
      if (document.visibilityState === "visible") void fetchRequests();
    }, REFRESH_MS);

    function onVisible() {
      if (document.visibilityState === "visible") void fetchRequests();
    }
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [userId, fetchRequests]);

  const accept = useCallback(async (req: AllyRequest) => {
    setActing(req.id);
    setActionError(null);
    const { error: updateError } = await supabase
      .from("allies")
      .update({ status: "accepted" })
      .eq("id", req.id);
    if (updateError) {
      setActionError("Couldn't accept that request. Try again.");
    } else {
      setRequests((prev) => prev.map((r) => (r.id === req.id ? { ...r, status: "accepted" } : r)));
    }
    setActing(null);
  }, []);

  const decline = useCallback(async (req: AllyRequest) => {
    setActing(req.id);
    setActionError(null);
    const { error: deleteError } = await supabase.from("allies").delete().eq("id", req.id);
    if (deleteError) {
      setActionError("Couldn't decline that request. Try again.");
    } else {
      setRequests((prev) => prev.filter((r) => r.id !== req.id));
    }
    setActing(null);
  }, []);

  const visibleRequests = useMemo(
    () => (userId && loadedUserId === userId ? requests : []),
    [userId, loadedUserId, requests],
  );

  const pending = useMemo(
    () => visibleRequests.filter((r) => r.status === "pending"),
    [visibleRequests],
  );

  const accepted = useMemo(
    () => visibleRequests.filter((r) => r.status === "accepted"),
    [visibleRequests],
  );

  const loadedOnce = !!userId && loadedUserId === userId;

  return {
    requests: visibleRequests,
    pending,
    accepted,
    pendingCount: pending.length,
    loading: !!userId && !loadedOnce && !error,
    // Only an error with nothing to show: a failed refresh keeps the old list.
    error: loadedOnce ? null : error,
    actionError,
    acting,
    accept,
    decline,
    refresh: fetchRequests,
    isAuthed: !!userId,
  };
}
