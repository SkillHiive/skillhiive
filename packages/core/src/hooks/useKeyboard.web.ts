// Web useKeyboard hook
import { useEffect, useState } from "react";

export interface KeyboardState {
  isVisible: boolean;
  height: number;
}

export interface UseKeyboardReturn extends KeyboardState {
  addListener: (event: "show" | "hide", callback: (height: number) => void) => () => void;
}

/**
 * Web implementation of useKeyboard.
 * On web, virtual keyboard doesn't typically affect layout like on mobile.
 */
export function useKeyboard(): UseKeyboardReturn {
  const [isVisible, setIsVisible] = useState(false);
  const [height, setHeight] = useState(0);
  const listenersRef = useRef<{ show: Set<(height: number) => void>; hide: Set<(height: number) => void> }>({
    show: new Set(),
    hide: new Set(),
  });

  // Web doesn't have a native keyboard API, but we can simulate
  // using focus/blur events on input elements
  useEffect(() => {
    const handleFocus = () => {
      setIsVisible(true);
      setHeight(300); // Approximate keyboard height
      listenersRef.current.show.forEach((cb) => cb(300));
    };

    const handleBlur = () => {
      setIsVisible(false);
      setHeight(0);
      listenersRef.current.hide.forEach((cb) => cb(0));
    };

    document.addEventListener("focusin", handleFocus);
    document.addEventListener("focusout", handleBlur);

    return () => {
      document.removeEventListener("focusin", handleFocus);
      document.removeEventListener("focusout", handleBlur);
    };
  }, []);

  const addListener = (event: "show" | "hide", callback: (height: number) => void) => {
    listenersRef.current[event].add(callback);
    return () => {
      listenersRef.current[event].delete(callback);
    };
  };

  return { isVisible, height, addListener };
}