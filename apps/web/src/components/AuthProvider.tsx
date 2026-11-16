import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { AuthContext } from "@/hooks/authContext";
import type { AuthState } from "@/hooks/authContext";

/**
 * Reads the session once and keeps one auth listener for the whole app, so route
 * changes do not blank the page while each gate re-reads the session.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthState>(undefined);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setSession(data.session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={session}>{children}</AuthContext.Provider>;
}
