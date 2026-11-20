"use client";

import React, { memo, useEffect, useState } from "react";
import { useTokens } from "@/theme";
import { computePhase, type PhaseState } from "@/hooks/sessionPhase";
import { serverNow } from "@/lib/room";


/** "live" is a room with people in it (its clock may not have started yet); "empty" is the no-rooms placeholder. */
export type RoomState = "live" | "empty";

export interface WorkRoomCardProps {
  state: RoomState;
  name: string;
  tag: string;
  members?: string[];
  /** When the room's focus/break clock started (server time), or null if it hasn't. */
  sessionStartedAt?: string | null;
  /** How far this computer's clock is behind the server's, in ms. */
  clockOffsetMs?: number;
  onJoin?: () => void;
  onStart?: () => void;
  style?: React.CSSProperties;
}

interface PhaseCardProps extends WorkRoomCardProps {
  phase: PhaseState;
}

const ACCENT = {
  active: "#FF4D4D",
  activeSoft: "rgba(255,77,77,0.10)",
  break: "#FFB86B",
  breakSoft: "rgba(255,184,107,0.10)",
};

const AVATAR_COLORS: [string, string][] = [
  ["#30204D", "#C8A5FF"],
  ["#1E3550", "#8BC2FF"],
  ["#173B33", "#84F1C3"],
  ["#493221", "#FFC58A"],
];

function usePalette() {
  const { colors } = useTokens();
  return {
    card: colors.surface.primary,
    border: colors.border.subtle,
    accentBorder: colors.surface.skillhive,
    text: colors.text.primary,
    muted: colors.text.secondary,
    faint: colors.text.tertiary,
    track: colors.overlay.press,
    ringBorder: colors.surface.primary,
  };
}


/** The room's phase on the server's clock, re-read every second while the clock runs. */
function useServerPhase(sessionStartedAt: string | null | undefined, clockOffsetMs: number): PhaseState {
  const [now, setNow] = useState(() => serverNow(clockOffsetMs));
  useEffect(() => {
    if (!sessionStartedAt) return;
    const id = setInterval(() => setNow(serverNow(clockOffsetMs)), 1000);
    return () => clearInterval(id);
  }, [sessionStartedAt, clockOffsetMs]);
  return computePhase(sessionStartedAt ?? null, now);
}

function formatClock(totalSeconds: number) {
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const ss = String(totalSeconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}


function PulseDot({ color }: { color: string }) {
  return (
    <>
      <style>{`
        @keyframes wrc-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%       { transform: scale(1.18); opacity: 0.8; }
        }
        .wrc-pulse-dot { animation: wrc-pulse 1.3s ease-in-out infinite; }
      `}</style>
      <div className="wrc-pulse-dot" style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: color, flexShrink: 0 }} />
    </>
  );
}


function ProgressBar({ progress, color, track }: { progress: number; color: string; track: string }) {
  const pct = `${Math.max(4, Math.round(progress * 100))}%`;
  return (
    <div style={{ height: 7, width: "100%", background: track, borderRadius: 999, overflow: "hidden" }}>
      <div style={{ height: "100%", width: pct, background: color, borderRadius: 999, transition: "width 0.8s cubic-bezier(.25,.46,.45,.94)" }} />
    </div>
  );
}


function AvatarStack({ names, ringBorder }: { names: string[]; ringBorder: string }) {
  const visible = names.slice(0, 3);
  const overflow = names.length - 3;
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {visible.map((name, i) => {
        const initials = name.split(" ").map((x) => x[0]).join("").slice(0, 2).toUpperCase();
        const [bg, color] = AVATAR_COLORS[i % AVATAR_COLORS.length] ?? ["transparent", "inherit"];
        return (
          <div key={`${name}-${i}`} style={{ width: 28, height: 28, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: bg, border: `2px solid ${ringBorder}`, marginLeft: i === 0 ? 0 : -8, zIndex: visible.length - i, position: "relative" }}>
            <span style={{ fontSize: 9, fontWeight: 800, color }}>{initials}</span>
          </div>
        );
      })}
      {overflow > 0 && (
        <div style={{ width: 28, height: 28, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#272B3C", border: `2px solid ${ringBorder}`, marginLeft: -8, position: "relative" }}>
          <span style={{ fontSize: 9, fontWeight: 800, color: "#B7BDD3" }}>+{overflow}</span>
        </div>
      )}
    </div>
  );
}


function Tag({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <div style={{ padding: "4px 8px", borderRadius: 999, backgroundColor: bg, display: "inline-flex" }}>
      <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color }}>{label}</span>
    </div>
  );
}


function Button({ label, onPress, filled, color }: { label: string; onPress?: () => void; filled?: boolean; color: string }) {
  const { colors } = useTokens();
  const [pressed, setPressed] = useState(false);
  return (
    <button
      onClick={onPress}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      style={{ minWidth: 72, padding: "8px 12px", borderRadius: 10, border: `1px solid ${filled ? color : colors.border.subtle}`, backgroundColor: filled ? color : "transparent", color: filled ? "#000" : color, fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "opacity 0.15s, transform 0.15s", opacity: pressed ? 0.85 : 1, transform: pressed ? "scale(0.98)" : "scale(1)", fontFamily: "inherit", flexShrink: 0 }}
    >
      {label}
    </button>
  );
}


function Card({ children, style, accent }: { children: React.ReactNode; style?: React.CSSProperties; accent?: boolean }) {
  const p = usePalette();
  return (
    <div style={{ width: "100%", borderRadius: 18, border: `1px solid ${accent ? p.accentBorder : p.border}`, padding: 14, backgroundColor: p.card, boxSizing: "border-box", ...style }}>
      {children}
    </div>
  );
}


const ActiveCard = memo(function ActiveCard({ name, tag, members = [], phase, onJoin, style }: PhaseCardProps) {
  const p = usePalette();
  const formatted = formatClock(phase.remainingSeconds);
  const progress = 1 - phase.progress;
  return (
    <Card style={style} accent>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: p.text, fontSize: 16, fontWeight: 700, letterSpacing: -0.3, marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <Tag label={tag} color={ACCENT.active} bg={ACCENT.activeSoft} />
            <Tag label="focus" color={ACCENT.active} bg={ACCENT.activeSoft} />
          </div>
        </div>
        <Button label="Join" onPress={onJoin} filled color={ACCENT.active} />
      </div>

      <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <PulseDot color={ACCENT.active} />
          <span style={{ color: p.muted, fontSize: 12, fontWeight: 600, marginLeft: 8 }}>Focus session</span>
          <span style={{ marginLeft: "auto", color: p.text, fontSize: 14, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{formatted}</span>
        </div>
        <ProgressBar progress={progress} color={ACCENT.active} track={p.track} />
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <AvatarStack names={members} ringBorder={p.ringBorder} />
          <span style={{ color: p.muted, fontSize: 11, fontWeight: 500, marginLeft: 5 }}>{members.length} working</span>
        </div>
      </div>
    </Card>
  );
});


const BreakCard = memo(function BreakCard({ name, tag, members = [], phase, onJoin, style }: PhaseCardProps) {
  const p = usePalette();
  const formatted = formatClock(phase.remainingSeconds);
  const progress = 1 - phase.progress;
  return (
    <Card style={style} accent>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: p.text, fontSize: 16, fontWeight: 700, letterSpacing: -0.3, marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <Tag label={tag} color={ACCENT.break} bg={ACCENT.breakSoft} />
            <Tag label="break" color={ACCENT.break} bg={ACCENT.breakSoft} />
          </div>
        </div>
        <Button label="Join" onPress={onJoin} color={ACCENT.break} />
      </div>

      <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <PulseDot color={ACCENT.break} />
          <span style={{ color: p.muted, fontSize: 12, fontWeight: 600, marginLeft: 8 }}>Break</span>
          <span style={{ marginLeft: "auto", color: p.text, fontSize: 14, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{formatted}</span>
        </div>
        <ProgressBar progress={progress} color={ACCENT.break} track={p.track} />
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <AvatarStack names={members} ringBorder={p.ringBorder} />
          <span style={{ color: p.muted, fontSize: 11, fontWeight: 500, marginLeft: 5 }}>{members.length} here</span>
        </div>
      </div>
    </Card>
  );
});


/** People are inside but the room's clock hasn't started: no timer yet, still joinable. */
const WaitingCard = memo(function WaitingCard({ name, tag, members = [], onJoin, style }: WorkRoomCardProps) {
  const p = usePalette();
  return (
    <Card style={style}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: p.text, fontSize: 16, fontWeight: 700, letterSpacing: -0.3, marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <Tag label={tag} color={p.muted} bg={p.track} />
          </div>
        </div>
        <Button label="Join" onPress={onJoin} color={p.text} />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <AvatarStack names={members} ringBorder={p.ringBorder} />
        <span style={{ color: p.muted, fontSize: 11, fontWeight: 500, marginLeft: 5 }}>{members.length} here</span>
      </div>
    </Card>
  );
});


const EmptyCard = memo(function EmptyCard({ name, tag, onStart, style }: WorkRoomCardProps) {
  const p = usePalette();
  return (
    <Card style={style}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: p.muted, fontSize: 16, fontWeight: 700, letterSpacing: -0.3, marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <Tag label={tag} color={p.muted} bg={p.track} />
          </div>
        </div>
        {onStart && <Button label="Start" onPress={onStart} filled color={p.accentBorder} />}
      </div>
      <div>
        <div style={{ color: p.text, fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Nobody's here yet</div>
        <div style={{ color: p.muted, fontSize: 12, lineHeight: 1.5, marginBottom: 14 }}>Start a focus session and invite others in.</div>
      </div>
    </Card>
  );
});


export function WorkRoomCard(props: WorkRoomCardProps) {
  if (props.state === "empty") return <EmptyCard {...props} />;
  return <LiveCard {...props} />;
}

function LiveCard(props: WorkRoomCardProps) {
  const phase = useServerPhase(props.sessionStartedAt, props.clockOffsetMs ?? 0);
  if (phase.phase === "focus") return <ActiveCard {...props} phase={phase} />;
  if (phase.phase === "break") return <BreakCard {...props} phase={phase} />;
  return <WaitingCard {...props} />;
}
