// Mobile RoomScreen using monorepo packages
// Uses @skillhiive/core (rhythm), @skillhiive/native (primitives), @skillhiive/contracts (types), @skillhiive/client (API), LiveKit

import { useLocalSearchParams, useRouter } from "expo-router";
import { useProfile } from "@/hooks/profileContext";
import { useRoomPresence } from "@/hooks/useRoomPresence";
import { useRoomSession } from "@/hooks/useRoomSession";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/lib/supabase";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import {
  LiveKitRoom,
  registerGlobals,
  useLocalParticipant,
  useTracks,
  VideoTrack,
} from "@livekit/react-native";
import {
  Participant as LKParticipant,
  Room as LKRoom,
  RoomEvent,
  RoomOptions,
  Track,
  VideoPresets,
} from "livekit-client";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text as RNText,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// PiP hook
import { PIP_H, PIP_W, usePipMode } from "@/hooks/usePipMode";

import {
  Avatar,
  Button,
  Card,
  Surface,
  Text,
  useTokens,
} from "@skillhiive/native";
import { computePhase } from "@skillhiive/core";
import { RoomSchema, ParticipantSchema, PhaseSchema, type Room, type Participant, type Phase } from "@skillhiive/contracts";

registerGlobals();

const LIVEKIT_URL = "wss://rooms.skillhiive.com";
const TOKEN_ENDPOINT = "https://api.skillhivelabs.com/getToken";
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const SIDEBAR_W = Math.min(300, SCREEN_W * 0.78);
const MONO = Platform.OS === "ios" ? "Menlo" : "monospace";

// Active-speaker debounce
const SPEAKER_DEBOUNCE_MS = 800;

type CubicleState =
  | { status: "idle" }
  | { status: "requesting"; targetIdentity: string }
  | { status: "incoming"; fromIdentity: string; cubicleRoomName: string }
  | { status: "active"; partnerIdentity: string; cubicleRoomName: string };

type GridLayout = {
  type: "single" | "grid" | "asymmetric";
  cols: number;
  rows: number;
  tileW: number;
  tileH: number;
};

function computeGrid(count: number, W: number, H: number): GridLayout {
  if (count <= 1) return { type: "single", cols: 1, rows: 1, tileW: W, tileH: H };
  if (count === 2) return { type: "grid", cols: 1, rows: 2, tileW: W, tileH: H / 2 };
  if (count === 3) return { type: "asymmetric", cols: 2, rows: 2, tileW: W / 2, tileH: H / 2 };
  if (count === 4) return { type: "grid", cols: 2, rows: 2, tileW: W / 2, tileH: H / 2 };
  if (count === 5) return { type: "asymmetric", cols: 3, rows: 2, tileW: W / 3, tileH: H / 2 };
  return { type: "grid", cols: 2, rows: 3, tileW: W / 2, tileH: H / 3 };
}

const TILES_PER_PAGE = 6;
function initials(name: string) { return name.slice(0, 2).toUpperCase(); }

interface AudioDevice { id: string; name: string; }
function useAudioDevices() {
  const [devices] = useState<AudioDevice[]>([
    { id: "speaker", name: "Speaker" },
    { id: "earpiece", name: "Earpiece" },
  ]);
  const [activeId, setActiveId] = useState("speaker");
  const active = devices.find((d) => d.id === activeId) ?? devices[0];
  return { devices, active, selectDevice: setActiveId };
}

// RoomScreen
export default function RoomScreen() {
  const { roomName } = useLocalSearchParams<{ roomName: string }>();
  const { profile } = useProfile();
  const router = useRouter();
  const { colors } = useTheme();
  const { colors: tokensColors, spacing, radii, typography } = useTokens();

  const [lobbyDone, setLobbyDone] = useState(false);
  const [joinWithCam, setJoinWithCam] = useState(true);
  const [joinWithFrontCam, setJoinWithFrontCam] = useState(true);

  // Never-re-render refs
  const intentionalLeaveRef = useRef(false);
  const connectedRef = useRef(false);
  const micEnabledRef = useRef(false);
  const camEnabledRef = useRef(false);
  const syncRef = useRef<(() => void) | null>(null);
  const roomRef = useRef<LKRoom | null>(null);
  const cubicleRoomRef = useRef<LKRoom | null>(null);
  const cubicleChannelRef = useRef<any>(null);
  const sidebarOpenRef = useRef(false);
  const cubicleJoinCancelledRef = useRef(false);
  const cubicleRef = useRef<CubicleState>({ status: "idle" });
  const shownCubicleAlertRef = useRef<string | null>(null);
  const prevPhaseRef = useRef<string>("waiting");

  // State
  const [token, setToken] = useState<string | null>(null);
  const [livekitReady, setLivekitReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [participants, setParticipants] = useState<LKParticipant[]>([]);
  const [micEnabled, setMicEnabled] = useState(false);
  const [camEnabled, setCamEnabled] = useState(false);
  const [isFrontCam, setIsFrontCam] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [focusedIdentity, setFocusedIdentity] = useState<string | null>(null);
  const [camOffSet, setCamOffSet] = useState<Set<string>>(new Set());
  const [cubicle, setCubicle] = useState<CubicleState>({ status: "idle" });
  const [cubicleToken, setCubicleToken] = useState<string | null>(null);
  const [cubicleSet, setCubicleSet] = useState<Set<string>>(new Set());
  const [gridSize, setGridSize] = useState({ w: SCREEN_W, h: SCREEN_H * 0.72 });

  // PiP
  const pip = usePipMode();

  // Flip fade
  const [flipFading, setFlipFading] = useState(false);
  const flipFadeAnim = useRef(new Animated.Value(0)).current;

  const sidebarX = useRef(new Animated.Value(SIDEBAR_W)).current;
  const sidebarOpacity = useRef(new Animated.Value(0)).current;
  const { devices, active: activeDevice, selectDevice } = useAudioDevices();

  // Fetch LiveKit token
  useEffect(() => {
    async function fetchToken() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error("No session");
        const res = await fetch(`${TOKEN_ENDPOINT}?roomName=${roomName}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch token");
        const data = await res.json();
        setToken(data.token);
      } catch (e) {
        console.error("Token fetch failed:", e);
        Alert.alert("Error", "Failed to join room");
        router.back();
      }
    }
    fetchToken();
  }, [roomName, router]);

  // Connect to LiveKit when token is ready
  useEffect(() => {
    if (!token) return;
    setLoading(true);

    const room = new LKRoom({
      adaptiveStream: true,
      dynacast: true,
    });

    roomRef.current = room;

    room.on(RoomEvent.ParticipantConnected, (participant) => {
      setParticipants((prev) => [...prev, participant]);
    });

    room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      setParticipants((prev) => prev.filter((p) => p.identity !== participant.identity));
    });

    room.on(RoomEvent.DataReceived, (data, participant) => {
      // Handle room data (phase changes, etc.)
      try {
        const payload = JSON.parse(new TextDecoder().decode(data));
        if (payload.type === "phase_change") {
          // Handle phase change
        }
      } catch (e) {
        console.error("Failed to parse room data:", e);
      }
    });

    room.connect(LIVEKIT_URL, token).then(() => {
      setLivekitReady(true);
      setLoading(false);
      connectedRef.current = true;
    }).catch((e) => {
      console.error("Connection failed:", e);
      Alert.alert("Error", "Failed to connect to room");
      router.back();
    });

    return () => {
      intentionalLeaveRef.current = true;
      room.disconnect();
      connectedRef.current = false;
    };
  }, [token, roomName]);

  // Get local participant
  const localParticipant = useLocalParticipant();
  const tracks = useTracks([Track.Kind.Video, Track.Kind.Audio] as any);

  // Handle app lifecycle
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "background" && connectedRef.current) {
        // Handle background
      } else if (state === "active" && connectedRef.current) {
        // Handle foreground
      }
    });
    return () => subscription.remove();
  }, []);

  // Render participant video
  const renderParticipant = (participant: any) => {
    const videoTrack = participant.videoTracks?.get(0) || Array.from(participant.videoTracks?.values() || [])[0];
    if (!videoTrack) return null;

    return (
      <View style={styles.videoTile}>
        <VideoTrack
          trackRef={videoTrack}
          style={styles.videoTrack}
        />
        <View style={styles.participantName}>
          <Text variant="caption" tone="inverse" style={{ backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
            {participant.name || participant.identity}
          </Text>
        </View>
      </View>
    );
  };

  // Grid layout calculation
  const participantCount = participants.length + (localParticipant ? 1 : 0);
  const grid = computeGrid(participantCount, SCREEN_W, SCREEN_H * 0.72);

  if (!livekitReady || loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator color={colors.text.skillhive} size="large" />
        <Text variant="body" tone="secondary" style={styles.loadingText}>
          Joining room...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokensColors.bg.muted }}>
      <StatusBar barStyle="light-content" />
      <View style={{ flex: 1 }}>
        {/* Video Grid */}
        <View style={styles.videoGrid}>
          {localParticipant && renderParticipant(localParticipant)}
          {participants.map((p) => renderParticipant(p))}
        </View>

        {/* Bottom Controls */}
        <Surface variant="solid" style={styles.bottomBar}>
          <View style={styles.controlsRow}>
            <Button
              variant={micEnabled ? "primary" : "ghost"}
              size="md"
              onPress={() => {
                const newMicEnabled = !micEnabled;
                setMicEnabled(newMicEnabled);
                roomRef.current?.localParticipant.setMicrophoneEnabled(newMicEnabled);
              }}
              label={micEnabled ? "Mute" : "Unmute"}
              leading={
                <Feather name={micEnabled ? "mic-off" : "mic"} size={24} />
              }
            />
            <Button
              variant={camEnabled ? "primary" : "ghost"}
              size="md"
              onPress={() => {
                const newCamEnabled = !camEnabled;
                setCamEnabled(newCamEnabled);
                roomRef.current?.localParticipant.setCameraEnabled(newCamEnabled);
              }}
              label={camEnabled ? "Camera Off" : "Camera On"}
              leading={
                <Feather name={camEnabled ? "video-off" : "video"} size={24} />
              }
            />
            <Button
              variant="ghost"
              size="md"
              onPress={() => setIsFrontCam(!isFrontCam)}
              label={isFrontCam ? "Switch to Back" : "Switch to Front"}
              leading={
                <Feather name={isFrontCam ? "rotate-ccw" : "rotate-cw"} size={24} />
              }
            />
            <Button
              variant={sidebarOpen ? "primary" : "ghost"}
              size="md"
              onPress={() => setSidebarOpen(!sidebarOpen)}
              label={sidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
              leading={<Feather name="users" size={24} />}
            />
            <Button
              variant="danger"
              size="md"
              onPress={() => {
                intentionalLeaveRef.current = true;
                roomRef.current?.disconnect();
                router.back();
              }}
              label="Leave Room"
              leading={<Feather name="log-out" size={24} />}
            />
          </View>
        </Surface>

        {/* Sidebar */}
        <Animated.View
          style={[
            styles.sidebar,
            {
              transform: [{ translateX: sidebarX }],
              opacity: sidebarOpacity,
            },
          ]}
        >
          <Surface variant="solid" style={styles.sidebarContent}>
            <View style={styles.sidebarHeader}>
              <Text variant="subtitle" tone="primary">Participants</Text>
              <TouchableOpacity onPress={() => setSidebarOpen(false)}>
                <Feather name="x" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {[localParticipant, ...participants].map((p: any) => (
                <View key={p?.identity} style={styles.participantRow}>
                  <Avatar
                    name={p?.name || p?.identity}
                    size={36}
                  />
                  <Text variant="body" tone="primary">{p?.name || p?.identity}</Text>
                  {p?.identity === (localParticipant as any)?.identity && (
                    <Text variant="caption" tone="secondary">(You)</Text>
                  )}
                </View>
              ))}
            </ScrollView>
          </Surface>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    marginTop: 8,
  },
  videoGrid: {
    flex: 1,
    padding: 8,
  },
  videoTile: {
    position: "relative",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  videoTrack: {
    width: "100%",
    height: "100%",
  },
  participantName: {
    position: "absolute",
    bottom: 8,
    left: 8,
  },
  bottomBar: {
    padding: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  controlsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  sidebar: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: 300,
    zIndex: 100,
  },
  sidebarContent: {
    flex: 1,
    padding: 16,
  },
  sidebarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  participantRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
});

import { AppState } from "react-native";