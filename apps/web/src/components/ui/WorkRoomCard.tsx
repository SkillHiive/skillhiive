import React, { memo } from "react";
import { ChevronRight, Mic } from "lucide-react";
import { useTokens } from "@/theme";
import { PhaseRing } from "@/components/rooms/PhaseRing";
import { useServerPhase } from "@/hooks/useServerPhase";
import { clockLabel, MONO, ROOM_CAP } from "@/lib/room";

export interface WorkRoomCardProps {
  name: string;
  /** How many people are inside. Only the count is shown, never who. */
  count: number;
  cap?: number;
  /** When the room's focus/break clock started (server time), or null if it hasn't. */
  sessionStartedAt?: string | null;
  /** How far this computer's clock is behind the server's, in ms. */
  clockOffsetMs?: number;
  onJoin?: () => void;
  style?: React.CSSProperties;
}

/** One open room: its clock, how full it is, and the whole card to join. */
export const WorkRoomCard = memo(function WorkRoomCard({
  name,
  count,
  cap = ROOM_CAP,
  sessionStartedAt = null,
  clockOffsetMs = 0,
  onJoin,
  style,
}: WorkRoomCardProps) {
  const { colors, radii, spacing } = useTokens();
  const phase = useServerPhase(sessionStartedAt, clockOffsetMs);
  const full = count >= cap;
  // A standing room with nobody in it: always there to start, quiet until someone does.
  const quiet = count === 0;
  const onBreak = phase.phase === "break";

  return (
    <button
      type="button"
      onClick={onJoin}
      disabled={full}
      aria-label={full ? `${name}, full` : `Join ${name}`}
      className="ui-lift ui-press"
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: spacing.md,
        padding: `${spacing.md}px ${spacing.base}px`,
        borderRadius: radii.lg,
        border: `1px ${quiet ? "dashed" : "solid"} ${
          phase.phase === "focus" ? `${colors.surface.skillhive}55` : onBreak ? `${colors.tint.success}55` : colors.border.subtle
        }`,
        background: quiet ? "transparent" : colors.surface.primary,
        color: colors.text.primary,
        textAlign: "left",
        cursor: full ? "default" : "pointer",
        opacity: full ? 0.6 : 1,
        fontFamily: "inherit",
        boxSizing: "border-box",
        ...style,
      }}
    >
      <PhaseRing phase={quiet ? "waiting" : phase.phase} progress={phase.progress} size={44} stroke={4} />

      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        <span
          style={{
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: -0.3,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {name}
        </span>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontFamily: MONO,
            fontSize: 12,
            color: colors.text.tertiary,
          }}
        >
          <span style={{ color: phase.phase === "focus" ? colors.text.skillhive : colors.text.secondary }}>
            {quiet ? "quiet" : phase.phase}
          </span>
          {!quiet && phase.phase !== "waiting" && (
            <span style={{ fontVariantNumeric: "tabular-nums", color: colors.text.secondary }}>
              {clockLabel(phase.remainingSeconds)}
            </span>
          )}
          {/* The break is when people talk: the moment to drop in. */}
          {!quiet && onBreak && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: colors.tint.success }}>
              <Mic size={12} aria-hidden="true" />
              mic open
            </span>
          )}
        </span>
      </span>

      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          fontFamily: MONO,
          fontSize: 12,
          fontVariantNumeric: "tabular-nums",
          color: full ? colors.text.primary : colors.text.tertiary,
          flexShrink: 0,
        }}
      >
        {full ? "full" : quiet ? "" : `${count}/${cap}`}
        {!full && <ChevronRight size={16} aria-hidden="true" />}
      </span>
    </button>
  );
});
