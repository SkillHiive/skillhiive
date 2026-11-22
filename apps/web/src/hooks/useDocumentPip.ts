import { useCallback, useEffect, useRef, useState } from "react";
import { getPipWindow, isDocumentPipSupported, openPipWindow, setAutoEnterPipHandler } from "@/lib/documentPip";

export interface UseDocumentPipOptions {
  /** Open the window when the user switches tabs during a call, like Meet. */
  autoEnter: boolean;
  width?: number;
  height?: number;
}

export interface UseDocumentPip {
  supported: boolean;
  pipWindow: Window | null;
  open: () => Promise<Window | null>;
  close: () => void;
  /** True when the browser opened it on a tab switch; it closes again when the tab is back. */
  openedAutomatically: boolean;
}

/** A Document Picture-in-Picture window for a live room. Closes on unmount. */
export function useDocumentPip({ autoEnter, width, height }: UseDocumentPipOptions): UseDocumentPip {
  const [supported] = useState(isDocumentPipSupported);
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const [openedAutomatically, setOpenedAutomatically] = useState(false);

  const sizeRef = useRef({ width, height });
  useEffect(() => {
    sizeRef.current = { width, height };
  });

  const openWith = useCallback(async (auto: boolean) => {
    const before = getPipWindow();
    const win = await openPipWindow(sizeRef.current);
    if (win) {
      setPipWindow(win);
      // A window that was already open keeps how it was opened.
      if (win !== before) setOpenedAutomatically(auto);
    }
    return win;
  }, []);

  const open = useCallback(() => openWith(false), [openWith]);
  const close = useCallback(() => {
    pipWindow?.close();
  }, [pipWindow]);

  // Each window lives as long as this hook: cleared when it closes, closed on unmount.
  useEffect(() => {
    if (!pipWindow) return;
    const onPageHide = () => {
      setPipWindow((cur) => (cur === pipWindow ? null : cur));
      setOpenedAutomatically(false);
    };
    pipWindow.addEventListener("pagehide", onPageHide);
    return () => {
      pipWindow.removeEventListener("pagehide", onPageHide);
      if (!pipWindow.closed) pipWindow.close();
    };
  }, [pipWindow]);

  // Chrome calls this when the user leaves a tab that is using the camera or mic.
  useEffect(() => {
    if (!autoEnter || !supported) return;
    if (!setAutoEnterPipHandler(() => void openWith(true))) return;
    return () => {
      setAutoEnterPipHandler(null);
    };
  }, [autoEnter, supported, openWith]);

  // Back on the tab: an automatic window goes away again.
  useEffect(() => {
    if (!pipWindow || !openedAutomatically) return;
    const onVisibility = () => {
      if (document.visibilityState === "visible") pipWindow.close();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [pipWindow, openedAutomatically]);

  return { supported, pipWindow, open, close, openedAutomatically };
}
