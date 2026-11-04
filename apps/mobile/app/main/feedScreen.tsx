// Mobile FeedScreen using @skillhiive/contracts for types + @skillhiive/native primitives

import { useRouter } from "expo-router";
import { useProfile } from "@/hooks/profileContext";
import { useTheme } from "@/hooks/useTheme";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
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
  runOnJS,
} from "react-native-reanimated";

import { Text, Button, Card, Avatar, Surface, useTokens as useTokensNative } from "@skillhiive/native";
import { type Post } from "@skillhiive/contracts";
import { Feather } from "@expo/vector-icons";

const HEADER_HEIGHT = 50;

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

const Index = () => {
  const router = useRouter();
  const { profile } = useProfile();
  const { colors } = useTheme();
  const { colors: tokensColors, spacing, radii, typography } = useTokensNative();
  const insets = useSafeAreaInsets();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const scrollY = useSharedValue(0);
  const translateY = useSharedValue(0);
  const translateYValue = React.useRef(0);
  const lastScrollY = React.useRef(0);
  const contentHeight = React.useRef(0);
  const containerHeight = React.useRef(0);

  const isWithinBounds = (y: number) =>
    y >= 0 && y <= contentHeight.current - containerHeight.current;

  const onScroll = useAnimatedScrollHandler((event: { contentOffset: { y: number } }) => {
    const currentY = event.contentOffset.y;
    if (!isWithinBounds(currentY)) return;
    const diff = currentY - lastScrollY.current;
    let next = translateYValue.current - diff;
    if (next < -HEADER_HEIGHT) next = -HEADER_HEIGHT;
    if (next > 0) next = 0;
    translateY.value = next;
    lastScrollY.current = currentY;
  });

  const snapHeader = () => {
    const current = translateYValue.current;
    translateY.value = withSpring(current > -HEADER_HEIGHT / 2 ? 0 : -HEADER_HEIGHT, {
      damping: 20,
      stiffness: 150,
    });
  };

  const fetchPosts = React.useCallback(async (pageNum = 0, isRefresh = false) => {
    try {
      if (isRefresh) setLoading(true);
      // In a real app, this would fetch from your API
      // For now, we'll use mock data
      const mockPosts: Post[] = [
        {
          id: "1" as any,
          content: "Just shipped a new feature! 🚀 The feeling of seeing your code in production never gets old.",
          image: "https://picsum.photos/seed/1/800/600",
          createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          user: {
            _id: "u1" as any,
            username: "alexchen",
            firstName: "Alex",
            lastName: "Chen",
            profilePicture: "https://i.pravatar.cc/150?u=alex",
            verified: true,
          },
          likes: ["u2" as any, "u3" as any],
          comments: [],
          commentCount: 5,
          reposts: [],
          repostCount: 2,
        },
        {
          id: "2" as any,
          content: "Deep work session complete. 4 hours of uninterrupted focus on the new authentication system. The rhythm is real. 🎯",
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
          user: {
            _id: "u2" as any,
            username: "sarahdev",
            firstName: "Sarah",
            lastName: "Kim",
            profilePicture: "https://i.pravatar.cc/150?u=sarah",
            verified: false,
          },
          likes: ["u1" as any, "u3" as any],
          comments: [],
          commentCount: 12,
          reposts: [],
          repostCount: 0,
        },
        {
          id: "3" as any,
          content: "Pro tip: The best code is the code you don't have to write. Delete dead code, simplify logic, and watch your velocity increase. 🗑️➡️✨",
          image: "https://picsum.photos/seed/2/800/600",
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
          user: {
            _id: "u3" as any,
            username: "marcuscodes",
            firstName: "Marcus",
            lastName: "Johnson",
            profilePicture: "https://i.pravatar.cc/150?u=marcus",
            verified: true,
          },
          likes: ["u1" as any, "u2" as any, "u4" as any],
          comments: [],
          commentCount: 8,
          reposts: [],
          repostCount: 3,
        },
      ];

      if (isRefresh) {
        setPosts(mockPosts);
        setRefreshing(false);
      } else {
        setPosts((prev) => [...prev, ...mockPosts]);
      }
      setHasMore(false);
      setLoading(false);
    } catch (e) {
      console.error("Failed to fetch posts:", e);
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const onRefresh = () => fetchPosts(0, true);

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchPosts(page + 1);
    }
  };

  const renderPost = (item: Post) => {
    const timeAgo = formatTimeAgo(item.createdAt);

    return (
      <Card style={styles.postCard}>
        <View style={styles.postHeader}>
          <Avatar
            source={item.user.profilePicture}
            name={`${item.user.firstName} ${item.user.lastName}`}
            size={40}
          />
          <View style={styles.postMeta}>
            <Text variant="label" tone="primary" style={{ fontWeight: "700" }}>
              {item.user.firstName} {item.user.lastName}
              {item.user.verified && <Text style={styles.verifiedBadge}> ✓</Text>}
            </Text>
            <Text variant="caption" tone="tertiary">@{item.user.username} • {timeAgo}</Text>
          </View>
        </View>

        <Text variant="body" tone="primary" style={styles.postContent}>
          {item.content}
        </Text>

        {item.image && (
          <Image
            source={{ uri: item.image }}
            style={styles.postImage}
            resizeMode="cover"
          />
        )}

        <View style={styles.postActions}>
          <TouchableOpacity style={styles.actionButton}>
            <Feather name="heart" size={20} color={colors.text.secondary} />
            <Text variant="caption" tone="secondary" style={{ marginLeft: 4 }}>
              {item.likes.length}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Feather name="message-circle" size={20} color={colors.text.secondary} />
            <Text variant="caption" tone="secondary" style={{ marginLeft: 4 }}>
              {item.commentCount || 0}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Feather name="repeat" size={20} color={colors.text.secondary} />
            <Text variant="caption" tone="secondary" style={{ marginLeft: 4 }}>
              {item.repostCount || 0}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Feather name="share-2" size={20} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[tokensColors.text.skillhive]}
            tintColor={tokensColors.text.skillhive}
          />
        }
      >
        {loading && (
          <View style={styles.centered}>
            <ActivityIndicator color={tokensColors.text.skillhive} size="large" />
          </View>
        )}

        {!loading && posts.length === 0 && (
          <View style={styles.centered}>
            <Text variant="body" tone="secondary">
              No posts yet. Be the first to share!
            </Text>
            <Button
              variant="primary"
              size="md"
              onPress={() => {}}
              label="Create Post"
              style={{ marginTop: 12, width: 200 }}
            />
          </View>
        )}

        {!loading && posts.map(renderPost)}

        {!hasMore && !loading && posts.length > 0 && (
          <View style={styles.centered}>
            <Text variant="caption" tone="tertiary" style={{ marginTop: 24 }}>
              You're all caught up!
            </Text>
          </View>
        )}
      </Animated.ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  postCard: {
    marginBottom: 12,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  postMeta: {
    flex: 1,
    gap: 2,
  },
  verifiedBadge: {
    color: "#1B7CE8",
    fontSize: 12,
  },
  postContent: {
    marginBottom: 12,
    lineHeight: 22,
  },
  postImage: {
    width: "100%",
    height: 300,
    borderRadius: 12,
    marginBottom: 12,
  },
  postActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  centered: {
    paddingVertical: 48,
    alignItems: "center",
  },
});

export default Index;