import { useCallback, useSyncExternalStore } from "react";

/** Whether a CSS media query matches, kept in step with the window. False where there is no window. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window === "undefined" || !window.matchMedia) return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener?.("change", onChange);
      return () => mql.removeEventListener?.("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => (typeof window !== "undefined" && !!window.matchMedia ? window.matchMedia(query).matches : false),
    () => false,
  );
}
