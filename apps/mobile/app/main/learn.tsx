// Mobile LearnScreen using @skillhiive/native primitives + @skillhiive/contracts

import { useRouter } from "expo-router";
import { useProfile } from "@/hooks/profileContext";
import { useTheme } from "@/hooks/useTheme";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  StyleSheet,
  SafeAreaView,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  withSpring,
} from "react-native-reanimated";

import { Text, Button, Card, Avatar, Surface, useTokens as useTokensNative } from "@skillhiive/native";
import { CourseCard } from "@/components/ui/CourseCard";
import { Feather } from "@expo/vector-icons";

interface Course {
  id: string;
  title: string;
  description: string;
  instructor: string;
  thumbnail: string;
  duration: string;
  lessons: number;
  progress: number;
}

const HEADER_HEIGHT = 50;

const Index = () => {
  const router = useRouter();
  const { profile } = useProfile();
  const { colors } = useTheme();
  const { colors: tokensColors, spacing, radii, typography } = useTokensNative();
  const insets = useSafeAreaInsets();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

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

  React.useEffect(() => {
    // Mock courses data
    const mockCourses: Course[] = [
      {
        id: "1",
        title: "React Native Mastery",
        description: "Build production-ready mobile apps with React Native, Expo, and TypeScript.",
        instructor: "Sarah Chen",
        thumbnail: "https://picsum.photos/seed/rn1/400/300",
        duration: "12h 30m",
        lessons: 48,
        progress: 0.65,
      },
      {
        id: "2",
        title: "Advanced TypeScript Patterns",
        description: "Master advanced TypeScript patterns for scalable applications.",
        instructor: "Marcus Johnson",
        thumbnail: "https://picsum.photos/seed/ts1/400/300",
        duration: "8h 15m",
        lessons: 32,
        progress: 0.3,
      },
      {
        id: "3",
        title: "Full-Stack with Expo & Supabase",
        description: "Build full-stack apps with Expo Router, Supabase, and real-time features.",
        instructor: "Alex Chen",
        thumbnail: "https://picsum.photos/seed/fs1/400/300",
        duration: "15h 45m",
        lessons: 62,
        progress: 0.15,
      },
      {
        id: "4",
        title: "React Native Animations & Reanimated",
        description: "Create fluid, performant animations with React Native Reanimated 3.",
        instructor: "Marcus Johnson",
        thumbnail: "https://picsum.photos/seed/anim1/400/300",
        duration: "6h 20m",
        lessons: 24,
        progress: 0,
      },
    ];
    setCourses(mockCourses);
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
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => {}}
            colors={[tokensColors.text.skillhive]}
            tintColor={tokensColors.text.skillhive}
          />
        }
      >
        {/* Section header */}
        <View style={styles.sectionHeader}>
          <Text variant="subtitle" style={{ color: tokensColors.text.primary }}>
            Continue Learning
          </Text>
        </View>

        {loading && (
          <View style={styles.centered}>
            <ActivityIndicator color={tokensColors.text.skillhive} size="large" />
          </View>
        )}

        {!loading && courses.map((course) => (
          <CourseCard
            key={course.id}
            title={course.title}
            instructor={course.instructor}
            description={course.description}
            thumbnail={course.thumbnail}
            enrolledCount={100}
            lessonCount={course.lessons}
            progress={course.progress}
            onPress={() => router.push(`/course/${course.id}`)}
          />
        ))}

        {!loading && courses.length === 0 && (
          <View style={styles.centered}>
            <Text variant="body" tone="secondary">
              No courses available yet.
            </Text>
          </View>
        )}
      </Animated.ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  centered: {
    paddingVertical: 48,
    alignItems: "center",
  },
});

export default Index;