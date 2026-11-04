// Keyboard hook - MUST be implemented by platform
import { useEffect, useState } from "react";

export interface KeyboardState {
  isVisible: boolean;
  height: number;
  willShow: boolean;
  willHide: boolean;
}

export interface UseKeyboardReturn {
  isVisible: boolean;
  height: number;
  addListener: (event: "show" | "hide", callback: (height: number) => void) => () => void;
}

/**
 * Platform keyboard hook.
 * MUST be implemented by platform-specific file (.web.ts or .native.ts)
 * This base implementation throws to enforce platform implementation.
 */
export function useKeyboard(): UseKeyboardReturn {
  const [isVisible, setIsVisible] = useState(false);
  const [height, setHeight] = useState(0);
  
  const addListener = (event: "show" | "hide", callback: (height: number) => void) => {
    throw new Error(
      `useKeyboard.addListener("${event}") not implemented. ` +
      `Create useKeyboard.web.ts or useKeyboard.native.ts in your app.`
    );
  };
  
  return { isVisible, height, addListener };
}