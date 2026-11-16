import { createContext, useContext } from "react";
import type { Session } from "@supabase/supabase-js";

/** `undefined` while the first session read is in flight, `null` when signed out. */
export type AuthState = Session | null | undefined;

export const AuthContext = createContext<AuthState>(undefined);

/** The current session, read once at the app root and shared by every caller. */
export function useAuth(): AuthState {
  return useContext(AuthContext);
}
