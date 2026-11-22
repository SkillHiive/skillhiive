import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import type { Participant } from "livekit-client";
import { Check, Hexagon, LogOut, Mic, MicOff, PictureInPicture2, SwitchCamera, Users, Video, VideoOff, Volume2 } from "lucide-react";
import { useTokens } from "@/theme";
import { Avatar } from "@/components/ui/Avatar";
import { useAvatars } from "@/hooks/useAvatars";
import { useEscape } from "@/hooks/useEscape";
import type { PhaseState } from "@/hooks/sessionPhase";
import { clockLabel, MONO } from "@/lib/room";
import { PhaseRing } from "./PhaseRing";
import { SpeakingBars } from "./RoomTiles";

/**
 * The 50/10 clock. During focus it is the biggest thing in the room; at the break it steps
 * aside so the people can be bigger, and the open mic shows itself.
 */
export function RoomClock({ phase, compact }: { phase: PhaseState; compact: boolean }) {
  const { colors, radii } = useTokens();
  const focus = phase.phase === "focus";
  const label = clockLabel(phase.remainingSeconds);

  if (focus && !compact) {
    const size = 112;
    return (
      <div className="ui-rise" style={{ display: "flex", justifyContent: "center", padding: "4px 0 12px" }}>
        <div style={{ position: "relative", width: size, height: size }}>
          <PhaseRing phase="focus" progress={phase.progress} size={size} stroke={6} />
          <div
            role="timer"
            aria-label={`Focus, ${label} left`}
            style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}
          >
            <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.5, fontVariantNumeric: "tabular-nums", color: colors.text.primary }}>
              {label}
            </span>
            <span style={{ fontFamily: MONO, fontSize: 11, color: colors.text.skillhive }}>focus</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, padding: "2px 0 10px" }}>
      <span
        role="timer"
        aria-label={phase.phase === "waiting" ? "Waiting to start" : `${phase.phase}, ${label} left`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "4px 12px 4px 6px",
          borderRadius: radii.pill,
          background: colors.surface.primary,
          border: `1px solid ${colors.border.subtle}`,
          fontFamily: MONO,
          fontSize: 13,
          color: colors.text.secondary,
        }}
      >
        <PhaseRing phase={phase.phase} progress={phase.progress} size={22} stroke={3} />
        <span style={{ color: focus ? colors.text.skillhive : colors.text.secondary }}>{phase.phase}</span>
        {phase.phase !== "waiting" && (
          <span style={{ fontVariantNumeric: "tabular-nums", color: colors.text.primary }}>{label}</span>
        )}
      </span>
      {phase.micAllowed && (
        <span
          className="ui-rise"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 12px",
            borderRadius: radii.pill,
            background: `${colors.tint.success}1f`,
            color: colors.tint.success,
            fontFamily: MONO,
            fontSize: 12,
          }}
        >
          <Mic size={13} aria-hidden="true" />
          mic open
        </span>
      )}
    </div>
  );
}

export interface OutputDevice {
  id: string;
  name: string;
}

/** One rounded pill: mic, camera, the extras this device has, people and leave. */
export function ControlBar({
  micEnabled,
  camEnabled,
  micOpen,
  locked,
  canFlip,
  outputs,
  activeOutputId,
  count,
  onMic,
  onCam,
  onFlip,
  onOutput,
  onPeople,
  onLeave,
  onPopOut,
}: {
  micEnabled: boolean;
  camEnabled: boolean;
  /** The break: the mic may be switched on. */
  micOpen: boolean;
  /** In a cubicle: the room's mic and camera wait until it ends. */
  locked: boolean;
  canFlip: boolean;
  outputs: OutputDevice[];
  activeOutputId: string;
  count: number;
  onMic: () => void;
  onCam: () => void;
  onFlip: () => void;
  onOutput: (id: string) => void;
  onPeople: () => void;
  onLeave: () => void;
  /** Present when this browser can put the room in its own always-on-top window. */
  onPopOut?: () => void;
}) {
  const { colors, radii } = useTokens();
  const [outputOpen, setOutputOpen] = useState(false);

  const btn = (active: boolean, dim = false): React.CSSProperties => ({
    width: 48,
    height: 48,
    display: "grid",
    placeItems: "center",
    borderRadius: radii.pill,
    border: "none",
    background: active ? colors.text.primary : "transparent",
    color: active ? colors.bg.canvas : dim ? colors.text.tertiary : colors.text.primary,
    cursor: "pointer",
    flexShrink: 0,
  });

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "10px 12px calc(12px + env(safe-area-inset-bottom))" }}>
      <div
        role="toolbar"
        aria-label="Room controls"
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: 4,
          borderRadius: radii.pill,
          background: colors.surface.primary,
          border: `1px solid ${colors.border.subtle}`,
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          maxWidth: "100%",
          overflowX: "auto",
        }}
      >
        <button
          type="button"
          className="ui-press"
          onClick={onMic}
          aria-label={micEnabled ? "Mute" : micOpen ? "Unmute" : "Mic opens at the break"}
          aria-pressed={micEnabled}
          style={{ ...btn(micEnabled, !micOpen || locked), opacity: !micOpen || locked ? 0.55 : 1 }}
        >
          {micEnabled ? <Mic size={20} /> : <MicOff size={20} />}
        </button>
        <button
          type="button"
          className="ui-press"
          onClick={onCam}
          disabled={locked}
          aria-label={camEnabled ? "Turn camera off" : "Turn camera on"}
          aria-pressed={camEnabled}
          style={{ ...btn(camEnabled, locked), opacity: locked ? 0.55 : 1 }}
        >
          {camEnabled ? <Video size={20} /> : <VideoOff size={20} />}
        </button>
        {canFlip && camEnabled && !locked && (
          <button type="button" className="ui-press" onClick={onFlip} aria-label="Switch camera" style={btn(false)}>
            <SwitchCamera size={20} />
          </button>
        )}
        {outputs.length > 1 && (
          <button
            type="button"
            className="ui-press"
            onClick={() => setOutputOpen((v) => !v)}
            aria-label="Speaker"
            aria-expanded={outputOpen}
            style={btn(false)}
          >
            <Volume2 size={20} />
          </button>
        )}
        {onPopOut && (
          <button type="button" className="ui-press" onClick={onPopOut} aria-label="Pop out" title="Pop out" style={btn(false)}>
            <PictureInPicture2 size={20} />
          </button>
        )}
        <button
          type="button"
          className="ui-press"
          onClick={onPeople}
          aria-label={`People, ${count}`}
          style={{ ...btn(false), width: "auto", padding: "0 14px", gap: 6, display: "flex", alignItems: "center" }}
        >
          <Users size={18} />
          <span style={{ fontFamily: MONO, fontSize: 13, fontVariantNumeric: "tabular-nums" }}>{count}</span>
        </button>
        <span aria-hidden="true" style={{ width: 1, height: 24, background: colors.border.subtle, margin: "0 2px", flexShrink: 0 }} />
        <button
          type="button"
          className="ui-press"
          onClick={onLeave}
          aria-label="Leave"
          style={{
            ...btn(false),
            width: "auto",
            padding: "0 16px",
            gap: 6,
            display: "flex",
            alignItems: "center",
            color: colors.tint.danger,
            fontSize: 14,
            fontWeight: 700,
            fontFamily: "inherit",
          }}
        >
          <LogOut size={17} />
          Leave
        </button>
      </div>
      {outputOpen && (
        <OutputMenu
          outputs={outputs}
          activeId={activeOutputId}
          onPick={(id) => {
            onOutput(id);
            setOutputOpen(false);
          }}
          onClose={() => setOutputOpen(false)}
        />
      )}
    </div>
  );
}

function OutputMenu({
  outputs,
  activeId,
  onPick,
  onClose,
}: {
  outputs: OutputDevice[];
  activeId: string;
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const { colors, radii } = useTokens();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);
  return (
    <div
      ref={ref}
      role="menu"
      aria-label="Speaker"
      className="ui-pop"
      style={{
        position: "fixed",
        bottom: 84,
        left: "50%",
        transform: "translateX(-50%)",
        minWidth: 220,
        maxWidth: "calc(100vw - 24px)",
        padding: 6,
        borderRadius: radii.lg,
        background: colors.surface.raised,
        border: `1px solid ${colors.border.strong}`,
        boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
        zIndex: 1200,
      }}
    >
      {outputs.map((d) => (
        <button
          key={d.id}
          type="button"
          role="menuitemradio"
          aria-checked={d.id === activeId}
          onClick={() => onPick(d.id)}
          className="ui-press"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            width: "100%",
            padding: "10px 12px",
            border: "none",
            borderRadius: radii.md,
            background: "transparent",
            color: colors.text.primary,
            fontSize: 13,
            fontWeight: d.id === activeId ? 700 : 500,
            textAlign: "left",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          <Check size={14} style={{ opacity: d.id === activeId ? 1 : 0, flexShrink: 0 }} aria-hidden="true" />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span>
        </button>
      ))}
    </div>
  );
}

/** Who is here: a face, a name, and whether they are speaking or in a cubicle. */
export function PeopleSheet({
  open,
  participants,
  myIdentity,
  cubicleSet,
  onClose,
}: {
  open: boolean;
  participants: Participant[];
  myIdentity: string;
  cubicleSet: Set<string>;
  onClose: () => void;
}) {
  const { colors, radii, spacing } = useTokens();
  const avatars = useAvatars(participants.map((p) => p.identity));
  useEscape(open, onClose);
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1300,
            background: colors.overlay.scrim,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="People"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 420,
              maxHeight: "70dvh",
              overflowY: "auto",
              margin: `0 ${spacing.sm}px ${spacing.sm}px`,
              padding: spacing.sm,
              borderRadius: radii.xxl,
              background: colors.bg.muted,
              border: `1px solid ${colors.border.subtle}`,
              boxSizing: "border-box",
            }}
          >
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {participants.map((p) => {
                const me = p.identity === myIdentity;
                return (
                  <li
                    key={p.identity}
                    style={{ display: "flex", alignItems: "center", gap: spacing.md, padding: `${spacing.sm}px ${spacing.md}px` }}
                  >
                    <Avatar
                      source={avatars.get(p.identity) ?? null}
                      name={p.identity}
                      size={36}
                      ringColor={p.isSpeaking ? colors.tint.success : undefined}
                    />
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontSize: 15,
                        fontWeight: 600,
                        color: colors.text.primary,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {p.identity}
                      {me && <span style={{ fontFamily: MONO, fontSize: 12, color: colors.text.tertiary, marginLeft: 8 }}>you</span>}
                    </span>
                    {cubicleSet.has(p.identity) && <Hexagon size={16} color={colors.text.tertiary} aria-label="In a cubicle" />}
                    {p.isSpeaking && <SpeakingBars color={colors.tint.success} />}
                  </li>
                );
              })}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
