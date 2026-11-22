import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, SwitchCamera, Video, VideoOff } from "lucide-react";
import { Button, Text } from "@skillhiive/ui";
import { useTokens } from "@/theme";
import { Avatar } from "@/components/ui/Avatar";
import { BackLink } from "@/components/ui/BackLink";
import { PhaseRing } from "@/components/rooms/PhaseRing";
import { useServerPhase } from "@/hooks/useServerPhase";
import { clockLabel, MONO, ROOM_CAP } from "@/lib/room";

interface PreJoinProps {
  roomName: string;
  username: string;
  avatar: string | null;
  /** People inside right now, or null while the rooms list loads (or the room isn't open yet). */
  count: number | null;
  sessionStartedAt: string | null;
  clockOffsetMs: number;
  onJoin: (withCamera: boolean, isFrontCam: boolean) => void;
}

/** Before joining: your camera, the room's clock and how full it is. Camera on or off are both fine. */
export function PreJoin({ roomName, username, avatar, count, sessionStartedAt, clockOffsetMs, onJoin }: PreJoinProps) {
  const { colors, radii, spacing } = useTokens();
  const phase = useServerPhase(sessionStartedAt, clockOffsetMs);
  const full = count !== null && count >= ROOM_CAP;

  const hasCamera = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
  const [camOn, setCamOn] = useState(hasCamera);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [blocked, setBlocked] = useState(!hasCamera);
  const [canFlip, setCanFlip] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopPreview = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startPreview = useCallback(
    async (facingMode: "user" | "environment") => {
      stopPreview();
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: false });
        streamRef.current = stream;
        setBlocked(false);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        // Labels and the full device list only show up once a camera has been allowed.
        const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
        setCanFlip(devices.filter((d) => d.kind === "videoinput").length > 1);
        return true;
      } catch {
        setBlocked(true);
        return false;
      }
    },
    [stopPreview],
  );

  useEffect(() => {
    if (!hasCamera) return;
    void startPreview("user").then((ok) => !ok && setCamOn(false));
    return () => stopPreview();
  }, [hasCamera, startPreview, stopPreview]);

  async function toggleCamera() {
    if (camOn) {
      stopPreview();
      setCamOn(false);
    } else {
      setCamOn(await startPreview(facing));
    }
  }

  async function flipCamera() {
    const next = facing === "user" ? "environment" : "user";
    setFacing(next);
    if (camOn) await startPreview(next);
  }

  function join() {
    // The room opens its own camera; let go of the preview first so the device is free.
    stopPreview();
    onJoin(camOn, facing === "user");
  }

  const pill: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    border: `1px solid ${colors.border.subtle}`,
    background: colors.surface.primary,
    color: colors.text.primary,
    cursor: "pointer",
  };

  return (
    <div
      className="ui-page"
      style={{
        minHeight: "100dvh",
        background: colors.bg.muted,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: `${spacing.base}px`,
        boxSizing: "border-box",
      }}
    >
      <div style={{ width: "100%", maxWidth: 520, display: "flex", flexDirection: "column", gap: spacing.lg }}>
        <BackLink to="/rooms" label="Rooms" className="w-fit" />

        <div style={{ display: "flex", alignItems: "center", gap: spacing.md }}>
          <PhaseRing phase={phase.phase} progress={phase.progress} size={40} stroke={4} />
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
            <Text variant="title" weight={800} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {roomName}
            </Text>
            <span style={{ fontFamily: MONO, fontSize: 12, color: colors.text.tertiary, display: "flex", gap: 6 }}>
              <span style={{ color: phase.phase === "focus" ? colors.text.skillhive : colors.text.secondary }}>
                {count === null && phase.phase === "waiting" ? "new" : phase.phase}
              </span>
              {phase.phase !== "waiting" && (
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{clockLabel(phase.remainingSeconds)}</span>
              )}
            </span>
          </div>
          {count !== null && (
            <span style={{ fontFamily: MONO, fontSize: 12, color: full ? colors.text.primary : colors.text.tertiary }}>
              {full ? "full" : `${count}/${ROOM_CAP}`}
            </span>
          )}
        </div>

        <div
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: "4 / 3",
            borderRadius: radii.xxl,
            overflow: "hidden",
            background: colors.surface.sunken,
            border: `1px solid ${colors.border.subtle}`,
          }}
        >
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            aria-label="Your camera"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: facing === "user" ? "scaleX(-1)" : "none",
              display: camOn ? "block" : "none",
            }}
          />
          {!camOn && (
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
              <Avatar source={avatar} name={username} size={88} />
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: spacing.sm }}>
          <button
            type="button"
            className="ui-press"
            onClick={() => void toggleCamera()}
            disabled={!hasCamera}
            aria-label={camOn ? "Turn camera off" : "Turn camera on"}
            aria-pressed={camOn}
            title={blocked && !camOn ? "Camera blocked" : undefined}
            style={{ ...pill, color: camOn ? colors.text.primary : colors.text.tertiary }}
          >
            {camOn ? <Video size={18} /> : <VideoOff size={18} />}
          </button>
          {canFlip && camOn && (
            <button type="button" className="ui-press" onClick={() => void flipCamera()} aria-label="Switch camera" style={pill}>
              <SwitchCamera size={18} />
            </button>
          )}
          {/* The mic is not a choice here: it opens for everyone at the break. */}
          <span
            role="img"
            aria-label={phase.micAllowed ? "Mic open, it is the break" : "Mic opens at the break"}
            title={phase.micAllowed ? "Break: mic open" : "Mic opens at the break"}
            style={{ ...pill, cursor: "default", color: phase.micAllowed ? colors.text.primary : colors.text.tertiary, opacity: 0.8 }}
          >
            {phase.micAllowed ? <Mic size={18} /> : <MicOff size={18} />}
          </span>
        </div>

        <Button label={full ? "Full" : "Join"} size="lg" fullWidth disabled={full} onClick={join} />
      </div>
    </div>
  );
}
