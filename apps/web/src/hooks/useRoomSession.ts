import { computePhase, type PhaseState } from "@/hooks/sessionPhase";
import { serverNow } from "@/lib/room";
import { supabase } from "@/lib/supabase";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * `clockOffsetMs` is how far this computer's clock is behind the server's; the focus and break
 * phases are computed on the server's time so everyone in the room sees the same one.
 */
export function useRoomSession(roomName: string, clockOffsetMs = 0) {
  const [sessionStartedAt, setSessionStartedAt] = useState<string | null>(null);
  const [phaseState, setPhaseState] = useState<PhaseState>(computePhase(null));

  const startedAtRef = useRef<string | null>(null);
  const offsetRef = useRef(clockOffsetMs);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTicking = useCallback(() => {
    if (tickRef.current) return;
    tickRef.current = setInterval(() => {
      setPhaseState(computePhase(startedAtRef.current, serverNow(offsetRef.current)));
    }, 1000);
  }, []);

  useEffect(() => {
    if (!roomName) return;
    let cancelled = false;

    async function poll() {
      const { data } = await supabase
        .from("active_rooms")
        .select("session_started_at")
        .eq("room_name", roomName)
        .maybeSingle();
      if (cancelled) return;
      const ts: string | null = data?.session_started_at ?? null;
      if (ts && !startedAtRef.current) {
        startedAtRef.current = ts;
        setSessionStartedAt(ts);
        setPhaseState(computePhase(ts, serverNow(offsetRef.current)));
        startTicking();
      }
    }

    poll();
    const sessionPoll = setInterval(() => {
      if (!startedAtRef.current) poll();
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(sessionPoll);
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [roomName, startTicking]);

  // A new offset (the token answer arrives after the first tick) takes effect on the next tick,
  // and the phase is recomputed now so the clock does not wait a second to correct itself.
  useEffect(() => {
    offsetRef.current = clockOffsetMs;
    if (startedAtRef.current) setPhaseState(computePhase(startedAtRef.current, serverNow(clockOffsetMs)));
  }, [clockOffsetMs]);

  return { phaseState, sessionStartedAt };
}
