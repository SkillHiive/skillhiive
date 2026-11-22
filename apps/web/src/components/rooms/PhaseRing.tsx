import { useTokens } from "@/theme";
import type { SessionPhase } from "@/hooks/sessionPhase";

/**
 * The 50/10 clock as a ring that fills through the phase. Focus is the accent; the break is
 * quiet, so the two stay apart in a one-accent palette.
 */
export function PhaseRing({
  phase,
  progress,
  size = 48,
  stroke = 4,
}: {
  phase: SessionPhase;
  progress: number;
  size?: number;
  stroke?: number;
}) {
  const { colors } = useTokens();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = phase === "waiting" ? 0 : Math.max(0, Math.min(1, progress));
  const color = phase === "focus" ? colors.surface.skillhive : colors.text.secondary;
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      aria-hidden="true"
      style={{ transform: "rotate(-90deg)", flexShrink: 0, display: "block" }}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={colors.border.strong}
        strokeWidth={stroke}
        strokeDasharray={phase === "waiting" ? `${stroke} ${stroke * 1.6}` : undefined}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - clamped)}
        opacity={clamped > 0 ? 1 : 0}
        style={{ transition: "stroke-dashoffset 1s linear, stroke 320ms var(--ease-ui)" }}
      />
    </svg>
  );
}
