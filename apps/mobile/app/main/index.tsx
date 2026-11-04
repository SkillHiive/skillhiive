// Mobile HomeScreen using @skillhiive/core for Today data + @skillhiive/native primitives

import { useRouter } from "expo-router";
import { useProfile } from "@/hooks/profileContext";
import { useActiveRooms } from "@/hooks/useActiveRooms";
import { useTheme } from "@/hooks/useTheme";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  TouchableOpacity,
  View,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetView } from "@gorhom/bottom-sheet";

import { computePhase } from "@skillhiive/core";
import { Text, Button, useTokens as useTokensNative } from "@skillhiive/native";
import { WorkRoomCard } from "@/components/ui/WorkRoomCard";

const LOGO_SIZE = 50;

const Index = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { colors: tokensColors, spacing, radii, typography } = useTokensNative();

  const HEADER_HEIGHT = LOGO_SIZE + insets.top + 20;
  const { rooms, loading } = useActiveRooms();

  const [roomName, setRoomName] = useState("");

  const bottomSheetRef = React.useRef<BottomSheetModal>(null);

  const scrollY = React.useRef(new Animated.Value(0));
  const translateY = React.useRef(new Animated.Value(0));
  const translateYValue = React.useRef(0);
  const lastScrollY = React.useRef(0);
  const contentHeight = React.useRef(0);
  const containerHeight = React.useRef(0);

  const isWithinBounds = (y: number) =>
    y >= 0 && y <= contentHeight.current - containerHeight.current;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentY = e.nativeEvent.contentOffset.y;
    if (!isWithinBounds(currentY)) return;
    const diff = currentY - lastScrollY.current;
    let next = translateYValue.current - diff;
    if (next < -HEADER_HEIGHT) next = -HEADER_HEIGHT;
    if (next > 0) next = 0;
    translateY.current.setValue(next);
    lastScrollY.current = currentY;
  };

  const snapHeader = () => {
    const current = translateYValue.current;
    Animated.spring(translateY.current, {
      toValue: current > -HEADER_HEIGHT / 2 ? 0 : -HEADER_HEIGHT,
      useNativeDriver: true,
      bounciness: 0,
    }).start();
  };

  const handleOpenSheet = React.useCallback(() => {
    setRoomName("");
    bottomSheetRef.current?.present();
  }, []);

  const handleCloseSheet = React.useCallback(() => {
    bottomSheetRef.current?.dismiss();
  }, []);

  function handleStartSession() {
    const trimmed = roomName.trim();
    if (!trimmed) return;
    handleCloseSheet();
    setRoomName("");
    router.push({
      pathname: "/rooms/[roomName]",
      params: { roomName: trimmed },
    });
  }

  function handleJoinRoom(name: string) {
    router.push({
      pathname: "/rooms/[roomName]",
      params: { roomName: name },
    });
  }

  const renderBackdrop = React.useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        opacity={0.6}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
      />
    ),
    [],
  );

  return (
    <View
      style={{ flex: 1, backgroundColor: tokensColors.bg.muted }}
      onLayout={(e: LayoutChangeEvent) => {
        containerHeight.current = e.nativeEvent.layout.height;
      }}
    >
      <Animated.ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 10, paddingHorizontal: 14, gap: 12 }}
        onContentSizeChange={(_, h: number) => { contentHeight.current = h; }}
        onScroll={onScroll}
        onScrollEndDrag={snapHeader}
        onMomentumScrollEnd={snapHeader}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        bounces
      >
        {/* Section header */}
        <View style={styles.sectionHeader}>
          <Text variant="subtitle" style={{ color: tokensColors.text.primary }}>
            Work Rooms
          </Text>

          <View style={styles.sectionRight}>
            <TouchableOpacity
              style={[styles.createBtn, { backgroundColor: tokensColors.bg.accentDim, borderColor: tokensColors.border.primary }]}
              onPress={handleOpenSheet}
              activeOpacity={0.8}
            >
              <Text style={[styles.createBtnText, { color: tokensColors.text.skillhive }]}>+ New Room</Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading && (
          <View style={styles.centered}>
            <ActivityIndicator color={tokensColors.text.skillhive} size="large" />
          </View>
        )}

        {!loading && rooms.length === 0 && (
          <WorkRoomCard
            state="empty"
            name="No rooms yet"
            tag="Be the first"
            onStart={handleOpenSheet}
            timerSeconds={0}
            breakSeconds={0}
          />
        )}

        {!loading && rooms.map((room) => {
          const phase = computePhase(room.session_started_at);
          const memberNames = room.participants.map(
            (p) => p.displayname || p.username,
          );

          const sessionStartMs = room.session_started_at
            ? new Date(room.session_started_at).getTime()
            : undefined;

          const elapsed = sessionStartMs ? Date.now() - sessionStartMs : 0;
          const posInCycle = elapsed % (50 * 60 * 1000 + 10 * 60 * 1000);
          const phaseStartedAt = sessionStartMs
            ? Date.now() - posInCycle + (phase.phase === "break" ? 50 * 60 * 1000 : 0)
            : undefined;

          const phaseDurationMs = phase.phase === "focusing" ? 50 * 60 * 1000 : 10 * 60 * 1000;

          return (
            <WorkRoomCard
              key={room.room_name}
              state={
                phase.phase === "focusing"
                  ? "active"
                  : phase.phase === "break"
                    ? "break"
                    : "empty"
              }
              name={room.room_name}
              tag={`${room.participant_count} joined`}
              members={memberNames}
              phaseStartedAt={phaseStartedAt}
              onJoin={() => handleJoinRoom(room.room_name)}
              phaseDurationMs={phaseDurationMs}
            />
          );
        })}
      </Animated.ScrollView>

      {/* Bottom Sheet */}
      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={["30%"]}
        enablePanDownToClose
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        onDismiss={() => setRoomName("")}
        backdropComponent={renderBackdrop}
        backgroundStyle={{
          backgroundColor: tokensColors.bg.muted,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
        }}
        handleIndicatorStyle={{ backgroundColor: "#3a322c" }}
      >
        <BottomSheetView style={styles.sheetContent}>
          <Text variant="subtitle" style={{ color: tokensColors.text.primary, marginBottom: 16 }}>
            Name your room
          </Text>

          <TextInput
            value={roomName}
            onChangeText={setRoomName}
            autoFocus
            placeholder="e.g. deep work, thesis grind…"
            placeholderTextColor={tokensColors.text.secondary}
            returnKeyType="done"
            onSubmitEditing={handleStartSession}
            style={[styles.input, {
              borderColor: tokensColors.border.primary,
              color: tokensColors.text.primary,
              backgroundColor: tokensColors.bg.muted,
            }]}
          />

          <TouchableOpacity
            style={[styles.createBtn, {
              backgroundColor: "#24280B",
              borderColor: tokensColors.border.primary,
              alignSelf: "flex-end",
            }]}
            activeOpacity={0.8}
            onPress={handleStartSession}
          >
            <Text style={[styles.createBtnText, { color: tokensColors.text.skillhive }]}>
              Create
            </Text>
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheetModal>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  sectionRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  countChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  countText: {
    fontSize: 12,
    fontWeight: "700",
  },
  createBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 1,
    borderWidth: 1,
  },
  createBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  centered: {
    paddingVertical: 48,
    alignItems: "center",
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },
  input: {
    borderWidth: 1,
    borderRadius: 0,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 20,
    fontSize: 14,
  },
});

export default Index;