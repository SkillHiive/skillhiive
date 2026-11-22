import { useEffect, useState } from "react";
import { useTokens } from "@/theme";
import { computePhase } from "@/hooks/sessionPhase";
import type { ActiveRoom } from "@/hooks/useActiveRooms";
import { floorSummary, MONO, serverNow } from "@/lib/room";

/**
 * The Floor right now, in one line: open rooms, how many are in focus or on break, and when the
 * next break starts. Totals only, never who.
 */
export function FloorStrip({ rooms, clockOffsetMs }: { rooms: ActiveRoom[]; clockOffsetMs: number }) {
  const { colors } = useTokens();
  const [now, setNow] = useState(() => serverNow(clockOffsetMs));
  useEffect(() => {
    if (rooms.length === 0) return;
    const id = setInterval(() => setNow(serverNow(clockOffsetMs)), 1000);
    return () => clearInterval(id);
  }, [rooms.length, clockOffsetMs]);

  if (rooms.length === 0) return null;
  const s = floorSummary(rooms.map((r) => computePhase(r.session_started_at, now)));
  const parts: { text: string; tone: string }[] = [{ text: `${s.open} open`, tone: colors.text.secondary }];
  if (s.focus) parts.push({ text: `${s.focus} in focus`, tone: colors.text.skillhive });
  if (s.onBreak) parts.push({ text: `${s.onBreak} on break`, tone: colors.tint.success });
  if (s.nextBreakSeconds !== null) {
    const m = Math.max(1, Math.ceil(s.nextBreakSeconds / 60));
    parts.push({ text: `next break ${m}m`, tone: colors.text.tertiary });
  }

  return (
    <p
      aria-live="off"
      style={{
        margin: 0,
        display: "flex",
        flexWrap: "wrap",
        gap: "4px 10px",
        fontFamily: MONO,
        fontSize: 12,
        fontVariantNumeric: "tabular-nums",
        color: colors.text.tertiary,
      }}
    >
      {parts.map((p, i) => (
        <span key={p.text} style={{ color: p.tone }}>
          {i > 0 && <span style={{ color: colors.text.tertiary, marginRight: 10 }}>·</span>}
          {p.text}
        </span>
      ))}
    </p>
  );
}
