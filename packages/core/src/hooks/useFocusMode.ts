// Focus mode hook - MUST be implemented by platform
import { useState, useEffect } from "react";

export interface FocusModeState {
  isEnabled: boolean;
  isSupported: boolean;
}

export interface UseFocusModeReturn extends FocusModeState {
  enable: () => Promise<void>;
  disable: () => Promise<void>;
  toggle: () => Promise<void>;
}

/**
 * Platform focus mode hook (Do Not Disturb, Focus modes, etc).
 * MUST be implemented by platform-specific file (.web.ts or .native.ts)
 * This base implementation throws to enforce platform implementation.
 */
export function useFocusMode(): UseFocusModeReturn {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isSupported] = useState(false);
  
  const enable = async () => {
    throw new Error(
      `useFocusMode.enable() not implemented. ` +
      `Create useFocusMode.web.ts or useFocusMode.native.ts in your app.`
    );
  };
  
  const disable = async () => {
    throw new Error(
      `useFocusMode.disable() not implemented. ` +
      `Create useFocusMode.web.ts or useFocusMode.native.ts in your app.`
    );
  };
  
  const toggle = async () => {
    throw new Error(
      `useFocusMode.toggle() not implemented. ` +
      `Create useFocusMode.web.ts or useFocusMode.native.ts in your app.`
    );
  };
  
  return { isEnabled, isSupported, enable, disable, toggle };
}