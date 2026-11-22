import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Play } from "lucide-react";
import { Button } from "@skillhiive/ui";
import { useTokens } from "@/theme";
import { Segmented } from "@/components/ui/Segmented";
import { computePhase } from "@/hooks/sessionPhase";
import type { ActiveRoom } from "@/hooks/useActiveRooms";
import { useOptionalRoomCall } from "@/hooks/roomCall";
import { clockLabel, MONO, ROOM_CAP, serverNow, STANDING_ROOMS, suggestRoom } from "@/lib/room";

type Mode = "alone" | "room";

/**
 * Start the day's work alone (the focus timer) or in a room with other people. In a room your
 * next task goes with you and comes back as what you shipped.
 */
export function StartCard({
  focusActive,
  nextTask,
  rooms,
  clockOffsetMs,
  onStartAlone,
}: {
  focusActive: boolean;
  nextTask: string | null;
  rooms: ActiveRoom[];
  clockOffsetMs: number;
  onStartAlone: () => void;
}) {
  const { colors, radii, spacing } = useTokens();
  const navigate = useNavigate();
  const call = useOptionalRoomCall();
  const [mode, setMode] = useState<Mode>("alone");
  const [picked, setPicked] = useState<string | null>(null);

  const [now, setNow] = useState(() => serverNow(clockOffsetMs));
  useEffect(() => {
    if (mode !== "room" || rooms.length === 0) return;
    const id = setInterval(() => setNow(serverNow(clockOffsetMs)), 1000);
    return () => clearInterval(id);
  }, [mode, rooms.length, clockOffsetMs]);

  const open = rooms.map((r) => ({ name: r.room_name, count: r.participant_count, ...computePhase(r.session_started_at, now) }));
  const choices = [
    ...open.filter((r) => r.count < ROOM_CAP),
    ...STANDING_ROOMS.filter((n) => !open.some((r) => r.name === n)).map((n) => ({
      name: n,
      count: 0,
      ...computePhase(null, now),
    })),
  ];
  const room = picked && choices.some((c) => c.name === picked) ? picked : suggestRoom(choices);
  const inCall = call?.active?.roomName ?? null;

  function optionLabel(c: (typeof choices)[number]): string {
    if (c.count === 0) return `${c.name} · quiet`;
    const when = c.phase === "waiting" ? "waiting" : `${c.phase} ${clockLabel(c.remainingSeconds)}`;
    return `${c.name} · ${when} · ${c.count}/${ROOM_CAP}`;
  }

  function startInRoom() {
    navigate(`/rooms/${encodeURIComponent(room)}`, { state: nextTask ? { task: { text: nextTask } } : null });
  }

  return (
    <section
      aria-label="Start"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: spacing.md,
        padding: spacing.md,
        borderRadius: radii.xl,
        background: colors.surface.primary,
        border: `1px solid ${colors.border.subtle}`,
      }}
    >
      {!focusActive && !inCall && (
        <div style={{ display: "flex", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" }}>
          <Segmented<Mode>
            label="Work"
            options={[
              { value: "alone", label: "Alone" },
              { value: "room", label: "In a room" },
            ]}
            value={mode}
            onChange={setMode}
          />
          {mode === "room" && (
            <select
              aria-label="Room"
              value={room}
              onChange={(e) => setPicked(e.target.value)}
              className="ui-press"
              style={{
                flex: 1,
                minWidth: 180,
                height: 38,
                padding: "0 12px",
                borderRadius: radii.pill,
                border: `1px solid ${colors.border.subtle}`,
                background: colors.surface.sunken,
                color: colors.text.primary,
                fontFamily: MONO,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {choices.map((c) => (
                <option key={c.name} value={c.name}>
                  {optionLabel(c)}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {inCall ? (
        <Button
          label={`Back to ${inCall}`}
          size="lg"
          fullWidth
          icon={<Play size={18} />}
          onClick={() => navigate(`/rooms/${encodeURIComponent(inCall)}`)}
        />
      ) : mode === "room" && !focusActive ? (
        <Button label={`Start in ${room}`} size="lg" fullWidth icon={<Play size={18} />} onClick={startInRoom} />
      ) : (
        <Button
          label={focusActive ? "Resume focus" : nextTask ? "Start focus" : "Plan first"}
          size="lg"
          fullWidth
          icon={<Play size={18} />}
          disabled={!focusActive && !nextTask}
          onClick={onStartAlone}
        />
      )}
    </section>
  );
}
