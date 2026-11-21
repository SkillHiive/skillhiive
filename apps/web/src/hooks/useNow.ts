import { useEffect, useState } from "react";

/**
 * The current time, refreshed every `intervalMs` while `ticking`. Ticks only
 * trigger a re-render: timers read time from timestamps, so a throttled
 * background tab cannot make them under-count. Returning to the tab refreshes
 * at once.
 */
export function useNow(ticking: boolean, intervalMs = 500): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!ticking) return;
    const tick = () => setNow(Date.now());
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    const first = window.setTimeout(tick, 0);
    const iv = window.setInterval(tick, intervalMs);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(iv);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [ticking, intervalMs]);
  return now;
}
