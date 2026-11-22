import { useEffect, useRef } from "react";

/** Calls `onEscape` when Escape is pressed while `active`, for sheets and menus. */
export function useEscape(active: boolean, onEscape: () => void): void {
  const ref = useRef(onEscape);
  useEffect(() => {
    ref.current = onEscape;
  });
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") ref.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active]);
}
