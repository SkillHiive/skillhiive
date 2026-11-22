import { useCallback, useMemo, useState, type ReactNode } from "react";
import { RoomCallContext, type RoomCallRequest } from "@/hooks/roomCall";
import { RoomCall } from "./RoomCall";

/**
 * Keeps the room connected while you move around the app. The room page shows it full size;
 * anywhere else it floats, and it pops out into its own window when the tab is hidden.
 */
export function RoomCallProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<RoomCallRequest | null>(null);
  const start = useCallback((request: RoomCallRequest) => setActive(request), []);
  const end = useCallback(() => setActive(null), []);
  const value = useMemo(() => ({ active, start, end }), [active, start, end]);
  return (
    <RoomCallContext.Provider value={value}>
      {children}
      {/* A new room remounts the call, which leaves the old one (and saves its time) first. */}
      {active && <RoomCall key={active.roomName} request={active} onEnded={end} />}
    </RoomCallContext.Provider>
  );
}
