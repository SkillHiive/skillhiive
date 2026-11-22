import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { isTrackReference, useTracks, VideoTrack } from "@livekit/components-react";
import type { TrackReferenceOrPlaceholder } from "@livekit/components-react";
import { Track } from "livekit-client";
import { Hexagon, Maximize2, MicOff, Minimize2, MoreHorizontal } from "lucide-react";
import { useTokens } from "@/theme";
import { Avatar } from "@/components/ui/Avatar";
import { useAvatars } from "@/hooks/useAvatars";
import { useEscape } from "@/hooks/useEscape";
import type { SessionPhase } from "@/hooks/sessionPhase";
import { computeOptimalGrid, GRID_GAP, TILE_ASPECT } from "@/lib/room";

const SPEAKER_DEBOUNCE_MS = 800;
const MOBILE_BREAKPOINT = 700;
const DOUBLE_TAP_MS = 300;

export interface TileActions {
  onPin: (id: string) => void;
  onUnpin: () => void;
  /** `confirmed` is true from the tile menu; a bare double-tap asks first. */
  onCubicle: (id: string, confirmed?: boolean) => void;
}

/** Everyone in the room, camera on or off, sorted so the person speaking comes first. */
export function ConferenceView({
  pinnedIdentity,
  cubicleSet,
  myIdentity,
  phase,
  actions,
}: {
  pinnedIdentity: string | null;
  cubicleSet: Set<string>;
  myIdentity: string;
  phase: SessionPhase;
  actions: TileActions;
}) {
  // Placeholders keep people with the camera off in the grid: that is a normal way to be here.
  const rawTracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }], { onlySubscribed: false });
  const avatars = useAvatars(rawTracks.map((t) => t.participant.identity));
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setDims({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // The speaker moves to the front after a moment, and back after they stop, so tiles don't jump.
  const [topIdentity, setTopIdentity] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speakingRef = useRef<string | null>(null);
  const speakingKey = rawTracks.map((t) => `${t.participant.identity}:${t.participant.isSpeaking}`).join(",");
  useEffect(() => {
    const speaking = rawTracks.find((t) => t.participant.isSpeaking && t.participant.identity !== myIdentity);
    const id = speaking?.participant.identity ?? null;
    if (id === speakingRef.current) return;
    speakingRef.current = id;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setTopIdentity(id), id ? SPEAKER_DEBOUNCE_MS : 2000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speakingKey]);
  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const tracks = useMemo(() => {
    return [...rawTracks].sort((a, b) => {
      const aId = a.participant.identity,
        bId = b.participant.identity;
      if (aId === topIdentity) return -1;
      if (bId === topIdentity) return 1;
      if (aId === myIdentity) return -1;
      if (bId === myIdentity) return 1;
      return aId.localeCompare(bId);
    });
  }, [rawTracks, topIdentity, myIdentity]);

  const isMobile = dims.w > 0 && dims.w < MOBILE_BREAKPOINT;
  const tileProps = (ref: TrackReferenceOrPlaceholder) => ({
    trackRef: ref,
    avatar: avatars.get(ref.participant.identity) ?? null,
    inCubicle: cubicleSet.has(ref.participant.identity),
    isMe: ref.participant.identity === myIdentity,
    phase,
    actions,
  });

  let body: React.ReactNode = null;
  if (dims.w > 0 && dims.h > 0 && tracks.length > 0) {
    const pinned = pinnedIdentity ? tracks.find((t) => t.participant.identity === pinnedIdentity) : undefined;
    if (pinned) {
      const others = tracks.filter((t) => t !== pinned);
      const stripH = others.length > 0 ? (isMobile ? 92 : 120) : 0;
      const main = computeOptimalGrid(1, dims.w, dims.h - (stripH ? stripH + GRID_GAP : 0));
      body = (
        <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", gap: GRID_GAP }}>
          <div style={{ flex: 1, display: "grid", placeItems: "center", overflow: "hidden" }}>
            <ParticipantTile {...tileProps(pinned)} width={main.tileW} height={main.tileH} pinned />
          </div>
          {stripH > 0 && (
            <div style={{ height: stripH, display: "flex", gap: GRID_GAP, overflowX: "auto", flexShrink: 0, justifyContent: "center" }}>
              {others.map((ref) => (
                <ParticipantTile
                  key={ref.participant.identity}
                  {...tileProps(ref)}
                  width={(stripH - 8) * TILE_ASPECT * 0.75}
                  height={stripH - 8}
                />
              ))}
            </div>
          )}
        </div>
      );
    } else {
      // Up to twelve people fit one screen at a cap of twelve; tiles shrink instead of paging.
      const layout = computeOptimalGrid(tracks.length, dims.w, dims.h);
      body = (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexWrap: "wrap",
            alignContent: "center",
            justifyContent: "center",
            gap: GRID_GAP,
          }}
        >
          <AnimatePresence initial={false}>
            {tracks.map((ref) => (
              <motion.div
                key={ref.participant.identity}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ type: "spring", stiffness: 300, damping: 26 }}
              >
                <ParticipantTile {...tileProps(ref)} width={layout.tileW} height={layout.tileH} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      );
    }
  }

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%", overflow: "hidden" }}>
      {body}
    </div>
  );
}

function ParticipantTile({
  trackRef,
  avatar,
  width,
  height,
  inCubicle,
  isMe,
  pinned = false,
  phase,
  actions,
}: {
  trackRef: TrackReferenceOrPlaceholder;
  avatar: string | null;
  width: number;
  height: number;
  inCubicle: boolean;
  isMe: boolean;
  pinned?: boolean;
  phase: SessionPhase;
  actions: TileActions;
}) {
  const { colors, radii } = useTokens();
  const p = trackRef.participant;
  const [menuOpen, setMenuOpen] = useState(false);
  const lastTap = useRef(0);
  const hasVideo = isTrackReference(trackRef) && !!trackRef.publication.track && !trackRef.publication.isMuted;
  // During focus everyone is muted, so a mic icon would only be noise. It means something at the break.
  const showMuted = phase === "break" && !p.isMicrophoneEnabled;

  function onClick() {
    const now = Date.now();
    if (now - lastTap.current < DOUBLE_TAP_MS) {
      if (!isMe) actions.onCubicle(p.identity);
      lastTap.current = 0;
    } else lastTap.current = now;
  }

  const ring = p.isSpeaking ? colors.tint.success : inCubicle || pinned ? colors.surface.skillhive : colors.border.subtle;
  const avatarSize = Math.max(40, Math.min(112, height * 0.36));

  return (
    <div
      onClick={onClick}
      style={{
        width,
        height,
        position: "relative",
        overflow: "hidden",
        flexShrink: 0,
        cursor: "pointer",
        borderRadius: radii.lg,
        background: colors.surface.secondary,
        boxShadow: `inset 0 0 0 ${p.isSpeaking || inCubicle || pinned ? 2 : 1}px ${ring}`,
        opacity: inCubicle && !isMe ? 0.55 : 1,
        transition: "opacity var(--dur-move) var(--ease-ui), box-shadow var(--dur-hover) var(--ease-ui)",
      }}
    >
      {hasVideo && isTrackReference(trackRef) ? (
        <VideoTrack
          trackRef={trackRef}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 0 }}
        />
      ) : (
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
          <Avatar source={avatar} name={p.identity} size={avatarSize} />
        </div>
      )}

      <div
        style={{
          position: "absolute",
          left: 8,
          bottom: 8,
          right: 44,
          display: "flex",
          alignItems: "center",
          gap: 6,
          zIndex: 1,
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            maxWidth: "100%",
            padding: "3px 8px",
            borderRadius: radii.pill,
            background: "rgba(0,0,0,0.45)",
            backdropFilter: "blur(6px)",
            color: "#fff",
            fontSize: 12,
            fontWeight: 600,
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
          }}
        >
          {inCubicle && <Hexagon size={11} aria-label="In a cubicle" />}
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{p.identity}</span>
          {showMuted && <MicOff size={11} aria-label="Muted" style={{ opacity: 0.7, flexShrink: 0 }} />}
          {p.isSpeaking && <SpeakingBars color={colors.tint.success} />}
        </span>
      </div>

      <button
        type="button"
        aria-label={`Options for ${p.identity}`}
        className="ui-press"
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen(true);
        }}
        style={{
          position: "absolute",
          top: 6,
          right: 6,
          width: 30,
          height: 30,
          borderRadius: radii.pill,
          border: "none",
          display: "grid",
          placeItems: "center",
          background: "rgba(0,0,0,0.4)",
          color: "#fff",
          cursor: "pointer",
          zIndex: 1,
        }}
      >
        <MoreHorizontal size={16} />
      </button>

      <TileMenu
        open={menuOpen}
        identity={p.identity}
        avatar={avatar}
        pinned={pinned}
        onClose={() => setMenuOpen(false)}
        onPin={() => {
          setMenuOpen(false);
          if (pinned) actions.onUnpin();
          else actions.onPin(p.identity);
        }}
        onCubicle={
          isMe
            ? undefined
            : () => {
                setMenuOpen(false);
                actions.onCubicle(p.identity, true);
              }
        }
      />
    </div>
  );
}

function TileMenu({
  open,
  identity,
  avatar,
  pinned,
  onClose,
  onPin,
  onCubicle,
}: {
  open: boolean;
  identity: string;
  avatar: string | null;
  pinned: boolean;
  onClose: () => void;
  onPin: () => void;
  onCubicle?: () => void;
}) {
  const { colors, radii, spacing } = useTokens();
  useEscape(open, onClose);
  const item: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: spacing.md,
    width: "100%",
    padding: `${spacing.md}px ${spacing.base}px`,
    border: "none",
    borderRadius: radii.md,
    background: "transparent",
    color: colors.text.primary,
    fontSize: 15,
    fontWeight: 600,
    textAlign: "left",
    cursor: "pointer",
    fontFamily: "inherit",
  };
  // Portalled: a tile is clipped and transformed, which would trap a fixed sheet inside it.
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
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
            aria-label={identity}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 420,
              margin: `0 ${spacing.sm}px ${spacing.sm}px`,
              padding: spacing.sm,
              borderRadius: radii.xxl,
              background: colors.bg.muted,
              border: `1px solid ${colors.border.subtle}`,
              boxSizing: "border-box",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: spacing.md, padding: `${spacing.md}px ${spacing.base}px` }}>
              <Avatar source={avatar} name={identity} size={36} />
              <span style={{ fontSize: 16, fontWeight: 700, color: colors.text.primary, overflow: "hidden", textOverflow: "ellipsis" }}>
                {identity}
              </span>
            </div>
            <button type="button" className="ui-press" style={item} onClick={onPin}>
              {pinned ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              {pinned ? "Unpin" : "Pin"}
            </button>
            {onCubicle && (
              <button type="button" className="ui-press" style={item} onClick={onCubicle}>
                <Hexagon size={18} />
                Cubicle
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export function SpeakingBars({ color }: { color: string }) {
  return (
    <span aria-label="Speaking" style={{ display: "inline-flex", alignItems: "flex-end", gap: 2, flexShrink: 0 }}>
      {[7, 11, 7].map((h, i) => (
        <span key={i} style={{ width: 2, height: h, borderRadius: 1, background: color }} />
      ))}
    </span>
  );
}
