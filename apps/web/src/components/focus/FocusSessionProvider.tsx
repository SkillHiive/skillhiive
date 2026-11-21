import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAmbience } from "@/hooks/useAmbience";
import { FocusSessionContext, type FocusSessionValue } from "@/hooks/useFocusSession";
import { IDLE_CLOCK, elapsedSec, isRunning, pauseClock, startClock } from "@/lib/focusClock";
import { IDLE_SESSION, SESSION_KEY, restoreSession, type FocusSession } from "@/lib/focusSession";

function load(): FocusSession {
  try {
    return restoreSession(window.localStorage.getItem(SESSION_KEY));
  } catch {
    return IDLE_SESSION;
  }
}

/**
 * Owns the focus session for the whole app (mounted in Layout above the routes),
 * so leaving /focus, reloading or closing the tab keeps it. The clock is two
 * timestamps (lib/focusClock), so it keeps counting while nothing is on screen.
 */
export function FocusSessionProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const [stored, setSession] = useState<FocusSession>(load);
  // Signed out, there is no session to show or play sound for.
  const session = auth === null ? IDLE_SESSION : stored;

  useEffect(() => {
    try {
      if (stored.active) window.localStorage.setItem(SESSION_KEY, JSON.stringify(stored));
      else window.localStorage.removeItem(SESSION_KEY);
    } catch {
      /* private mode or full storage: the session lasts for this tab only */
    }
  }, [stored]);

  // Another tab started, paused or ended the session.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === SESSION_KEY) setSession(restoreSession(event.newValue));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const { kind, playing, setAmbience } = useAmbience(session.active);

  const begin = useCallback((taskId: string | null) => {
    const now = Date.now();
    setSession((s) =>
      s.active
        ? { ...s, clock: startClock(s.clock, now) }
        : { active: true, clock: startClock(IDLE_CLOCK, now), taskId, heroStart: 0 },
    );
  }, []);

  const toggle = useCallback(() => {
    const now = Date.now();
    setSession((s) => ({
      ...s,
      active: true,
      clock: isRunning(s.clock) ? pauseClock(s.clock, now) : startClock(s.clock, now),
    }));
  }, []);

  const nextTask = useCallback((taskId: string | null) => {
    const now = Date.now();
    setSession((s) => ({ ...s, taskId, heroStart: elapsedSec(s.clock, now) }));
  }, []);

  const restart = useCallback(() => {
    setSession((s) => ({ ...s, clock: IDLE_CLOCK, heroStart: 0 }));
  }, []);

  const end = useCallback(() => setSession(IDLE_SESSION), []);

  const value = useMemo<FocusSessionValue>(
    () => ({
      session,
      begin,
      toggle,
      nextTask,
      restart,
      end,
      ambience: kind,
      ambiencePlaying: playing,
      setAmbience,
    }),
    [session, begin, toggle, nextTask, restart, end, kind, playing, setAmbience],
  );

  return <FocusSessionContext.Provider value={value}>{children}</FocusSessionContext.Provider>;
}
