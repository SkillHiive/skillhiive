import { Skeleton } from "@/components/ui/States";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Clock, FolderGit2, Keyboard, Pencil } from "lucide-react";
import AllyButton from "@/components/AllyButton";
import { ErrorState } from "@/components/ui/ErrorState";
import { PostCard, type PostModel } from "@/components/feed/PostCards";
import { useAuth } from "@/hooks/useAuth";
import { countAllies } from "@/lib/allies";
import { loadErrorMessage } from "@/lib/load";
import { fetchUserPosts } from "@/lib/posts";
import { Text } from "@skillhiive/ui";
import { Heatmap } from "@/components/ui/Heatmap";
import { useTokens } from "@/theme";
import { useProfile } from "@/hooks/useProfile";
import { useUserCodingStats } from "@/hooks/useTimeTracker";
import {
  LanguageBreakdown,
  MiniHeatmap,
  formatDuration,
} from "@/components/CodingTime";
import {
  fetchPublicProfile,
  fetchFocusStats,
  fetchHeatmap,
  fetchUserProjects,
  fetchRecentShipped,
  type PublicProfile,
  type FocusStats,
  type HeatmapDay,
  type ProjectWithStats,
  type ShippedNote,
} from "@/lib/todayData";

const FONT =
  '"popreg", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

function formatHours(minutes: number): string {
  const h = minutes / 60;
  if (h < 1) return `${minutes}m`;
  return h >= 10 ? `${Math.round(h)}h` : `${h.toFixed(1)}h`;
}

export default function UserProfile() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { colors, spacing, radii } = useTokens();
  const { profile: me } = useProfile();
  const session = useAuth();
  const signedIn = !!session;

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [stats, setStats] = useState<FocusStats | null>(null);
  const [heatmap, setHeatmap] = useState<HeatmapDay[]>([]);
  const [projects, setProjects] = useState<ProjectWithStats[]>([]);
  const [shipped, setShipped] = useState<ShippedNote[]>([]);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [allyCount, setAllyCount] = useState<number | null>(null);
  const [posts, setPosts] = useState<PostModel[]>([]);

  const { stats: codingStats } = useUserCodingStats(profile?.id);
  const isOwnProfile = !!me && profile?.id === me.id;

  const loading = loadedFor !== (username ?? null);

  useEffect(() => {
    if (!username || loadedFor === username) return;
    let cancelled = false;
    (async () => {
      let p: PublicProfile | null;
      try {
        p = await fetchPublicProfile(username);
      } catch (e) {
        if (cancelled) return;
        setProfile(null);
        setLoadError(loadErrorMessage(e, "this profile"));
        setLoadedFor(username);
        return;
      }
      if (cancelled) return;
      setLoadError(null);
      setProfile(p);
      setStats(null);
      setHeatmap([]);
      setProjects([]);
      setShipped([]);
      setPosts([]);
      setAllyCount(null);
      setLoadedFor(username);
      if (p) {
        void fetchFocusStats(p.id).then((s) => !cancelled && setStats(s));
        void fetchHeatmap(p.id, 365).then((h) => !cancelled && setHeatmap(h));
        void fetchUserProjects(p.id).then((pr) => !cancelled && setProjects(pr));
        void fetchRecentShipped(p.id, 10).then((s) => !cancelled && setShipped(s));
        // Posts and allies are only readable when signed in.
        if (signedIn) {
          void fetchUserPosts(p.id).then((list) => !cancelled && setPosts(list)).catch(() => {});
          void countAllies(p.id).then((n) => !cancelled && setAllyCount(n)).catch(() => {});
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [username, loadedFor, signedIn]);

  const displayName = profile?.displayname ?? "—";

  if (loading) {
    // Shaped like the profile, so nothing jumps when it arrives.
    return (
      <div role="status" aria-label="Loading profile" style={{ minHeight: "100vh", background: colors.bg.muted, paddingTop: 96 }}>
        <div style={{ maxWidth: 640, margin: "0 auto", padding: `0 ${spacing.base}px`, display: "flex", flexDirection: "column", gap: spacing.lg }}>
          <div style={{ display: "flex", alignItems: "center", gap: spacing.base }}>
            <Skeleton style={{ width: 72, height: 72, borderRadius: 999 }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              <Skeleton style={{ height: 22, width: "45%" }} />
              <Skeleton style={{ height: 14, width: "30%" }} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: spacing.sm }}>
            <Skeleton style={{ height: 64 }} />
            <Skeleton style={{ height: 64 }} />
            <Skeleton style={{ height: 64 }} />
          </div>
          <Skeleton style={{ height: 140 }} />
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: colors.bg.muted,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: spacing.base,
          fontFamily: FONT,
        }}
      >
        <ErrorState
          message={loadError}
          onRetry={() => {
            setLoadError(null);
            setLoadedFor(null);
          }}
        />
      </div>
    );
  }

  if (!profile) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: colors.bg.muted,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          fontFamily: FONT,
        }}
      >
        <Text tone="secondary">Nobody here goes by @{username}.</Text>
        <Link to={signedIn ? "/home" : "/"} style={{ fontWeight: 600 }}>
          {signedIn ? "Go to Today" : "Go to the home page"}
        </Link>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: colors.bg.muted,
        paddingTop: 88,
        paddingBottom: 160,
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          maxWidth: 640,
          margin: "0 auto",
          padding: `0 ${spacing.base}px`,
          display: "flex",
          flexDirection: "column",
          gap: spacing.lg,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", gap: spacing.base, alignItems: "center" }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              border: `2px solid ${colors.border.subtle}`,
              overflow: "hidden",
              background: colors.surface.secondary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {profile.avatar ? (
              <img
                src={profile.avatar}
                alt={displayName}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <Text variant="title" tone="skillhive" weight={900}>
                {(displayName?.[0] ?? "?").toUpperCase()}
              </Text>
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <Text variant="headline" weight={900} style={{ letterSpacing: -0.5 }}>
              {displayName}
            </Text>
            {profile.username && (
              <Text tone="secondary" style={{ fontFamily: "monospace", fontSize: 13 }}>
                @{profile.username}
              </Text>
            )}
            {profile.bio && (
              <Text
                variant="bodySm"
                tone="secondary"
                style={{ display: "block", marginTop: 4 }}
              >
                {profile.bio}
              </Text>
            )}
            {allyCount !== null && (
              <Text variant="caption" tone="secondary" style={{ display: "block", marginTop: 4 }}>
                {allyCount === 1 ? "1 ally" : `${allyCount} allies`}
              </Text>
            )}
            {me?.id !== profile.id && (
              <div style={{ marginTop: spacing.sm }}>
                <AllyButton
                  profileId={profile.id}
                  returnTo={`/p/${encodeURIComponent(profile.username ?? username ?? "")}`}
                  onAlliesChanged={(d) => setAllyCount((n) => (n ?? 0) + d)}
                />
              </div>
            )}
            {me?.id === profile.id && (
              <button
                onClick={() => navigate("/settings/profile")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  marginTop: spacing.sm,
                  padding: "6px 12px",
                  borderRadius: radii.pill,
                  border: `1px solid ${colors.border.subtle}`,
                  background: "transparent",
                  color: colors.text.secondary,
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: "inherit",
                }}
              >
                <Pencil size={13} />
                Edit profile
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: spacing.sm, flexWrap: "wrap" }}>
          <Stat label="focus" value={formatHours(stats?.total_minutes ?? 0)} />
          <Stat label="sessions" value={String(stats?.total_sessions ?? 0)} />
          <Stat label="days active" value={String(stats?.days_active ?? 0)} />
          <Stat label="streak" value={`${stats?.current_streak ?? 0}d`} />
        </div>

        {/* Heatmap */}
        <div
          style={{
            background: colors.surface.primary,
            border: `1px solid ${colors.border.subtle}`,
            borderRadius: radii.lg,
            padding: spacing.base,
          }}
        >
          <Text variant="label" tone="secondary">
            Focus activity
          </Text>
          <div style={{ marginTop: spacing.sm }}>
            <Heatmap data={heatmap} weeks={26} />
          </div>
        </div>

        {/* Auto-tracked coding time (Cue, or an earlier tracker) */}
        {codingStats && codingStats.total_seconds > 0 ? (
          <div
            style={{
              background: colors.surface.primary,
              border: `1px solid ${colors.border.subtle}`,
              borderRadius: radii.lg,
              padding: spacing.base,
              display: "flex",
              flexDirection: "column",
              gap: spacing.base,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Keyboard size={15} color={colors.surface.skillhive} />
              <Text variant="label" tone="secondary" style={{ flex: 1 }}>
                Coded (auto-tracked)
              </Text>
              {isOwnProfile && !codingStats.is_public && (
                <Text variant="caption" tone="tertiary">
                  private
                </Text>
              )}
            </div>

            <div style={{ display: "flex", gap: spacing.lg, flexWrap: "wrap" }}>
              <div>
                <Text variant="title" tone="skillhive" weight={900} style={{ lineHeight: 1 }}>
                  {formatDuration(codingStats.total_seconds)}
                </Text>
                <Text variant="caption" tone="tertiary">
                  total coded
                </Text>
              </div>
              <div>
                <Text variant="title" tone="skillhive" weight={900} style={{ lineHeight: 1 }}>
                  {codingStats.current_streak_days}d
                </Text>
                <Text variant="caption" tone="tertiary">
                  coding streak
                </Text>
              </div>
              <div>
                <Text variant="title" tone="skillhive" weight={900} style={{ lineHeight: 1 }}>
                  {codingStats.longest_streak_days}d
                </Text>
                <Text variant="caption" tone="tertiary">
                  best streak
                </Text>
              </div>
            </div>

            <MiniHeatmap daily={codingStats.daily_breakdown} />

            {codingStats.language_breakdown.length > 0 && (
              <LanguageBreakdown breakdown={codingStats.language_breakdown} maxItems={5} />
            )}

            {isOwnProfile && (
              <button
                onClick={() => navigate("/settings/trackers")}
                style={{
                  alignSelf: "flex-start",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: colors.text.tertiary,
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: "inherit",
                  padding: 0,
                }}
              >
                Manage tracker →
              </button>
            )}
          </div>
        ) : isOwnProfile ? (
          /* Own profile, nothing tracked yet — nudge to connect */
          <div
            style={{
              background: colors.surface.primary,
              border: `1px solid ${colors.border.subtle}`,
              borderRadius: radii.lg,
              padding: spacing.base,
              display: "flex",
              flexDirection: "column",
              gap: spacing.sm,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Keyboard size={15} color={colors.surface.skillhive} />
              <Text variant="label" tone="secondary" style={{ flex: 1 }}>
                Show your coding time
              </Text>
            </div>
            <Text variant="bodySm" tone="tertiary">
              Connect Cue and your coding time shows up here on its own.
              Project names stay private until you share them.
            </Text>
            <button
              onClick={() => navigate("/settings/trackers")}
              style={{
                alignSelf: "flex-start",
                padding: "8px 16px",
                borderRadius: radii.pill,
                border: "none",
                background: colors.surface.skillhive,
                color: "#111",
                fontSize: 13,
                fontWeight: 800,
                fontFamily: "inherit",
                cursor: "pointer",
              }}
            >
              Connect Cue
            </button>
          </div>
        ) : null}

        {/* Projects */}
        {projects.length > 0 && (
          <div
            style={{
              background: colors.surface.primary,
              border: `1px solid ${colors.border.subtle}`,
              borderRadius: radii.lg,
              padding: spacing.base,
              display: "flex",
              flexDirection: "column",
              gap: spacing.sm,
            }}
          >
            <Text variant="label" tone="secondary">
              Projects
            </Text>
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => navigate(`/projects/${p.id}`)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: spacing.sm,
                  padding: `${spacing.sm}px 0`,
                  background: "transparent",
                  border: "none",
                  borderBottom: `1px solid ${colors.border.subtle}`,
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: "inherit",
                }}
              >
                <FolderGit2 size={16} color={colors.text.tertiary} />
                <Text variant="bodySm" weight={600} style={{ flex: 1 }}>
                  {p.name}
                </Text>
                <Text variant="caption" tone="tertiary">
                  {formatHours(p.total_minutes)} · {p.total_sessions} sessions
                </Text>
              </button>
            ))}
          </div>
        )}

        {/* Recently shipped */}
        {shipped.length > 0 && (
          <div
            style={{
              background: colors.surface.primary,
              border: `1px solid ${colors.border.subtle}`,
              borderRadius: radii.lg,
              padding: spacing.base,
              display: "flex",
              flexDirection: "column",
              gap: spacing.sm,
            }}
          >
            <Text variant="label" tone="secondary">
              Recently shipped
            </Text>
            {shipped.map((s) => (
              <div key={s.id} style={{ display: "flex", gap: spacing.sm, alignItems: "flex-start" }}>
                <Clock size={15} color={colors.tint.success} style={{ marginTop: 3 }} />
                <Text variant="bodySm" tone="secondary" style={{ flex: 1 }}>
                  {s.body}
                </Text>
                <Text variant="caption" tone="tertiary">
                  {s.actual_min ? `${s.actual_min}m` : ""}
                </Text>
              </div>
            ))}
          </div>
        )}

        {/* Posts (readable when signed in) */}
        {posts.length > 0 && (
          <section aria-label="Posts" style={{ display: "flex", flexDirection: "column", gap: spacing.sm }}>
            <Text variant="label" tone="secondary">
              Posts
            </Text>
            {posts.map((post) => (
              <PostCard key={post.id} post={post} myId={me?.id ?? null} hideAuthor />
            ))}
          </section>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const { colors, radii } = useTokens();
  return (
    <div
      style={{
        flex: 1,
        minWidth: 120,
        background: colors.surface.primary,
        border: `1px solid ${colors.border.subtle}`,
        borderRadius: radii.lg,
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <Text variant="title" tone="skillhive" weight={900} style={{ lineHeight: 1 }}>
        {value}
      </Text>
      <Text
        variant="caption"
        tone="tertiary"
        style={{ textTransform: "uppercase", letterSpacing: 1 }}
      >
        {label}
      </Text>
    </div>
  );
}
