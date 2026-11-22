import { useEffect, useState } from "react";
import { computePhase, type PhaseState } from "@/hooks/sessionPhase";
import { serverNow } from "@/lib/room";

/** The room's phase on the server's clock, re-read every second while the clock runs. */
export function useServerPhase(sessionStartedAt: string | null | undefined, clockOffsetMs: number): PhaseState {
  const [now, setNow] = useState(() => serverNow(clockOffsetMs));
  useEffect(() => {
    if (!sessionStartedAt) return;
    const id = setInterval(() => setNow(serverNow(clockOffsetMs)), 1000);
    return () => clearInterval(id);
  }, [sessionStartedAt, clockOffsetMs]);
  return computePhase(sessionStartedAt ?? null, now);
}
