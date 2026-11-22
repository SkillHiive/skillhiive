import { useRef, useState } from "react";
import { isTrackReference, useTracks, VideoTrack } from "@livekit/components-react";
import { Track } from "livekit-client";
import { LogOut, Maximize2, Mic, MicOff, PictureInPicture2, Video, VideoOff } from "lucide-react";
import { useTokens } from "@/theme";
import { Avatar } from "@/components/ui/Avatar";
import { useAvatars } from "@/hooks/useAvatars";
import type { PhaseState } from "@/hooks/sessionPhase";
import { clockLabel, MONO } from "@/lib/room";
import { PhaseRing } from "./PhaseRing";

type Corner = "br" | "bl" | "tr" | "tl";
const MARGIN = 16;
const WIDTH = 288;

export interface RoomMiniProps {
  roomName: string;
  myIdentity: string;
  phase: PhaseState;
  micEnabled: boolean;
  camEnabled: boolean;
  micOpen: boolean;
  count: number;
  /** "float" is the in-app card over other pages; "window" fills a picture-in-picture window. */
  variant: "float" | "window";
  onMic: () => void;
  onCam: () => void;
  onExpand: () => void;
  onLeave: () => void;
  /** Present when this browser can pop the room out into its own window. */
  onPopOut?: () => void;
}

/**
 * The room, small: whoever is speaking (or the first camera that's on), the clock, mic, camera,
 * back to the room, and leave. Rendered inside the room's LiveKit context.
 */
export function RoomMini({
  roomName,
  myIdentity,
  phase,
  micEnabled,
  camEnabled,
  micOpen,
  count,
  variant,
  onMic,
  onCam,
  onExpand,
  onLeave,
  onPopOut,
}: RoomMiniProps) {
  const { colors, radii } = useTokens();
  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }], { onlySubscribed: false });
  const avatars = useAvatars(tracks.map((t) => t.participant.identity));
  const [corner, setCorner] = useState<Corner>("br");
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const dragStart = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Someone speaking, else someone else with their camera on, else anyone else, else you.
  const others = tracks.filter((t) => t.participant.identity !== myIdentity);
  const hasVideo = (t: (typeof tracks)[number]) =>
    isTrackReference(t) && !!t.publication.track && !t.publication.isMuted;
  const shown =
    others.find((t) => t.participant.isSpeaking) ??
    others.find(hasVideo) ??
    others[0] ??
    tracks.find((t) => t.participant.identity === myIdentity);

  const fill = variant === "window";

  function onPointerDown(e: React.PointerEvent) {
    if (fill || (e.target as HTMLElement).closest("button")) return;
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragStart.current = { px: e.clientX, py: e.clientY, x: rect.left, y: rect.top };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    const s = dragStart.current;
    if (!s) return;
    setDrag({ x: s.x + e.clientX - s.px, y: s.y + e.clientY - s.py });
  }
  function onPointerUp(e: React.PointerEvent) {
    const s = dragStart.current;
    dragStart.current = null;
    if (!s) return;
    const moved = Math.abs(e.clientX - s.px) + Math.abs(e.clientY - s.py);
    setDrag(null);
    // A tap on the video goes back to the room; a drag snaps to the nearest corner.
    if (moved < 6) {
      onExpand();
      return;
    }
    const cx = e.clientX < window.innerWidth / 2 ? "l" : "r";
    const cy = e.clientY < window.innerHeight / 2 ? "t" : "b";
    setCorner(`${cy}${cx}` as Corner);
  }

  const place: React.CSSProperties = fill
    ? { position: "fixed", inset: 0 }
    : drag
      ? { position: "fixed", left: drag.x, top: drag.y }
      : {
          position: "fixed",
          [corner.includes("b") ? "bottom" : "top"]: corner.includes("t") ? 80 : MARGIN,
          [corner.includes("r") ? "right" : "left"]: MARGIN,
        };

  const iconBtn = (active: boolean, dim = false): React.CSSProperties => ({
    width: 36,
    height: 36,
    display: "grid",
    placeItems: "center",
    borderRadius: radii.pill,
    border: "none",
    background: active ? "#fff" : "rgba(0,0,0,0.45)",
    color: active ? "#000" : "#fff",
    opacity: dim ? 0.55 : 1,
    cursor: "pointer",
    backdropFilter: "blur(8px)",
    flexShrink: 0,
  });

  return (
    <div
      ref={cardRef}
      role="region"
      aria-label={`${roomName}, ${count} here`}
      className={fill ? undefined : "ui-pop"}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{
        ...place,
        width: fill ? "100%" : WIDTH,
        height: fill ? "100%" : (WIDTH * 9) / 16 + 48,
        zIndex: 1050,
        borderRadius: fill ? 0 : radii.lg,
        overflow: "hidden",
        background: colors.surface.sunken,
        boxShadow: fill ? "none" : `0 12px 40px rgba(0,0,0,0.35), 0 0 0 1px ${colors.border.strong}`,
        touchAction: "none",
        cursor: fill ? "default" : drag ? "grabbing" : "grab",
        transition: drag ? "none" : "top var(--dur-sheet) var(--ease-ui), left var(--dur-sheet) var(--ease-ui)",
        userSelect: "none",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
      }}
    >
      <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
        {shown && hasVideo(shown) && isTrackReference(shown) ? (
          <VideoTrack
            trackRef={shown}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
            <Avatar
              source={shown ? (avatars.get(shown.participant.identity) ?? null) : null}
              name={shown?.participant.identity ?? roomName}
              size={fill ? 88 : 64}
            />
          </div>
        )}

        <span
          role="timer"
          aria-label={phase.phase === "waiting" ? "Waiting to start" : `${phase.phase}, ${clockLabel(phase.remainingSeconds)} left`}
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "3px 10px 3px 4px",
            borderRadius: radii.pill,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(8px)",
            color: "#fff",
            fontFamily: MONO,
            fontSize: 12,
          }}
        >
          <PhaseRing phase={phase.phase} progress={phase.progress} size={18} stroke={3} />
          {phase.phase !== "waiting" ? clockLabel(phase.remainingSeconds) : phase.phase}
        </span>

        <span
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            display: "flex",
            gap: 6,
          }}
        >
          {onPopOut && (
            <button type="button" aria-label="Pop out" title="Pop out" className="ui-press" onClick={onPopOut} style={iconBtn(false)}>
              <PictureInPicture2 size={16} />
            </button>
          )}
          <button type="button" aria-label="Back to the room" title="Back to the room" className="ui-press" onClick={onExpand} style={iconBtn(false)}>
            <Maximize2 size={16} />
          </button>
        </span>

        {shown && (
          <span
            style={{
              position: "absolute",
              left: 8,
              bottom: 8,
              maxWidth: "60%",
              padding: "2px 8px",
              borderRadius: radii.pill,
              background: "rgba(0,0,0,0.45)",
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {shown.participant.identity}
          </span>
        )}
      </div>

      <div
        role="toolbar"
        aria-label="Room controls"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 8px",
          background: colors.surface.primary,
          borderTop: `1px solid ${colors.border.subtle}`,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            flex: 1,
            minWidth: 0,
            fontFamily: MONO,
            fontSize: 12,
            color: colors.text.secondary,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {roomName} <span style={{ color: colors.text.tertiary }}>· {count}</span>
        </span>
        <button
          type="button"
          className="ui-press"
          onClick={onMic}
          aria-label={micEnabled ? "Mute" : micOpen ? "Unmute" : "Mic opens at the break"}
          aria-pressed={micEnabled}
          style={{
            ...iconBtn(micEnabled, !micOpen),
            background: micEnabled ? colors.text.primary : colors.surface.secondary,
            color: micEnabled ? colors.bg.canvas : colors.text.primary,
            backdropFilter: undefined,
          }}
        >
          {micEnabled ? <Mic size={16} /> : <MicOff size={16} />}
        </button>
        <button
          type="button"
          className="ui-press"
          onClick={onCam}
          aria-label={camEnabled ? "Turn camera off" : "Turn camera on"}
          aria-pressed={camEnabled}
          style={{
            ...iconBtn(camEnabled),
            background: camEnabled ? colors.text.primary : colors.surface.secondary,
            color: camEnabled ? colors.bg.canvas : colors.text.primary,
            backdropFilter: undefined,
          }}
        >
          {camEnabled ? <Video size={16} /> : <VideoOff size={16} />}
        </button>
        <button
          type="button"
          className="ui-press"
          onClick={onLeave}
          aria-label="Leave"
          title="Leave"
          style={{
            ...iconBtn(false),
            background: colors.surface.secondary,
            color: colors.tint.danger,
            backdropFilter: undefined,
          }}
        >
          <LogOut size={16} />
        </button>
      </div>
    </div>
  );
}
