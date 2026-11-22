import { useEffect, useRef, useState } from "react";
import { useLocalParticipant, useTracks, VideoTrack } from "@livekit/components-react";
import type { TrackReference } from "@livekit/components-react";
import { Track } from "livekit-client";
import { Hexagon } from "lucide-react";
import { Button } from "@skillhiive/ui";
import { useTokens } from "@/theme";
import { Avatar } from "@/components/ui/Avatar";
import { useAvatars } from "@/hooks/useAvatars";
import { clockLabel, MONO } from "@/lib/room";
import { SpeakingBars } from "./RoomTiles";

/** A private two-person room on top of the main one. Rendered inside the cubicle's LiveKitRoom. */
export function CubicleOverlay({ partnerIdentity, onEnd }: { partnerIdentity: string; onEnd: () => void }) {
  const allTracks = useTracks([Track.Source.Camera]);
  const { localParticipant } = useLocalParticipant();
  const avatars = useAvatars([partnerIdentity]);
  const [elapsed, setElapsed] = useState(0);
  const [myTrackRef, setMyTrackRef] = useState<TrackReference | null>(null);
  const [myTrackSid, setMyTrackSid] = useState<string | null>(null);
  const [partnerReady, setPartnerReady] = useState(false);
  const lpRef = useRef(localParticipant);
  const partnerReadyRef = useRef(false);
  const { colors, radii, spacing } = useTokens();

  useEffect(() => {
    lpRef.current = localParticipant;
  }, [localParticipant]);
  useEffect(() => {
    const iv = setInterval(() => setElapsed((n) => n + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (!localParticipant) return;
    function sync() {
      const lp = lpRef.current;
      if (!lp) return;
      const pub = lp.getTrackPublication(Track.Source.Camera);
      if (pub?.track && pub.trackSid) {
        const ref: TrackReference = { participant: lp, publication: pub, source: Track.Source.Camera };
        setMyTrackSid((prev) => {
          if (prev !== pub.trackSid) {
            setMyTrackRef(ref);
            return pub.trackSid ?? null;
          }
          return prev;
        });
      } else {
        setMyTrackRef(null);
        setMyTrackSid(null);
      }
    }
    sync();
    localParticipant.on("trackPublished", sync);
    localParticipant.on("trackUnpublished", sync);
    localParticipant.on("localTrackPublished", sync);
    localParticipant.on("trackSubscribed", sync);
    return () => {
      localParticipant.off("trackPublished", sync);
      localParticipant.off("trackUnpublished", sync);
      localParticipant.off("localTrackPublished", sync);
      localParticipant.off("trackSubscribed", sync);
    };
  }, [localParticipant]);

  useEffect(() => {
    const lp = lpRef.current;
    if (!lp) return;
    const pub = lp.getTrackPublication(Track.Source.Camera);
    if (pub?.track && pub.trackSid && pub.trackSid !== myTrackSid) {
      setMyTrackRef({ participant: lp, publication: pub, source: Track.Source.Camera });
      setMyTrackSid(pub.trackSid ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTracks]);

  const partnerTrack = allTracks.find((t) => t.participant.identity === partnerIdentity);
  useEffect(() => {
    if (partnerTrack && !partnerReadyRef.current) {
      const t = setTimeout(() => {
        partnerReadyRef.current = true;
        setPartnerReady(true);
      }, 300);
      return () => clearTimeout(t);
    }
    if (!partnerTrack) partnerReadyRef.current = false;
  }, [partnerTrack]);
  // Their video shows once it has had a moment to start, and hides the moment it goes.
  const showPartner = partnerReady && !!partnerTrack;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1100, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div style={{ position: "absolute", inset: 0, background: colors.overlay.scrim }} />

      <div
        role="dialog"
        aria-label={`Cubicle with ${partnerIdentity}`}
        className="ui-rise"
        style={{
          position: "relative",
          height: "64dvh",
          margin: `0 ${spacing.sm}px ${spacing.sm}px`,
          borderRadius: radii.xxl,
          overflow: "hidden",
          background: colors.surface.sunken,
          border: `1px solid ${colors.border.subtle}`,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: spacing.sm,
            padding: `${spacing.sm}px ${spacing.sm}px ${spacing.sm}px ${spacing.base}px`,
            background: colors.surface.primary,
            borderBottom: `1px solid ${colors.border.subtle}`,
            flexShrink: 0,
          }}
        >
          <Hexagon size={16} color={colors.text.skillhive} aria-hidden="true" />
          <span style={{ fontWeight: 700, fontSize: 15, color: colors.text.primary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {partnerIdentity}
          </span>
          <span style={{ fontFamily: MONO, fontSize: 12, color: colors.text.tertiary, fontVariantNumeric: "tabular-nums" }}>
            {clockLabel(elapsed)}
          </span>
          {partnerTrack?.participant.isSpeaking && <SpeakingBars color={colors.tint.success} />}
          <div style={{ marginLeft: "auto" }}>
            <Button label="End" size="sm" variant="secondary" onClick={onEnd} />
          </div>
        </div>

        <div style={{ flex: 1, position: "relative" }}>
          <div style={{ position: "absolute", inset: 0, opacity: showPartner ? 1 : 0, transition: "opacity var(--dur-sheet) var(--ease-ui)" }}>
            {partnerTrack && (
              <VideoTrack
                key={partnerTrack.publication.trackSid}
                trackRef={partnerTrack}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            )}
          </div>

          {!showPartner && (
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
              <Avatar source={avatars.get(partnerIdentity) ?? null} name={partnerIdentity} size={96} />
            </div>
          )}

          {myTrackRef && myTrackSid && (
            <div
              style={{
                position: "absolute",
                bottom: 12,
                right: 12,
                width: 96,
                height: 128,
                borderRadius: radii.md,
                overflow: "hidden",
                boxShadow: `0 0 0 2px ${localParticipant?.isSpeaking ? colors.tint.success : colors.border.strong}`,
              }}
            >
              <VideoTrack key={myTrackSid} trackRef={myTrackRef} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
