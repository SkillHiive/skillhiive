// Web useFocusMode hook
import { useEffect, useState } from "react";

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
 * Web implementation of useFocusMode.
 * On web, we can use the Screen Wake Lock API to prevent screen sleep.
 */
export function useFocusMode(): UseFocusModeReturn {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isSupported] = useState(() => {
    if (typeof navigator !== "undefined" && "wakeLock" in navigator) {
      return true;
    }
    return false;
  });
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const enable = async () => {
    if (!isSupported) return;
    try {
      if (typeof navigator !== "undefined" && "wakeLock" in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
        wakeLockRef.current.addEventListener("release", () => {
          setIsEnabled(false);
        });
        setIsEnabled(true);
      }
    } catch {
      // Wake lock not supported or denied
    }
  };

  const disable = async () => {
    if (wakeLockRef.current) {
      await wakeLockRef.current.release();
      wakeLockRef.current = null;
      setIsEnabled(false);
    }
  };

  const toggle = async () => {
    if (isEnabled) {
      await disable();
    } else {
      await enable();
    }
  };

  // Release wake lock on unmount
  useEffect(() => {
    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
      }
    };
  }, []);

  return { isEnabled, isSupported, enable, disable, toggle };
}