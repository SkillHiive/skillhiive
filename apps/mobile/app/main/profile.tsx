// Mobile ProfileScreen using @skillhiive/native primitives + @skillhiive/contracts

import { useRouter } from "expo-router";
import { useProfile } from "@/hooks/profileContext";
import { useTheme } from "@/hooks/useTheme";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  TouchableOpacity,
  View,
  Image,
  SafeAreaView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  withSpring,
} from "react-native-reanimated";

import { Text, Button, Card, Avatar, Surface, useTokens as useTokensNative } from "@skillhiive/native";
import { Feather, MaterialIcons } from "@expo/vector-icons";

interface UserProfile {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  profilePicture?: string;
  bio?: string;
  location?: string;
  stats: {
    posts: number;
    followers: number;
    following: number;
  };
}

const HEADER_HEIGHT = 50;

const Index = () => {
  const router = useRouter();
  const { profile } = useProfile();
  const { colors } = useTheme();
  const { colors: tokensColors, spacing, radii, typography } = useTokensNative();
  const insets = useSafeAreaInsets();

  const [userProfile, setUserProfile] = React.useState<UserProfile | null>(null);
  const [loading, setLoading] = React.useState(true);

  const scrollY = useSharedValue(0);
  const translateY = useSharedValue(0);
  const translateYValue = React.useRef(0);
  const lastScrollY = React.useRef(0);
  const contentHeight = React.useRef(0);
  const containerHeight = React.useRef(0);

  const HEADER_HEIGHT_LOCAL = 50 + insets.top + 20;

  const isWithinBounds = (y: number) =>
    y >= 0 && y <= contentHeight.current - containerHeight.current;

  const onScroll = useAnimatedScrollHandler((event: { contentOffset: { y: number } }) => {
    const currentY = event.contentOffset.y;
    if (!isWithinBounds(currentY)) return;
    const diff = currentY - lastScrollY.current;
    let next = translateYValue.current - diff;
    if (next < -HEADER_HEIGHT_LOCAL) next = -HEADER_HEIGHT_LOCAL;
    if (next > 0) next = 0;
    translateY.value = next;
    lastScrollY.current = currentY;
  });

  const snapHeader = () => {
    const current = translateYValue.current;
    translateY.value = withSpring(current > -HEADER_HEIGHT_LOCAL / 2 ? 0 : -HEADER_HEIGHT_LOCAL, {
      damping: 20,
      stiffness: 150,
    });
  };

  React.useEffect(() => {
    // Mock profile data
    const mockProfile: UserProfile = {
      id: "u1",
      username: "alexchen",
      firstName: "Alex",
      lastName: "Chen",
      profilePicture: "https://i.pravatar.cc/150?u=alex",
      bio: "Full-stack developer • React Native • TypeScript • Ex-FAANG • Building SkillHive 🚀",
      location: "San Francisco, CA",
      stats: {
        posts: 42,
        followers: 1234,
        following: 567,
      },
    };
    setUserProfile(mockProfile);
    setLoading(false);
  }, []);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: tokensColors.bg.muted, paddingTop: insets.top }}
      onLayout={(e: LayoutChangeEvent) => {
        containerHeight.current = e.nativeEvent.layout.height;
      }}
    >
      <Animated.ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 10, paddingHorizontal: 14, gap: 12 }}
        onContentSizeChange={(_, h) => { contentHeight.current = h; }}
        onScroll={onScroll}
        onScrollEndDrag={snapHeader}
        onMomentumScrollEnd={snapHeader}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        bounces
      >
        {/* Profile Header */}
        <Card style={styles.profileHeader}>
          <View style={styles.avatarWrapper}>
            <Avatar
              source={userProfile?.profilePicture}
              name={`${userProfile?.firstName} ${userProfile?.lastName}`}
              size={96}
            />
          </View>
          <View style={styles.profileInfo}>
            <Text variant="headline" tone="primary" style={styles.name}>
              {userProfile?.firstName} {userProfile?.lastName}
            </Text>
            <Text variant="subtitle" tone="secondary" style={styles.username}>
              @{userProfile?.username}
            </Text>
            {userProfile?.bio && (
              <Text variant="body" tone="primary" style={styles.bio}>
                {userProfile?.bio}
              </Text>
            )}
            {userProfile?.location && (
              <View style={styles.locationRow}>
                <Feather name="map-pin" size={14} color={tokensColors.text.tertiary} />
                <Text variant="caption" tone="tertiary">
                  {userProfile?.location}
                </Text>
              </View>
            )}

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text variant="title" tone="primary" style={{ fontWeight: "700" }}>
                  {userProfile?.stats.posts}
                </Text>
                <Text variant="caption" tone="tertiary">Posts</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text variant="title" tone="primary" style={{ fontWeight: "700" }}>
                  {userProfile?.stats.followers}
                </Text>
                <Text variant="caption" tone="tertiary">Followers</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text variant="title" tone="primary" style={{ fontWeight: "700" }}>
                  {userProfile?.stats.following}
                </Text>
                <Text variant="caption" tone="tertiary">Following</Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Button
            variant="primary"
            size="md"
            fullWidth
            onPress={() => {}}
            label="Edit Profile"
          />
          <Button
            variant="secondary"
            size="md"
            fullWidth
            onPress={() => router.push("/settings/profile")}
            label="Settings"
          />
        </View>

        {/* Posts Section */}
        <View style={styles.sectionHeader}>
          <Text variant="subtitle" style={{ color: tokensColors.text.primary }}>
            Posts
          </Text>
        </View>

        {loading && (
          <View style={styles.centered}>
            <ActivityIndicator color={tokensColors.text.skillhive} size="large" />
          </View>
        )}

        {!loading && (
          <View>
            <Text variant="body" tone="secondary" style={styles.centered}>
              No posts yet.
            </Text>
          </View>
        )}
      </Animated.ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  profileHeader: {
    padding: 16,
    alignItems: "center",
  },
  avatarWrapper: {
    marginBottom: 16,
  },
  profileInfo: {
    alignItems: "center",
    gap: 8,
    width: "100%",
  },
  name: {
    textAlign: "center",
  },
  username: {
    textAlign: "center",
  },
  bio: {
    textAlign: "center",
    marginTop: 8,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    width: "100%",
    marginTop: 16,
    paddingHorizontal: 24,
  },
  statItem: {
    alignItems: "center",
    gap: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginHorizontal: 14,
    marginTop: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
    marginHorizontal: 14,
  },
  centered: {
    paddingVertical: 48,
    alignItems: "center",
  },
});

export default Index;