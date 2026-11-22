import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
import { Room, RoomEvent, Track, VideoPresets } from "livekit-client";
import type { Participant, RemoteParticipant, RoomOptions } from "livekit-client";
import { useLocation, useNavigate } from "react-router";
import { ChevronDown, Hexagon, WifiOff, X } from "lucide-react";
import { Button, Text } from "@skillhiive/ui";
import { useProfile } from "@/hooks/useProfile";
import { useRoomPresence } from "@/hooks/useRoomPresence";
import { useRoomSession } from "@/hooks/useRoomSession";
import { useActiveRooms } from "@/hooks/useActiveRooms";
import { useDocumentPip } from "@/hooks/useDocumentPip";
import type { RoomCallRequest } from "@/hooks/roomCall";
import { supabase } from "@/lib/supabase";
import { useTokens } from "@/theme/useTokens";
import { errorMessage } from "@/lib/errors";
import { useConfirm } from "@/lib/confirm";
import { fetchMyProjects, queueSession, saveNote, type Project } from "@/lib/todayData";
import { formatDuration } from "@/lib/timeTracker";
import { CAPTION_MAX } from "@/lib/posts";
import {
  clockLabel,
  clockOffset,
  CUBICLE_TOPIC,
  decodeCubicleMessage,
  encodeCubicleMessage,
  focusSecondsBetween,
  lastClockOffset,
  MIN_SAVED_FOCUS_SECONDS,
  MONO,
  rememberClockOffset,
  ROOM_CAP,
  serverNow,
  type CubicleMessage,
} from "@/lib/room";
import { ConferenceView } from "./RoomTiles";
import { ControlBar, PeopleSheet, RoomClock, type OutputDevice } from "./RoomChrome";
import { CubicleOverlay } from "./CubicleOverlay";
import { LeaveSheet, type LeaveDraft } from "./LeaveSheet";
import { RoomMini } from "./RoomMini";
import { PipPortal } from "./PipPortal";

const LIVEKIT_URL = "wss://rooms.skillhiive.com";
const TOKEN_ENDPOINT = "https://api.skillhivelabs.com/getToken";
const CUBICLE_ENDPOINT = "https://api.skillhivelabs.com/cubicle";
const NOTICE_MS = 6000;
/** An unanswered cubicle request is withdrawn after this long. */
const CUBICLE_REQUEST_TIMEOUT_MS = 30_000;
const TOKEN_FETCH_MAX_ATTEMPTS = 4;
const MAX_AUTO_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 3000;

/** The token server turned us away: the room is at its cap. Not worth retrying. */
class RoomFullError extends Error {}
/** The token server said no for a reason a retry won't change (bad name, signed out, not allowed). */
class TokenRefusedError extends Error {}

type CubicleState =
  | { status: "idle" }
  | { status: "requesting"; targetIdentity: string; since: number }
  | { status: "incoming"; fromIdentity: string; cubicleRoomName: string }
  | { status: "active"; partnerIdentity: string; cubicleRoomName: string };

function refusalMessage(status: number): string {
  if (status === 401) return "Sign in again to join.";
  if (status === 403) return "You can't join this room.";
  return "This room name doesn't work. Open a new room.";
}

/** Speakers this browser can switch between. Empty where the browser can't pick an output. */
function useAudioOutputs() {
  const [devices, setDevices] = useState<OutputDevice[]>([]);
  const [activeId, setActiveId] = useState("default");

  useEffect(() => {
    const md = typeof navigator === "undefined" ? undefined : navigator.mediaDevices;
    const canPick = typeof HTMLMediaElement !== "undefined" && "setSinkId" in HTMLMediaElement.prototype;
    if (!md?.enumerateDevices || !canPick) return;
    const load = () =>
      md
        .enumerateDevices()
        .then((all) =>
          setDevices(
            all
              .filter((d) => d.kind === "audiooutput" && d.deviceId)
              .map((d, i) => ({ id: d.deviceId, name: d.label || `Speaker ${i + 1}` })),
          ),
        )
        .catch(() => {});
    void load();
    md.addEventListener?.("devicechange", load);
    return () => md.removeEventListener?.("devicechange", load);
  }, []);

  return { devices, activeId, setActiveId };
}

/**
 * One live room, mounted above the routes so it keeps running while you use the rest of the app.
 * On its own page it fills the screen; elsewhere it floats; with the tab hidden it pops out.
 */
export function RoomCall({ request, onEnded }: { request: RoomCallRequest; onEnded: () => void }) {
  const { roomName, withCam: joinWithCam, frontCam: joinWithFrontCam } = request;
  const taskText = request.task?.text ?? null;
  const { profile } = useProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const full = decodeURIComponent(location.pathname).replace(/\/+$/, "") === `/rooms/${roomName}`;
  const fullRef = useRef(full);
  useEffect(() => {
    fullRef.current = full;
  });

  /** The call is over: forget it, and leave the room page if that's where we are. */
  const onLeave = useCallback(
    (draft?: string) => {
      onEnded();
      // Posting what shipped is your own act: the Floor's composer opens with it, nothing more.
      if (draft) navigate("/feed", { state: { draft } });
      else if (fullRef.current) navigate("/rooms");
    },
    [navigate, onEnded],
  );

  const [token, setToken] = useState<string | null>(null);
  const [livekitReady, setLivekitReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const [connectionLost, setConnectionLost] = useState(false);
  const [retryTick, setRetryTick] = useState(0);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [micEnabled, setMicEnabled] = useState(false);
  const [camEnabled, setCamEnabled] = useState(false);
  const [isFrontCam, setIsFrontCam] = useState(true);
  const [canFlip, setCanFlip] = useState(false);
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [pinnedIdentity, setPinnedIdentity] = useState<string | null>(null);
  const [cubicle, setCubicle] = useState<CubicleState>({ status: "idle" });
  const [cubicleToken, setCubicleToken] = useState<string | null>(null);
  const [cubicleSet, setCubicleSet] = useState<Set<string>>(new Set());
  const [clockOffsetMs, setClockOffsetMs] = useState(lastClockOffset);
  const [roomFull, setRoomFull] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [leaveDraft, setLeaveDraft] = useState<LeaveDraft | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  // True once we are actually inside the LiveKit room; presence is only written from then on.
  const [joined, setJoined] = useState(false);

  const intentionalLeaveRef = useRef(false);
  const connectedRef = useRef(false);
  const micEnabledRef = useRef(false);
  const camEnabledRef = useRef(false);
  const syncRef = useRef<(() => void) | null>(null);
  const roomRef = useRef<Room | null>(null);
  const cubicleRoomRef = useRef<Room | null>(null);
  // The token the server gave us when it created a cubicle, held until the other person accepts.
  const pendingCubicleRef = useRef<{ cubicleRoomName: string; token: string } | null>(null);
  const handleCubicleMessageRef = useRef<(sender: string, message: CubicleMessage) => void>(() => {});
  const cancelCubicleRequestRef = useRef<() => void>(() => {});
  // Bumped whenever a request is made or withdrawn, so a late server answer can tell it is stale.
  const cubicleRequestSeqRef = useRef(0);
  const cubicleJoinCancelledRef = useRef(false);
  const cubicleRef = useRef<CubicleState>({ status: "idle" });
  const shownCubicleAlertRef = useRef<string | null>(null);
  const inviteDialogRef = useRef<AbortController | null>(null);
  const prevPhaseRef = useRef<string>("waiting");
  const reconnectAttemptRef = useRef(0);

  const { colors, radii, spacing } = useTokens();
  const confirm = useConfirm();

  // Only someone who is in the room shows up in the rooms list (and starts its clock); a failed
  // join, an error screen or leaving takes the row away again.
  useRoomPresence(joined && !error ? roomName : undefined, () => {
    intentionalLeaveRef.current = true;
    setError("Couldn't join the room. Try again.");
  });
  const { phaseState, sessionStartedAt } = useRoomSession(roomName, clockOffsetMs);
  // The lobby's numbers, before joining and while waiting for a seat.
  const { rooms, loading: roomsLoading } = useActiveRooms(roomFull);
  const listed = rooms.find((r) => r.room_name === roomName) ?? null;
  const seatOpen = roomFull && !roomsLoading && (!listed || listed.participant_count < ROOM_CAP);
  const outputs = useAudioOutputs();

  // ── Focus time ─────────────────────────────────────────────────────────────
  // Counted from when we connected (or last saved) to now, on the room's clock: focus only.
  const segmentStartRef = useRef<number | null>(null);
  const sessionStartedAtRef = useRef<string | null>(null);
  const offsetRef = useRef(clockOffsetMs);
  const phaseRef = useRef(phaseState.phase);
  const userIdRef = useRef<string | null>(null);
  useEffect(() => {
    sessionStartedAtRef.current = sessionStartedAt;
    offsetRef.current = clockOffsetMs;
    phaseRef.current = phaseState.phase;
    userIdRef.current = profile?.id ?? null;
  });

  const unsavedFocusSeconds = useCallback(() => {
    const from = segmentStartRef.current;
    if (from === null) return 0;
    return focusSecondsBetween(sessionStartedAtRef.current, from, serverNow(offsetRef.current));
  }, []);

  /**
   * Save the focus time not yet saved. Synchronous, so it also works while the page goes away.
   * `end` stops counting (leaving, a lost connection); otherwise counting carries on from now.
   */
  const persistFocus = useCallback(
    (opts: { end: boolean; projectId?: string | null; shipped?: string }) => {
      const seconds = unsavedFocusSeconds();
      const userId = userIdRef.current;
      const now = serverNow(offsetRef.current);
      segmentStartRef.current = opts.end ? null : segmentStartRef.current === null ? null : now;
      if (!userId || seconds < MIN_SAVED_FOCUS_SECONDS) return;
      const shipped = opts.shipped?.trim() ?? "";
      queueSession(userId, {
        duration_seconds: seconds,
        // Left before the block ran out: a partial session, still counted.
        interrupted: phaseRef.current === "focus",
        task_text: shipped || taskText || roomName,
        project_id: opts.projectId || null,
      });
      if (shipped) {
        void saveNote({
          ritual_type: "checkout",
          body: shipped,
          actual_min: Math.round(seconds / 60),
          project_id: opts.projectId || null,
        });
      }
    },
    [roomName, taskText, unsavedFocusSeconds],
  );

  // Closing the tab or navigating away still keeps the time.
  useEffect(() => {
    const onHide = () => persistFocus({ end: true });
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      persistFocus({ end: true });
    };
  }, [persistFocus]);

  useEffect(() => {
    cubicleRef.current = cubicle;
  }, [cubicle]);

  useEffect(() => {
    if (prevPhaseRef.current === "break" && phaseState.phase === "focus") {
      const lp = roomRef.current?.localParticipant;
      if (lp) {
        lp.setMicrophoneEnabled(false)
          .then(() => {
            micEnabledRef.current = lp.isMicrophoneEnabled;
            setMicEnabled(lp.isMicrophoneEnabled);
          })
          .catch(() => {});
      }
    }
    prevPhaseRef.current = phaseState.phase;
  }, [phaseState.phase]);

  useEffect(() => {
    if (!profile?.username) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      setRoomFull(false);
      try {
        await fetchToken();
        if (!cancelled) setLivekitReady(true);
      } catch (e) {
        if (!cancelled) {
          if (e instanceof RoomFullError) setRoomFull(true);
          setError(errorMessage(e) ?? "Couldn't reach the room server.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.username, retryTick]);

  useEffect(() => {
    if (!livekitReady || !token) return;
    connectedRef.current = false;

    const delay = BASE_RETRY_DELAY_MS * Math.pow(2, reconnectAttemptRef.current);
    const t = setTimeout(() => {
      if (connectedRef.current) return;
      if (reconnectAttemptRef.current < MAX_AUTO_RETRIES) {
        reconnectAttemptRef.current += 1;
        setReconnecting(true);
        setToken(null);
        setLivekitReady(false);
        setError(null);
        setRetryTick((x) => x + 1);
      } else {
        setError("Couldn't connect to the room.");
        setReconnecting(false);
      }
    }, delay);

    return () => clearTimeout(t);
  }, [livekitReady, token, retryTick]);

  async function resolveSession() {
    for (let i = 0; i < 12; i++) {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) return session;
      await new Promise((r) => setTimeout(r, 500));
    }
    return null;
  }

  /** POST JSON to the token server as the signed-in user. */
  async function authedPost(url: string, body: unknown): Promise<Response> {
    const session = await resolveSession();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (session) headers["Authorization"] = `Bearer ${session.access_token}`;
    return fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  }

  async function fetchToken() {
    if (!profile?.username) throw new Error("Profile not ready");

    let lastErr: unknown = null;
    for (let attempt = 0; attempt < TOKEN_FETCH_MAX_ATTEMPTS; attempt++) {
      try {
        const sentAt = Date.now();
        const res = await authedPost(TOKEN_ENDPOINT, { room: roomName });
        const receivedAt = Date.now();
        if (res.status === 409) throw new RoomFullError("This room is full.");
        // A 4xx answer won't change on a retry; only network errors and 5xx are worth another go.
        if (res.status >= 400 && res.status < 500) throw new TokenRefusedError(refusalMessage(res.status));
        if (!res.ok) throw new Error(`Token server error: ${res.status}`);
        const data = await res.json();
        if (!data.token) throw new Error("No token received");
        // Keep the phase clock on the server's time, not this computer's.
        if (typeof data.serverTime === "number") {
          const offset = clockOffset(sentAt, receivedAt, data.serverTime);
          setClockOffsetMs(offset);
          rememberClockOffset(offset);
        }
        setToken(data.token);
        return;
      } catch (err) {
        if (err instanceof RoomFullError || err instanceof TokenRefusedError) throw err;
        lastErr = err;
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      }
    }
    console.error("Failed to fetch token:", lastErr);
    throw new Error("Couldn't reach the room server.");
  }

  /** The invited person's token for a cubicle the server created for them. */
  async function fetchCubicleToken(cubicleRoomName: string): Promise<string> {
    const res = await authedPost(TOKEN_ENDPOINT, { room: cubicleRoomName });
    if (!res.ok) throw new Error(res.status === 403 ? "That cubicle isn't for you." : `Cubicle token error: ${res.status}`);
    const data = await res.json();
    if (!data.token) throw new Error("No cubicle token received");
    return data.token as string;
  }

  /** Ask the server for a private room with `target`; it names the room and issues our token. */
  async function createCubicleOnServer(target: string): Promise<{ cubicleRoomName: string; token: string }> {
    const res = await authedPost(CUBICLE_ENDPOINT, { room: roomName, target });
    if (res.status === 403) throw new Error(`${target} is no longer in the room.`);
    if (!res.ok) throw new Error(`Cubicle error: ${res.status}`);
    const data = await res.json();
    if (!data.cubicleRoomName || !data.token) throw new Error("No cubicle received");
    return { cubicleRoomName: data.cubicleRoomName as string, token: data.token as string };
  }

  /** Cubicle messages travel as LiveKit data messages addressed to one person. */
  async function sendCubicleMessage(target: string, message: CubicleMessage) {
    const lp = roomRef.current?.localParticipant;
    if (!lp) return;
    try {
      await lp.publishData(encodeCubicleMessage(message), {
        reliable: true,
        destinationIdentities: [target],
        topic: CUBICLE_TOPIC,
      });
    } catch {
      setNotice(`Couldn't reach ${target}.`);
    }
  }

  function forgetCubicleParticipants(...names: (string | null | undefined)[]) {
    setCubicleSet((p) => {
      const s = new Set(p);
      for (const name of names) if (name) s.delete(name);
      return s;
    });
  }

  async function sendCubicleRequest(targetIdentity: string) {
    if (!profile?.username) return;
    if (cubicleRef.current.status !== "idle") {
      setNotice("End your current cubicle first.");
      return;
    }
    cubicleJoinCancelledRef.current = false;
    const seq = ++cubicleRequestSeqRef.current;
    const requesting: CubicleState = { status: "requesting", targetIdentity, since: Date.now() };
    cubicleRef.current = requesting;
    setCubicle(requesting);
    try {
      const made = await createCubicleOnServer(targetIdentity);
      // Withdrawn (cancelled or timed out) while the server was answering.
      if (seq !== cubicleRequestSeqRef.current) return;
      pendingCubicleRef.current = made;
      // The cubicle badges appear once they accept (joinCubicleRoom), not before.
      await sendCubicleMessage(targetIdentity, { event: "request", cubicleRoomName: made.cubicleRoomName });
    } catch (e) {
      if (seq !== cubicleRequestSeqRef.current) return;
      pendingCubicleRef.current = null;
      cubicleRef.current = { status: "idle" };
      setCubicle({ status: "idle" });
      setNotice(errorMessage(e) ?? "Couldn't open a cubicle.");
    }
  }

  /** Withdraw our unanswered request (the cancel button, or the timeout). */
  function cancelCubicleRequest() {
    const cur = cubicleRef.current;
    if (cur.status !== "requesting") return;
    cubicleRequestSeqRef.current++;
    const invited = pendingCubicleRef.current !== null;
    pendingCubicleRef.current = null;
    cubicleRef.current = { status: "idle" };
    setCubicle({ status: "idle" });
    // "end" closes their invite, or their side of the cubicle if they accepted at the same moment.
    if (invited) void sendCubicleMessage(cur.targetIdentity, { event: "end" });
  }

  /** A double-tap asks first; the tile menu's "Cubicle" is already a deliberate choice. */
  async function requestCubicle(targetIdentity: string, confirmed = false) {
    if (!confirmed && cubicleRef.current.status === "idle") {
      const ok = await confirm({
        title: `Cubicle with ${targetIdentity}?`,
        confirmLabel: "Invite",
        tone: "neutral",
      });
      if (!ok) return;
    }
    await sendCubicleRequest(targetIdentity);
  }

  async function acceptCubicle() {
    const cur = cubicleRef.current;
    if (cur.status !== "incoming") return;
    const { fromIdentity, cubicleRoomName } = cur;
    cubicleJoinCancelledRef.current = false;
    try {
      // Get our own token first, so the other side only joins once we can.
      const cToken = await fetchCubicleToken(cubicleRoomName);
      await sendCubicleMessage(fromIdentity, { event: "accept", cubicleRoomName });
      await joinCubicleRoom(cubicleRoomName, fromIdentity, cToken);
    } catch (e) {
      setCubicle({ status: "idle" });
      setNotice(errorMessage(e) ?? "Couldn't join the cubicle.");
      await sendCubicleMessage(fromIdentity, { event: "decline" });
    }
  }

  async function declineCubicle() {
    const cur = cubicleRef.current;
    if (cur.status !== "incoming") return;
    const { fromIdentity } = cur;
    cubicleJoinCancelledRef.current = true;
    await sendCubicleMessage(fromIdentity, { event: "decline" });
    setCubicle({ status: "idle" });
    forgetCubicleParticipants(profile?.username, fromIdentity);
  }

  async function joinCubicleRoom(cubicleRoomName: string, partnerIdentity: string, cToken: string) {
    try {
      await roomRef.current?.localParticipant.setMicrophoneEnabled(false);
      await roomRef.current?.localParticipant.setCameraEnabled(false);
      if (cubicleJoinCancelledRef.current) {
        await roomRef.current?.localParticipant.setMicrophoneEnabled(micEnabledRef.current);
        await roomRef.current?.localParticipant.setCameraEnabled(camEnabledRef.current);
        return;
      }
      setCubicleToken(cToken);
      setCubicle({ status: "active", partnerIdentity, cubicleRoomName });
      setCubicleSet((p) => new Set(p).add(profile?.username ?? "").add(partnerIdentity));
    } catch (e) {
      setNotice(`Cubicle error: ${errorMessage(e) ?? "unknown"}`);
      setCubicle({ status: "idle" });
      await roomRef.current?.localParticipant.setMicrophoneEnabled(micEnabledRef.current);
      await roomRef.current?.localParticipant.setCameraEnabled(camEnabledRef.current);
    }
  }

  async function endCubicle() {
    const cur = cubicleRef.current;
    if (cur.status !== "active") return;
    await sendCubicleMessage(cur.partnerIdentity, { event: "end" });
    void endCubicleLocal(cur.partnerIdentity);
  }

  async function endCubicleLocal(partnerIdentity: string) {
    const cub = cubicleRoomRef.current;
    cubicleRoomRef.current = null;
    if (cub) await cub.disconnect();
    setCubicleToken(null);
    setCubicle({ status: "idle" });
    setCubicleSet((p) => {
      const s = new Set(p);
      s.delete(profile?.username ?? "");
      s.delete(partnerIdentity);
      return s;
    });
    const main = roomRef.current;
    if (main && main.state === "connected") {
      await main.localParticipant.setMicrophoneEnabled(micEnabledRef.current);
      await main.localParticipant.setCameraEnabled(camEnabledRef.current);
      micEnabledRef.current = main.localParticipant.isMicrophoneEnabled;
      camEnabledRef.current = main.localParticipant.isCameraEnabled;
      setMicEnabled(micEnabledRef.current);
      setCamEnabled(camEnabledRef.current);
    }
  }

  const room = useMemo(() => {
    const r = new Room({
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: { resolution: VideoPresets.h720, facingMode: "user" },
    } as RoomOptions);
    roomRef.current = r;
    return r;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryTick]);

  // `sender` is the authenticated LiveKit identity the message arrived from, never a field in it.
  function handleCubicleMessage(sender: string, message: CubicleMessage) {
    const cur = cubicleRef.current;
    switch (message.event) {
      case "request":
        if (cur.status !== "idle" || !message.cubicleRoomName) return;
        setCubicle({ status: "incoming", fromIdentity: sender, cubicleRoomName: message.cubicleRoomName });
        return;
      case "accept": {
        if (cur.status !== "requesting" || cur.targetIdentity !== sender) return;
        const pending = pendingCubicleRef.current;
        if (!pending) return;
        pendingCubicleRef.current = null;
        void joinCubicleRoom(pending.cubicleRoomName, sender, pending.token);
        return;
      }
      case "decline":
        if (cur.status !== "requesting" || cur.targetIdentity !== sender) return;
        cubicleJoinCancelledRef.current = true;
        pendingCubicleRef.current = null;
        setCubicle({ status: "idle" });
        forgetCubicleParticipants(profile?.username, sender);
        setNotice(`${sender} declined.`);
        return;
      case "end":
        if (cur.status === "incoming" && cur.fromIdentity === sender) {
          // They withdrew the invite (or it timed out) before we answered.
          cubicleJoinCancelledRef.current = true;
          cubicleRef.current = { status: "idle" };
          setCubicle({ status: "idle" });
          return;
        }
        if (cur.status !== "active" || cur.partnerIdentity !== sender) return;
        void endCubicleLocal(sender);
        return;
    }
  }

  useEffect(() => {
    handleCubicleMessageRef.current = handleCubicleMessage;
    cancelCubicleRequestRef.current = cancelCubicleRequest;
  });

  useEffect(() => {
    if (cubicle.status !== "requesting") return;
    const t = setTimeout(() => cancelCubicleRequestRef.current(), CUBICLE_REQUEST_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [cubicle]);

  useEffect(() => {
    if (!profile?.username) return;
    const onData = (payload: Uint8Array, participant?: RemoteParticipant, _kind?: unknown, topic?: string) => {
      if (topic !== CUBICLE_TOPIC || !participant) return;
      const message = decodeCubicleMessage(payload);
      if (message) handleCubicleMessageRef.current(participant.identity, message);
    };
    room.on(RoomEvent.DataReceived, onData);
    return () => {
      room.off(RoomEvent.DataReceived, onData);
    };
  }, [room, profile?.username]);

  // LiveKit reconnects by itself after a network blip; the room stays on screen with a banner.
  useEffect(() => {
    const lost = () => setConnectionLost(true);
    const back = () => setConnectionLost(false);
    room.on(RoomEvent.Reconnecting, lost);
    room.on(RoomEvent.Reconnected, back);
    return () => {
      room.off(RoomEvent.Reconnecting, lost);
      room.off(RoomEvent.Reconnected, back);
    };
  }, [room]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(t);
  }, [notice]);

  const cubicleRoom = useMemo(() => {
    if (cubicle.status !== "active" || !cubicleToken) return null;
    const r = new Room({
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: { resolution: VideoPresets.h720, facingMode: "user" },
    } as RoomOptions);
    cubicleRoomRef.current = r;
    return r;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cubicleToken]);

  const handleConnected = useCallback(async () => {
    if (connectedRef.current) return;
    connectedRef.current = true;
    reconnectAttemptRef.current = 0;
    setReconnecting(false);
    setConnectionLost(false);
    setJoined(true);
    if (segmentStartRef.current === null) segmentStartRef.current = serverNow(offsetRef.current);
    const r = roomRef.current;
    if (!r) return;

    const sync = () => {
      const rm = roomRef.current;
      if (!rm) return;
      setParticipants([rm.localParticipant, ...Array.from(rm.remoteParticipants.values())]);
      micEnabledRef.current = rm.localParticipant.isMicrophoneEnabled;
      camEnabledRef.current = rm.localParticipant.isCameraEnabled;
      setMicEnabled(micEnabledRef.current);
      setCamEnabled(camEnabledRef.current);
    };
    syncRef.current = sync;

    r.on(RoomEvent.ParticipantConnected, sync);
    r.on(RoomEvent.ParticipantDisconnected, sync);
    r.on(RoomEvent.TrackMuted, sync);
    r.on(RoomEvent.TrackUnmuted, sync);
    r.on(RoomEvent.LocalTrackPublished, sync);
    r.on(RoomEvent.LocalTrackUnpublished, sync);
    r.on(RoomEvent.TrackSubscribed, sync);
    r.on(RoomEvent.TrackUnsubscribed, sync);

    const lp = r.localParticipant;
    try {
      await lp.setMicrophoneEnabled(false);
    } catch {
      // A blocked or missing device is not fatal: the state is read back from lp below.
    }

    if (joinWithCam) {
      let camOk = false;
      for (let i = 0; i < 2 && !camOk; i++) {
        try {
          await lp.setCameraEnabled(true, { facingMode: joinWithFrontCam ? "user" : "environment" });
          camOk = true;
          setIsFrontCam(joinWithFrontCam);
        } catch {
          await new Promise((res) => setTimeout(res, 500));
        }
      }
    } else {
      try {
        await lp.setCameraEnabled(false);
      } catch {
        // Already off or no device; nothing to undo.
      }
    }

    const devices = await navigator.mediaDevices?.enumerateDevices?.().catch(() => []);
    setCanFlip((devices ?? []).filter((d) => d.kind === "videoinput").length > 1);

    micEnabledRef.current = lp.isMicrophoneEnabled;
    camEnabledRef.current = lp.isCameraEnabled;
    setMicEnabled(micEnabledRef.current);
    setCamEnabled(camEnabledRef.current);
    sync();
  }, [joinWithCam, joinWithFrontCam]);

  const handleDisconnected = useCallback(() => {
    const wasConnected = connectedRef.current;
    connectedRef.current = false;
    reconnectAttemptRef.current = 0;
    setReconnecting(false);
    setConnectionLost(false);
    if (intentionalLeaveRef.current || !wasConnected) return;
    // LiveKit gave up reconnecting. Keep the time so far and offer a way back in.
    persistFocus({ end: true });
    setJoined(false);
    setError("Connection lost.");
  }, [persistFocus]);

  async function toggleMic() {
    if (cubicleRef.current.status === "active") return;
    if (!phaseState.micAllowed) {
      setNotice(
        phaseState.phase === "focus" ? `Mic opens in ${clockLabel(phaseState.remainingSeconds)}` : "Mic opens at the break",
      );
      return;
    }
    const lp = roomRef.current?.localParticipant;
    if (!lp) return;
    try {
      await lp.setMicrophoneEnabled(!micEnabledRef.current);
    } catch {
      // A blocked device leaves the mic as it was; the real state is read back just below.
    }
    micEnabledRef.current = lp.isMicrophoneEnabled;
    setMicEnabled(lp.isMicrophoneEnabled);
  }

  async function toggleCam() {
    if (cubicleRef.current.status === "active") return;
    const lp = roomRef.current?.localParticipant;
    if (!lp) return;
    try {
      await lp.setCameraEnabled(!camEnabledRef.current);
    } catch {
      // A blocked device leaves the camera as it was; the real state is read back just below.
    }
    camEnabledRef.current = lp.isCameraEnabled;
    setCamEnabled(lp.isCameraEnabled);
  }

  async function flipCamera() {
    const lp = roomRef.current?.localParticipant;
    if (!lp) return;
    const nextFront = !isFrontCam;
    try {
      const pub = lp.getTrackPublication(Track.Source.Camera);
      if (pub?.track) await lp.unpublishTrack(pub.track);
      await lp.setCameraEnabled(true, { facingMode: nextFront ? "user" : "environment" });
      setIsFrontCam(nextFront);
      camEnabledRef.current = lp.isCameraEnabled;
      setCamEnabled(lp.isCameraEnabled);
    } catch (e) {
      setNotice(`Couldn't switch the camera: ${errorMessage(e) ?? "unknown error"}`);
    }
  }

  async function selectOutput(id: string) {
    try {
      await roomRef.current?.switchActiveDevice("audiooutput", id);
      outputs.setActiveId(id);
    } catch {
      setNotice("Couldn't switch the speaker.");
    }
  }

  /** Disconnect and go back to the rooms list. The focus time is already saved by then. */
  async function disconnectAndGo(draft?: string) {
    intentionalLeaveRef.current = true;
    segmentStartRef.current = null;
    if (cubicleRef.current.status === "active") await endCubicle();
    const sync = syncRef.current;
    const r = roomRef.current;
    if (sync && r) {
      r.off(RoomEvent.ParticipantConnected, sync);
      r.off(RoomEvent.ParticipantDisconnected, sync);
      r.off(RoomEvent.TrackMuted, sync);
      r.off(RoomEvent.TrackUnmuted, sync);
      r.off(RoomEvent.LocalTrackPublished, sync);
      r.off(RoomEvent.LocalTrackUnpublished, sync);
      r.off(RoomEvent.TrackSubscribed, sync);
      r.off(RoomEvent.TrackUnsubscribed, sync);
      syncRef.current = null;
    }
    await r?.disconnect();
    onLeave(draft);
  }

  /** Leave asks only when there is focus time to save; a quick visit just leaves. */
  function requestLeave() {
    const seconds = unsavedFocusSeconds();
    if (seconds < MIN_SAVED_FOCUS_SECONDS) {
      void disconnectAndGo();
      return;
    }
    setLeaveDraft({ focusSeconds: seconds, people: participants.length, shipped: taskText ?? "", projectId: "" });
    void fetchMyProjects().then(setProjects);
  }

  function saveAndLeave(post = false) {
    const draft = leaveDraft;
    const seconds = unsavedFocusSeconds();
    persistFocus({ end: true, projectId: draft?.projectId, shipped: draft?.shipped });
    setLeaveDraft(null);
    const shipped = draft?.shipped.trim() ?? "";
    // The post carries the fact behind it: how long, and in which room.
    const caption = post && shipped ? `${shipped}\n\n${formatDuration(seconds)} in ${roomName}`.slice(0, CAPTION_MAX) : undefined;
    void disconnectAndGo(caption);
  }

  function retry() {
    reconnectAttemptRef.current = 0;
    setReconnecting(false);
    setJoined(false);
    setError(null);
    setRoomFull(false);
    setToken(null);
    setLivekitReady(false);
    setRetryTick((t) => t + 1);
  }

  useEffect(() => {
    if (cubicle.status !== "incoming") {
      shownCubicleAlertRef.current = null;
      // A withdrawn or timed-out invite closes its dialog.
      inviteDialogRef.current?.abort();
      inviteDialogRef.current = null;
      return;
    }
    const key = cubicle.fromIdentity;
    if (shownCubicleAlertRef.current === key) return;
    shownCubicleAlertRef.current = key;
    inviteDialogRef.current?.abort();
    const dialog = new AbortController();
    inviteDialogRef.current = dialog;
    void confirm({
      title: `Cubicle with ${key}?`,
      confirmLabel: "Join",
      tone: "neutral",
      signal: dialog.signal,
    }).then((answer) => {
      // They may have withdrawn the invite while the dialog was open.
      const cur = cubicleRef.current;
      if (cur.status !== "incoming" || cur.fromIdentity !== key) return;
      if (answer) void acceptCubicle();
      else void declineCubicle();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cubicle.status]);

  // Tiles get stable callbacks; the cubicle one always reaches this render's requestCubicle.
  const requestCubicleRef = useRef(requestCubicle);
  useEffect(() => {
    requestCubicleRef.current = requestCubicle;
  });
  const tileActions = useMemo(
    () => ({
      onPin: (id: string) => setPinnedIdentity(id),
      onUnpin: () => setPinnedIdentity(null),
      onCubicle: (id: string, confirmed?: boolean) => void requestCubicleRef.current(id, confirmed),
    }),
    [],
  );

  // Its own window when the tab is hidden (Chrome opens it for calls using the camera or mic),
  // or when the pop out button is pressed. Elsewhere in the app the room floats.
  const pip = useDocumentPip({ autoEnter: joined && !error });

  function expand() {
    if (pip.pipWindow) {
      pip.close();
      window.focus();
    }
    if (!fullRef.current) navigate(`/rooms/${encodeURIComponent(roomName)}`);
  }

  // Minimize: the room shrinks into the corner where the floating window appears, then you're
  // back on the page you came from (the rooms list when the room was opened directly).
  const [minimizing, setMinimizing] = useState(false);
  function minimize() {
    if (minimizing) return;
    setMinimizing(true);
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(() => {
      setMinimizing(false);
      if (location.key !== "default") navigate(-1);
      else navigate("/rooms");
    }, reduce ? 0 : 240);
  }

  /** Leaving from the small views saves the time without asking: there is no room for a sheet. */
  function leaveNow() {
    persistFocus({ end: true });
    pip.close();
    void disconnectAndGo();
  }

  const screen: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    zIndex: 900,
    minHeight: "100dvh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.base,
    padding: spacing.xl,
    background: colors.bg.muted,
    textAlign: "center",
    boxSizing: "border-box",
  };

  if (!full && (loading || reconnecting || error || !token || !livekitReady)) {
    const busy = loading || reconnecting;
    return (
      <div
        role="status"
        className="ui-pop"
        style={{
          position: "fixed",
          right: 16,
          bottom: 16,
          zIndex: 1050,
          display: "flex",
          alignItems: "center",
          gap: spacing.sm,
          maxWidth: "calc(100vw - 32px)",
          padding: `${spacing.sm}px ${spacing.sm}px ${spacing.sm}px ${spacing.base}px`,
          borderRadius: radii.pill,
          background: colors.surface.raised,
          border: `1px solid ${colors.border.strong}`,
          boxShadow: "0 12px 40px rgba(0,0,0,0.3)",
        }}
      >
        <span style={{ fontFamily: MONO, fontSize: 13, color: colors.text.secondary }}>{roomName}</span>
        <Text variant="bodySm" tone="tertiary">
          {busy ? (reconnecting ? "Reconnecting" : "Joining") : roomFull ? "Full" : (error ?? "Disconnected")}
        </Text>
        {!busy && <Button label="Open" size="sm" variant="secondary" onClick={expand} />}
      </div>
    );
  }

  if (loading || reconnecting) {
    return (
      <div style={screen} role="status">
        <div
          aria-hidden="true"
          style={{
            width: 32,
            height: 32,
            border: `3px solid ${colors.border.subtle}`,
            borderTopColor: colors.surface.skillhive,
            borderRadius: "50%",
            animation: "room-spin 0.8s linear infinite",
          }}
        />
        <Text tone="secondary">{reconnecting ? "Reconnecting" : "Joining"}</Text>
        <style>{`@keyframes room-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !token || !livekitReady) {
    return (
      <div style={screen}>
        <Text variant="title" weight={800}>
          {roomName}
        </Text>
        <Text tone="secondary">
          {roomFull ? (seatOpen ? "A seat opened." : `Full, ${ROOM_CAP}/${ROOM_CAP}`) : (error ?? "Couldn't connect to the room.")}
        </Text>
        <div style={{ display: "flex", gap: spacing.sm }}>
          <Button
            label="Rooms"
            variant="secondary"
            onClick={() => {
              intentionalLeaveRef.current = true;
              onLeave();
            }}
          />
          {(!roomFull || seatOpen) && <Button label={roomFull ? "Join" : "Try again"} onClick={retry} />}
        </div>
      </div>
    );
  }

  const inCubicle = cubicle.status === "active";

  return (
    <>
      <LiveKitRoom
        serverUrl={LIVEKIT_URL}
        token={token}
        connect
        room={room}
        onConnected={handleConnected}
        onDisconnected={handleDisconnected}
        onError={(e) => {
          if (!connectedRef.current) {
            console.warn("LiveKit connect error:", e?.message ?? e);
            if (reconnectAttemptRef.current < MAX_AUTO_RETRIES) {
              reconnectAttemptRef.current += 1;
              setReconnecting(true);
              setToken(null);
              setLivekitReady(false);
              setError(null);
              setRetryTick((t) => t + 1);
            } else {
              setError("Couldn't connect to the room.");
              setReconnecting(false);
            }
          }
        }}
        style={{ display: "contents" }}
      >
        {/* Everyone else's voice, wherever in the app the room is showing. */}
        <RoomAudioRenderer />

        {!full && !pip.pipWindow && (
          <RoomMini
            variant="float"
            roomName={roomName}
            myIdentity={profile?.username ?? ""}
            phase={phaseState}
            micEnabled={micEnabled}
            camEnabled={camEnabled}
            micOpen={phaseState.micAllowed && cubicle.status !== "active"}
            count={participants.length}
            onMic={() => void toggleMic()}
            onCam={() => void toggleCam()}
            onExpand={expand}
            onLeave={leaveNow}
            onPopOut={pip.supported ? () => void pip.open() : undefined}
          />
        )}

        {pip.pipWindow && (
          <PipPortal pipWindow={pip.pipWindow}>
            <RoomMini
              variant="window"
              roomName={roomName}
              myIdentity={profile?.username ?? ""}
              phase={phaseState}
              micEnabled={micEnabled}
              camEnabled={camEnabled}
              micOpen={phaseState.micAllowed && cubicle.status !== "active"}
              count={participants.length}
              onMic={() => void toggleMic()}
              onCam={() => void toggleCam()}
              onExpand={expand}
              onLeave={leaveNow}
            />
          </PipPortal>
        )}

        {full && (
        <div
          className="ui-page"
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100dvh",
            background: colors.bg.muted,
            overflow: "hidden",
            position: "fixed",
            inset: 0,
            zIndex: 900,
            transformOrigin: "calc(100% - 16px) calc(100% - 16px)",
            transform: minimizing ? "scale(0.24)" : "none",
            opacity: minimizing ? 0 : 1,
            borderRadius: minimizing ? radii.xxl : 0,
            transition: "transform var(--dur-sheet) var(--ease-ui), opacity var(--dur-sheet) var(--ease-ui), border-radius var(--dur-sheet) var(--ease-ui)",
            pointerEvents: minimizing ? "none" : undefined,
          }}
        >
          <header
            style={{
              display: "flex",
              alignItems: "center",
              gap: spacing.sm,
              padding: `${spacing.md}px ${spacing.base}px ${spacing.sm}px`,
              minHeight: 44,
              flexShrink: 0,
            }}
          >
            {/* Where "back" sits on every other page: shrink the room and keep using the app. */}
            <button
              type="button"
              onClick={minimize}
              aria-label={`Minimize ${roomName}`}
              title="Minimize"
              className="ui-press"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                minWidth: 0,
                maxWidth: "60%",
                padding: "6px 12px 6px 8px",
                borderRadius: radii.pill,
                border: `1px solid ${colors.border.subtle}`,
                background: colors.surface.primary,
                color: colors.text.primary,
                fontFamily: MONO,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              <ChevronDown size={16} aria-hidden="true" style={{ flexShrink: 0 }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{roomName}</span>
            </button>
            {pinnedIdentity && (
              <button
                type="button"
                className="ui-press"
                onClick={() => setPinnedIdentity(null)}
                aria-label={`Unpin ${pinnedIdentity}`}
                style={{
                  marginLeft: "auto",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 10px",
                  borderRadius: radii.pill,
                  border: `1px solid ${colors.border.subtle}`,
                  background: colors.surface.primary,
                  color: colors.text.primary,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {pinnedIdentity}
                <X size={13} aria-hidden="true" />
              </button>
            )}
          </header>

          <RoomClock phase={phaseState} compact={phaseState.phase !== "focus" || pinnedIdentity !== null} />

          <div style={{ flex: 1, minHeight: 0, padding: `0 ${spacing.md}px` }}>
            <ConferenceView
              pinnedIdentity={pinnedIdentity}
              cubicleSet={cubicleSet}
              myIdentity={profile?.username ?? ""}
              phase={phaseState.phase}
              actions={tileActions}
            />
          </div>

          <ControlBar
            micEnabled={micEnabled}
            camEnabled={camEnabled}
            micOpen={phaseState.micAllowed}
            locked={inCubicle}
            canFlip={canFlip}
            outputs={outputs.devices}
            activeOutputId={outputs.activeId}
            count={participants.length}
            onMic={() => void toggleMic()}
            onCam={() => void toggleCam()}
            onFlip={() => void flipCamera()}
            onOutput={(id) => void selectOutput(id)}
            onPeople={() => setPeopleOpen(true)}
            onLeave={requestLeave}
            onPopOut={pip.supported && !pip.pipWindow ? () => void pip.open() : undefined}
          />

          {connectionLost && (
            <div
              role="status"
              className="ui-rise"
              style={{
                position: "absolute",
                top: 12,
                left: "50%",
                transform: "translateX(-50%)",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 14px",
                borderRadius: radii.pill,
                background: colors.surface.raised,
                border: `1px solid ${colors.border.strong}`,
                color: colors.text.primary,
                fontSize: 14,
                fontWeight: 600,
                zIndex: 40,
              }}
            >
              <WifiOff size={15} aria-hidden="true" />
              Reconnecting
            </div>
          )}
        </div>
        )}

        <PeopleSheet
          open={peopleOpen}
          participants={participants}
          myIdentity={profile?.username ?? ""}
          cubicleSet={cubicleSet}
          onClose={() => setPeopleOpen(false)}
        />
      </LiveKitRoom>

      {/* The cubicle is its own LiveKit room on top of this one. */}
      {inCubicle && cubicleToken && cubicleRoom && (
        <LiveKitRoom
          serverUrl={LIVEKIT_URL}
          token={cubicleToken}
          connect
          audio
          video
          room={cubicleRoom}
          onDisconnected={() => {
            if (cubicleRoomRef.current !== null) return;
            const cur = cubicleRef.current;
            void endCubicleLocal(cur.status === "active" ? cur.partnerIdentity : "");
          }}
          onError={(e) => setNotice(`Cubicle error: ${errorMessage(e) ?? "unknown"}`)}
          style={{ display: "contents" }}
        >
          <CubicleOverlay partnerIdentity={cubicle.partnerIdentity} onEnd={() => void endCubicle()} />
        </LiveKitRoom>
      )}

      {cubicle.status === "requesting" && (
        <CubicleRequestPill
          target={cubicle.targetIdentity}
          since={cubicle.since}
          onCancel={cancelCubicleRequest}
        />
      )}

      {notice && (
        <div
          role="status"
          onClick={() => setNotice(null)}
          className="ui-rise"
          style={{
            position: "fixed",
            left: "50%",
            bottom: 96,
            transform: "translateX(-50%)",
            maxWidth: "min(92vw, 420px)",
            padding: "10px 16px",
            borderRadius: radii.pill,
            background: colors.surface.raised,
            border: `1px solid ${colors.border.subtle}`,
            color: colors.text.primary,
            fontSize: 14,
            fontWeight: 600,
            textAlign: "center",
            cursor: "pointer",
            zIndex: 1250,
          }}
        >
          {notice}
        </div>
      )}

      <LeaveSheet
        draft={leaveDraft}
        projects={projects}
        onChange={(patch) => setLeaveDraft((d) => (d ? { ...d, ...patch } : d))}
        onStay={() => setLeaveDraft(null)}
        onLeave={() => saveAndLeave()}
        onPost={() => saveAndLeave(true)}
      />
    </>
  );
}

/** Waiting on a cubicle answer: who, how long until it's withdrawn, and a way to cancel. */
function CubicleRequestPill({ target, since, onCancel }: { target: string; since: number; onCancel: () => void }) {
  const { colors, radii } = useTokens();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const left = Math.max(0, Math.ceil((since + CUBICLE_REQUEST_TIMEOUT_MS - now) / 1000));
  return (
    <div
      role="status"
      aria-label={`Cubicle request to ${target}`}
      className="ui-rise"
      style={{
        position: "fixed",
        left: "50%",
        bottom: 96,
        transform: "translateX(-50%)",
        maxWidth: "min(92vw, 340px)",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "6px 6px 6px 14px",
        borderRadius: radii.pill,
        background: colors.surface.raised,
        border: `1px solid ${colors.border.strong}`,
        color: colors.text.primary,
        fontSize: 14,
        fontWeight: 600,
        zIndex: 1250,
      }}
    >
      <Hexagon size={15} color={colors.text.skillhive} aria-hidden="true" />
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{target}</span>
      <span style={{ fontFamily: MONO, fontSize: 12, color: colors.text.tertiary, fontVariantNumeric: "tabular-nums" }}>
        {left}s
      </span>
      <button
        type="button"
        aria-label="Cancel cubicle request"
        onClick={onCancel}
        className="ui-press"
        style={{
          width: 28,
          height: 28,
          flexShrink: 0,
          display: "grid",
          placeItems: "center",
          borderRadius: radii.pill,
          border: "none",
          background: colors.surface.secondary,
          color: colors.text.secondary,
          cursor: "pointer",
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
