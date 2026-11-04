// Web useAppLifecycle hook
import { useEffect, useState } from "react";

export type AppState = "active" | "background" | "inactive";

export interface AppLifecycleState {
  state: AppState;
  isActive: boolean;
  isBackground: boolean;
}

export interface UseAppLifecycleReturn extends AppLifecycleState {
  addListener: (callback: (state: AppState) => void) => () => void;
}

/**
 * Web implementation of useAppLifecycle using Page Visibility API.
 */
export function useAppLifecycle(): UseAppLifecycleReturn {
  const [state, setState] = useState<AppState>("active");
  const listenersRef = useRef<Set<(state: AppState) => void>>(new Set());

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setState("background");
      } else {
        setState("active");
      }
    };

    const handleBlur = () => setState("inactive");
    const handleFocus = () => setState("active");

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const addListener = (callback: (state: AppState) => void) => {
    listenersRef.current.add(callback);
    // Immediately call with current state
    callback(state);
    return () => {
      listenersRef.current.delete(callback);
    };
  };

  return {
    state,
    isActive: state === "active",
    isBackground: state === "background",
    addListener,
  };
}