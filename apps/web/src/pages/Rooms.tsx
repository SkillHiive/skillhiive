import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";

import { WorkRoomCard } from "@/components/ui/WorkRoomCard";
import { Text, Button } from "@skillhiive/ui";
import { useTokens } from "@/theme";
import { lastClockOffset, MONO, ROOM_CAP, roomNameInput, roomSlug, serverNow, STANDING_ROOMS, suggestRoom } from "@/lib/room";
import { computePhase } from "@/hooks/sessionPhase";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useToday } from "@/hooks/useToday";
import { useOptionalRoomCall } from "@/hooks/roomCall";
import { heroTask } from "@/lib/focusSession";
import { NextTaskCard } from "@/components/rooms/NextTaskCard";
import { FloorStrip } from "@/components/rooms/FloorStrip";
import { useActiveRooms } from "@/hooks/useActiveRooms";
import { ErrorState } from "@/components/ui/ErrorState";
import { SkeletonRows } from "@/components/ui/States";

export default function Rooms() {
  const navigate = useNavigate();
  const { colors, radii, spacing } = useTokens();
  const { rooms, loading, error, retrying, retry } = useActiveRooms();
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  // Measured by the token server the last time a room was joined in this tab; 0 until then.
  const [clockOffsetMs] = useState(lastClockOffset);

  // The field shows the name the room will really have, so nothing is rewritten after you press Open.
  const slug = roomSlug(name);
  // Typing the name of a room that is already open joins it: the button says so before you press it.
  const existing = useMemo(() => rooms.find((r) => r.room_name === slug) ?? null, [rooms, slug]);
  const existingFull = existing !== null && existing.participant_count >= ROOM_CAP;

  const wide = useMediaQuery("(min-width: 960px)");
  const today = useToday();
  const call = useOptionalRoomCall();
  const next = heroTask(today.tasks, null);
  // Suggested when the card is drawn; the cards themselves keep their clocks moving.
  const now = serverNow(clockOffsetMs);
  const suggested = suggestRoom([
    ...rooms
      .filter((r) => r.participant_count < ROOM_CAP)
      .map((r) => ({ name: r.room_name, ...computePhase(r.session_started_at, now) })),
    ...STANDING_ROOMS.map((n) => ({ name: n, phase: "waiting" as const, remainingSeconds: 0 })),
  ]);
  const showNext = next && !call?.active;

  // Open rooms first, then the standing rooms nobody is in yet: there is always somewhere to start.
  const quietRooms = STANDING_ROOMS.filter((n) => !rooms.some((r) => r.room_name === n));

  function open(roomName: string) {
    navigate(`/rooms/${encodeURIComponent(roomName)}`);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!slug || existingFull) return;
    open(slug);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: colors.bg.muted,
        paddingTop: 88,
        paddingBottom: 120,
      }}
    >
      <div
        style={{
          maxWidth: wide ? 1120 : 640,
          margin: "0 auto",
          padding: `${spacing.sm}px ${wide ? spacing.xl : spacing.base}px`,
          display: "flex",
          flexDirection: "column",
          gap: spacing.lg,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: wide && showNext ? "minmax(0, 1fr) 340px" : "minmax(0, 1fr)",
            gap: wide ? 40 : spacing.lg,
            alignItems: "end",
          }}
        >
        <div style={{ display: "flex", flexDirection: "column", gap: spacing.lg, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: spacing.sm }}>
          <Text as="h1" variant="display">
            Rooms
          </Text>

        </div>

        <FloorStrip rooms={rooms} clockOffsetMs={clockOffsetMs} />

        <form
          onSubmit={submit}
          style={{
            display: "flex",
            alignItems: "center",
            gap: spacing.sm,
            background: colors.surface.primary,
            border: `1px dashed ${colors.border.strong}`,
            borderRadius: radii.lg,
            padding: `${spacing.xs}px ${spacing.xs}px ${spacing.xs}px ${spacing.base}px`,
          }}
        >
          <Plus size={16} color={colors.text.tertiary} aria-hidden="true" />
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(roomNameInput(e.target.value))}
            placeholder="new-room"
            aria-label="Room name"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            style={{
              flex: 1,
              minWidth: 0,
              border: "none",
              outline: "none",
              background: "transparent",
              color: colors.text.primary,
              fontSize: 15,
              fontWeight: 600,
              fontFamily: MONO,
              padding: "8px 0",
            }}
          />
          <Button
            type="submit"
            label={existingFull ? "Full" : existing ? "Join" : "Open"}
            size="sm"
            disabled={!slug || existingFull}
          />
        </form>
        </div>
        {showNext && next && <NextTaskCard task={next} room={suggested} />}
        </div>

        {loading ? (
          <SkeletonRows rows={3} height={70} />
        ) : error ? (
          <ErrorState message={error} onRetry={() => void retry()} retrying={retrying} />
        ) : (
          <ul
            aria-label="Open rooms"
            style={{
              display: "grid",
              // Three across on a laptop, one on a phone.
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: spacing.sm,
              margin: 0,
              padding: 0,
              listStyle: "none",
            }}
          >
            <AnimatePresence initial={false}>
              {rooms.map((room) => (
                <motion.li
                  key={room.room_name}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 300, damping: 26 }}
                >
                  <WorkRoomCard
                    name={room.room_name}
                    count={room.participant_count}
                    sessionStartedAt={room.session_started_at}
                    clockOffsetMs={clockOffsetMs}
                    onJoin={() => open(room.room_name)}
                  />
                </motion.li>
              ))}
              {quietRooms.map((n) => (
                <motion.li
                  key={n}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 26 }}
                >
                  <WorkRoomCard name={n} count={0} sessionStartedAt={null} onJoin={() => open(n)} />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  );
}
