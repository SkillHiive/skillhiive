import { useEffect, useRef, useState } from "react";
import { countUpValue } from "@/lib/profileActivity";

/** No count when motion is reduced, or when the page isn't on screen (frames wouldn't run). */
function skipCount(): boolean {
  if (typeof window === "undefined") return true;
  if (document.visibilityState === "hidden") return true;
  return !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Counts from 0 up to `target` once, when first shown. Later changes jump straight
 * to the new value; reduced motion, or a page opened in the background, skips the count.
 */
export function useCountUp(target: number, durationMs = 700): number {
  const [value, setValue] = useState(() => (skipCount() || target <= 0 ? target : 0));
  const done = useRef(false);

  useEffect(() => {
    let frame = 0;
    if (done.current || skipCount()) {
      frame = requestAnimationFrame(() => setValue(target));
      return () => cancelAnimationFrame(frame);
    }
    const startedAt = performance.now();
    const tick = (now: number) => {
      const next = countUpValue(target, now - startedAt, durationMs);
      setValue(next);
      if (next === target) done.current = true;
      else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return value;
}
