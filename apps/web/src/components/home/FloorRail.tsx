import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { ChevronRight, Mic } from "lucide-react";
import { useTokens } from "@/theme";
import { Avatar } from "@/components/ui/Avatar";
import { PhaseRing } from "@/components/rooms/PhaseRing";
import { computePhase } from "@/hooks/sessionPhase";
import type { ActiveRoom } from "@/hooks/useActiveRooms";
import type { PostModel } from "@/components/feed/PostCards";
import type { FollowedPerson } from "@/lib/following";
import { clockLabel, floorSummary, MONO, serverNow } from "@/lib/room";
import { timeAgo } from "@/lib/timeAgo";

/** The rooms' clocks, re-read every second while any room is open. */
function useFloorNow(active: boolean, clockOffsetMs: number): number {
  const [now, setNow] = useState(() => serverNow(clockOffsetMs));
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(serverNow(clockOffsetMs)), 1000);
    return () => clearInterval(id);
  }, [active, clockOffsetMs]);
  return now;
}

function nextBreakLabel(seconds: number | null): string | null {
  return seconds === null ? null : `next break ${Math.max(1, Math.ceil(seconds / 60))}m`;
}

/** A quiet card in the rail: a monospace label and whatever is under it. */
export function RailCard({ label, children }: { label: string; children: ReactNode }) {
  const { colors, radii, spacing } = useTokens();
  return (
    <section
      aria-label={label}
      className="ui-rise"
      style={{
        padding: `${spacing.md}px ${spacing.base}px`,
        borderRadius: radii.lg,
        background: colors.surface.primary,
        border: `1px solid ${colors.border.subtle}`,
        display: "flex",
        flexDirection: "column",
        gap: spacing.sm,
      }}
    >
      <span style={{ fontFamily: MONO, fontSize: 11, color: colors.text.tertiary }}>{label}</span>
      {children}
    </section>
  );
}

/** Open rooms with their clocks; each one goes straight to the room. Totals only, never who. */
export function RoomsCard({ rooms, clockOffsetMs, limit = 4 }: { rooms: ActiveRoom[]; clockOffsetMs: number; limit?: number }) {
  const { colors, radii } = useTokens();
  const now = useFloorNow(rooms.length > 0, clockOffsetMs);
  const phases = rooms.map((r) => ({ room: r, phase: computePhase(r.session_started_at, now) }));
  const next = nextBreakLabel(floorSummary(phases.map((p) => p.phase)).nextBreakSeconds);

  return (
    <RailCard label={next ? `space · ${next}` : "space"}>
      {phases.length === 0 ? (
        <Link
          to="/rooms"
          className="ui-press"
          style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: MONO, fontSize: 12, color: colors.text.secondary, textDecoration: "none" }}
        >
          <PhaseRing phase="waiting" progress={0} size={16} stroke={2.5} />
          <span style={{ flex: 1 }}>quiet</span>
          <ChevronRight size={14} aria-hidden="true" />
        </Link>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          {phases.slice(0, limit).map(({ room, phase }) => (
            <li key={room.room_name}>
              <Link
                to={`/rooms/${encodeURIComponent(room.room_name)}`}
                className="ui-press"
                aria-label={`${room.room_name}, ${phase.phase}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "5px 6px",
                  margin: "0 -6px",
                  borderRadius: radii.sm,
                  fontFamily: MONO,
                  fontSize: 12,
                  color: colors.text.primary,
                  textDecoration: "none",
                }}
              >
                <PhaseRing phase={phase.phase} progress={phase.progress} size={16} stroke={2.5} />
                <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {room.room_name}
                </span>
                {phase.phase === "break" ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: colors.tint.success }}>
                    <Mic size={11} aria-hidden="true" />
                    mic open
                  </span>
                ) : (
                  <span style={{ color: colors.text.tertiary, fontVariantNumeric: "tabular-nums" }}>
                    {phase.phase === "waiting" ? "waiting" : clockLabel(phase.remainingSeconds)}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </RailCard>
  );
}

/** The first line of a post, for a one-line mention. */
function firstLine(post: PostModel): string {
  const text = post.caption ?? post.project_posts?.title ?? "";
  return text.split("\n")[0]?.trim() || "a new post";
}

/** What people you follow shipped lately: their work, never their status. */
export function ShippedCard({ posts }: { posts: PostModel[] }) {
  const { colors } = useTokens();
  if (posts.length === 0) return null;
  return (
    <RailCard label="shipped">
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        {posts.map((p) => (
          <li key={p.id}>
            <ShippedLine post={p} wrap />
          </li>
        ))}
      </ul>
      <Link to="/feed" style={{ fontFamily: MONO, fontSize: 11, color: colors.text.tertiary, textDecoration: "none" }}>
        feed
      </Link>
    </RailCard>
  );
}

/** One post as a single line: face, name, what shipped, when. */
export function ShippedLine({ post, wrap = false }: { post: PostModel; wrap?: boolean }) {
  const { colors } = useTokens();
  const name = post.profiles?.username ?? "someone";
  return (
    <Link
      to={`/post/${post.id}`}
      className="ui-press"
      style={{ display: "flex", alignItems: "flex-start", gap: 8, color: colors.text.secondary, textDecoration: "none", fontSize: 13, lineHeight: 1.4 }}
    >
      <Avatar source={post.profiles?.avatar ?? null} name={name} size={20} />
      <span
        style={{
          flex: 1,
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          ...(wrap
            ? { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }
            : { whiteSpace: "nowrap" as const }),
        }}
      >
        <span style={{ color: colors.text.primary, fontWeight: 600 }}>{name}</span> {firstLine(post)}
      </span>
      <span style={{ fontFamily: MONO, fontSize: 11, color: colors.text.tertiary, flexShrink: 0 }}>{timeAgo(post.created_at)}</span>
    </Link>
  );
}

/** Phones: Space in one line, under the greeting. */
export function FloorLine({ rooms, clockOffsetMs }: { rooms: ActiveRoom[]; clockOffsetMs: number }) {
  const { colors, radii, spacing } = useTokens();
  const now = useFloorNow(rooms.length > 0, clockOffsetMs);
  const phases = rooms.map((r) => computePhase(r.session_started_at, now));
  const s = floorSummary(phases);
  const lead = phases.find((p) => p.phase === "focus") ?? phases[0];
  const parts = [
    s.open === 0 ? "rooms quiet" : s.focus ? `${s.focus} ${s.focus === 1 ? "room" : "rooms"} in focus` : `${s.open} open`,
    s.onBreak ? `${s.onBreak} on break` : null,
    nextBreakLabel(s.nextBreakSeconds),
  ].filter(Boolean);
  return (
    <Link
      to="/rooms"
      className="ui-lift ui-rise"
      style={{
        display: "flex",
        alignItems: "center",
        gap: spacing.sm,
        padding: `${spacing.sm}px ${spacing.md}px`,
        borderRadius: radii.lg,
        border: `1px dashed ${colors.border.strong}`,
        color: colors.text.secondary,
        textDecoration: "none",
        fontFamily: MONO,
        fontSize: 12,
      }}
    >
      <PhaseRing phase={lead?.phase ?? "waiting"} progress={lead?.progress ?? 0} size={18} stroke={2.5} />
      <span style={{ flex: 1, minWidth: 0 }}>{parts.join(" · ")}</span>
      <ChevronRight size={14} aria-hidden="true" />
    </Link>
  );
}

/** The people you follow and the last thing each shipped. Their work, never their status. */
export function PeopleCard({ people }: { people: FollowedPerson[] }) {
  const { colors, radii } = useTokens();
  if (people.length === 0) return null;
  return (
    <RailCard label="people you follow">
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        {people.map((p) => {
          const row = (
            <>
              <Avatar source={p.avatar} name={p.name} size={22} />
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontSize: 13,
                  color: colors.text.secondary,
                }}
              >
                <span style={{ color: colors.text.primary, fontWeight: 600 }}>{p.username ?? p.name}</span>
                {p.latest ? ` ${p.latest.title}` : ""}
              </span>
              {p.latest && (
                <span style={{ fontFamily: MONO, fontSize: 11, color: colors.text.tertiary, flexShrink: 0 }}>
                  {timeAgo(p.latest.at)}
                </span>
              )}
            </>
          );
          const style: React.CSSProperties = {
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "5px 6px",
            margin: "0 -6px",
            borderRadius: radii.sm,
            textDecoration: "none",
          };
          // A post opens; otherwise their profile does.
          const to = p.latest?.postId ? `/post/${p.latest.postId}` : p.username ? `/p/${encodeURIComponent(p.username)}` : null;
          return (
            <li key={p.id}>
              {to ? (
                <Link to={to} className="ui-press" style={style}>
                  {row}
                </Link>
              ) : (
                <div style={style}>{row}</div>
              )}
            </li>
          );
        })}
      </ul>
    </RailCard>
  );
}
