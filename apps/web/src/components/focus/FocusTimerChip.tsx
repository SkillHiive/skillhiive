import { Link } from "react-router";
import { Pause } from "lucide-react";
import { useTokens } from "@/theme";
import { useFocusSession } from "@/hooks/useFocusSession";
import { useNow } from "@/hooks/useNow";
import { elapsedSec, isRunning } from "@/lib/focusClock";
import { clockLabel, phaseAt } from "@/lib/focusSession";

/**
 * The running session, small, in the nav: a phase dot and the time left.
 * It links back to /focus. Rendered only while a session is on and you are elsewhere.
 */
export function FocusTimerChip() {
  const { colors } = useTokens();
  const { session } = useFocusSession();
  const running = isRunning(session.clock);
  const now = useNow(running, 1000);
  const { phase, remaining } = phaseAt(elapsedSec(session.clock, now));
  const dot = phase === "focus" ? colors.surface.skillhive : colors.tint.success;
  const time = clockLabel(remaining);

  return (
    <Link
      to="/focus"
      aria-label={`${running ? (phase === "focus" ? "Focus" : "Break") : "Paused"}, ${time} left. Open focus`}
      title={running ? (phase === "focus" ? "Focus" : "Break") : "Paused"}
      className="nav-block ui-press flex h-[45px] shrink-0 items-center gap-1.5 px-2.5 text-sm font-bold tabular-nums text-black max-[359px]:gap-1 max-[359px]:px-1.5 max-[359px]:text-xs dark:text-white"
    >
      {running ? (
        <span
          aria-hidden="true"
          className="size-2.5 rounded-full"
          style={{ background: dot, boxShadow: `0 0 0 2px ${dot}44`, transition: "background-color 320ms var(--ease-ui)" }}
        />
      ) : (
        <Pause size={12} aria-hidden="true" />
      )}
      {/* The smallest phones get whole minutes, so the nav still fits on one line. */}
      <span className="max-[359px]:hidden">{time}</span>
      <span aria-hidden="true" className="hidden max-[359px]:inline">
        {Math.ceil(remaining / 60)}m
      </span>
    </Link>
  );
}
