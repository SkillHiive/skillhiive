import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { DoorOpen, Plus } from "lucide-react";

import { WorkRoomCard } from "@/components/ui/WorkRoomCard";
import { Text, Button } from "@skillhiive/ui";
import { useTokens } from "@/theme";
import { lastClockOffset, MONO, ROOM_CAP, roomNameInput, roomSlug } from "@/lib/room";
import { useActiveRooms } from "@/hooks/useActiveRooms";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState, SkeletonRows } from "@/components/ui/States";

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
          maxWidth: 640,
          margin: "0 auto",
          padding: `${spacing.sm}px ${spacing.base}px`,
          display: "flex",
          flexDirection: "column",
          gap: spacing.lg,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: spacing.sm }}>
          <Text variant="headline" weight={900} style={{ letterSpacing: -0.5 }}>
            Rooms
          </Text>
          {rooms.length > 0 && (
            <span
              style={{
                fontFamily: MONO,
                fontSize: 12,
                color: colors.text.tertiary,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {rooms.length} open
            </span>
          )}
        </div>

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

        {loading ? (
          <SkeletonRows rows={3} height={70} />
        ) : error ? (
          <ErrorState message={error} onRetry={() => void retry()} retrying={retrying} />
        ) : rooms.length === 0 ? (
          <EmptyState
            icon={<DoorOpen size={22} />}
            title="No rooms open"
            action={
              <Button label="Open a room" size="sm" variant="secondary" onClick={() => inputRef.current?.focus()} />
            }
          />
        ) : (
          <ul
            aria-label="Open rooms"
            style={{ display: "flex", flexDirection: "column", gap: spacing.sm, margin: 0, padding: 0, listStyle: "none" }}
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
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  );
}
