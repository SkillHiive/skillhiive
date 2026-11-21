import { createContext, useContext } from "react";
import type { AmbienceKind } from "./useAmbience";
import type { FocusSession } from "@/lib/focusSession";

export interface FocusSessionValue {
  session: FocusSession;
  /** Opens a session on a task (or the first queued one) and starts the clock. */
  begin: (taskId: string | null) => void;
  /** Pauses a running clock or starts a paused one. */
  toggle: () => void;
  /** Moves to another task; its time starts at the session's current seconds. */
  nextTask: (taskId: string | null) => void;
  /** Back to 00:00 on the same task. */
  restart: () => void;
  /** Ends the session; nothing more is timed. */
  end: () => void;
  ambience: AmbienceKind;
  /** The chosen sound is audible right now. */
  ambiencePlaying: boolean;
  setAmbience: (kind: AmbienceKind) => void;
}

export const FocusSessionContext = createContext<FocusSessionValue | null>(null);

/** The running focus session, kept across pages and reloads (FocusSessionProvider). */
export function useFocusSession(): FocusSessionValue {
  const value = useContext(FocusSessionContext);
  if (!value) throw new Error("useFocusSession needs a <FocusSessionProvider> above it");
  return value;
}
