import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { openRoomCount, serviceStatus, type ServiceStatus } from "@/lib/landing";

const ROOMS_EVERY = 30_000;
const STATUS_EVERY = 60_000;

/** Runs `load` now and then on an interval, only while the tab is visible. */
function usePolling(load: () => Promise<void>, every: number) {
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (timer) return;
      void load();
      timer = setInterval(() => void load(), every);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    const onVisibility = () => (document.visibilityState === "visible" ? start() : stop());
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [load, every]);
}

async function loadRooms(): Promise<number | null> {
  const { data, error } = await supabase.from("active_rooms").select("room_name, participant_count");
  if (error) return null;
  return openRoomCount((data ?? []) as { room_name: string; participant_count: number }[]);
}

async function loadStatus(): Promise<ServiceStatus | null> {
  try {
    // Our own origin, rewritten to status.skillhiive.com (vercel.json, vite.config.ts).
    const res = await fetch("/api/status", { headers: { Accept: "application/json" } });
    return res.ok ? serviceStatus(await res.json()) : null;
  } catch {
    return null;
  }
}

/**
 * The live facts in the landing hero: how many rooms are open (a total, never who) and whether
 * our services are up. Null until known, and null again if a read fails, so nothing is guessed.
 */
export function useLandingProof() {
  const [rooms, setRooms] = useState<number | null>(null);
  const [status, setStatus] = useState<ServiceStatus | null>(null);
  const refreshRooms = useCallback(async () => setRooms(await loadRooms()), []);
  const refreshStatus = useCallback(async () => setStatus(await loadStatus()), []);
  usePolling(refreshRooms, ROOMS_EVERY);
  usePolling(refreshStatus, STATUS_EVERY);
  return { rooms, status };
}
