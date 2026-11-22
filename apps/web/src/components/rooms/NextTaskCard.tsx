import { useNavigate } from "react-router";
import { Play } from "lucide-react";
import { Button } from "@skillhiive/ui";
import { useTokens } from "@/theme";
import { formatDuration } from "@/lib/timeTracker";
import { MONO } from "@/lib/room";

/**
 * Your next task from Today, with one button into the suggested room. The task goes with you and
 * comes back as what you shipped when you leave.
 */
export function NextTaskCard({ task, room }: { task: { text: string; estimateMin: number }; room: string }) {
  const { colors, radii, spacing } = useTokens();
  const navigate = useNavigate();
  return (
    <section
      aria-label="Your next task"
      className="ui-rise"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: spacing.sm,
        padding: spacing.md,
        borderRadius: radii.lg,
        background: colors.surface.primary,
        border: `1px solid ${colors.border.subtle}`,
      }}
    >
      <span style={{ fontFamily: MONO, fontSize: 11, color: colors.text.tertiary }}>your next task</span>
      <span style={{ display: "flex", alignItems: "baseline", gap: 8, minWidth: 0 }}>
        <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 600, color: colors.text.primary, overflowWrap: "anywhere" }}>
          {task.text}
        </span>
        <span style={{ fontFamily: MONO, fontSize: 11, color: colors.text.tertiary, flexShrink: 0 }}>
          {formatDuration(task.estimateMin * 60)}
        </span>
      </span>
      <Button
        label={`Start in ${room}`}
        size="sm"
        fullWidth
        icon={<Play size={14} />}
        onClick={() => navigate(`/rooms/${encodeURIComponent(room)}`, { state: { task: { text: task.text } } })}
      />
    </section>
  );
}
