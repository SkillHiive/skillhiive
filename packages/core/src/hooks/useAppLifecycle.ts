// App lifecycle hook - MUST be implemented by platform
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
 * Platform app lifecycle hook.
 * MUST be implemented by platform-specific file (.web.ts or .native.ts)
 * This base implementation throws to enforce platform implementation.
 */
export function useAppLifecycle(): UseAppLifecycleReturn {
  const [state, setState] = useState<AppState>("active");
  
  const addListener = (callback: (state: AppState) => void) => {
    throw new Error(
      `useAppLifecycle.addListener() not implemented. ` +
      `Create useAppLifecycle.web.ts or useAppLifecycle.native.ts in your app.`
    );
  };
  
  return {
    state,
    isActive: state === "active",
    isBackground: state === "background",
    addListener,
  };
}