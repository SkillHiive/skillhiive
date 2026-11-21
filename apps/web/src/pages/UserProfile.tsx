import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Link, useParams } from "react-router";
import { CircleCheck, FolderGit2, Keyboard, Lock, MessageSquare, Pencil, Timer } from "lucide-react";
import AllyButton from "@/components/AllyButton";
import { PostCard, type PostModel } from "@/components/feed/PostCards";
import { ActivityCard } from "@/components/profile/ActivityCard";
import { EditableImage } from "@/components/profile/EditableImage";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState, Skeleton } from "@/components/ui/States";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { countAllies } from "@/lib/allies";
import { loadErrorMessage } from "@/lib/load";
import { fetchUserPosts } from "@/lib/posts";
import { profileSummary } from "@/lib/profileActivity";
import { timeAgo } from "@/lib/timeAgo";
import { fetchUserCodingTime, formatDuration, type UserCodingTime } from "@/lib/timeTracker";
import {
  fetchFocusStats,
  fetchHeatmap,
  fetchPublicProfile,
  fetchRecentShipped,
  fetchUserProjects,
  type FocusStats,
  type HeatmapDay,
  type ProjectWithStats,
  type PublicProfile,
  type ShippedNote,
} from "@/lib/todayData";
import { useTokens } from "@/theme";
import { Text } from "@skillhiive/ui";

const FONT = '"popreg", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

/** Enough focus days for the 26-week heatmap. */
const HEATMAP_DAYS = 7 * 27;
/** Shipped notes to fetch: the list shows the newest few; the day popover can use them all. */
const SHIPPED_FETCH = 50;
const SHIPPED_SHOWN = 8;

/** Everything the page shows, loaded together so it arrives at once. */
interface Loaded {
  for: string;
  profile: PublicProfile | null;
  focus: FocusStats | null;
  focusDays: HeatmapDay[];
  coding: UserCodingTime | null;
  projects: ProjectWithStats[];
  shipped: ShippedNote[];
  /** Posts and allies are only readable when signed in. */
  posts: PostModel[];
  allyCount: number | null;
}

async function loadProfilePage(username: string, signedIn: boolean): Promise<Loaded> {
  const profile = await fetchPublicProfile(username);
  const empty = { focus: null, focusDays: [], coding: null, projects: [], shipped: [], posts: [], allyCount: null };
  if (!profile) return { for: username, profile: null, ...empty };
  const id = profile.id;
  const [focus, focusDays, coding, projects, shipped, posts, allyCount] = await Promise.all([
    fetchFocusStats(id),
    fetchHeatmap(id, HEATMAP_DAYS),
    fetchUserCodingTime(id),
    fetchUserProjects(id),
    fetchRecentShipped(id, SHIPPED_FETCH),
    signedIn ? fetchUserPosts(id).catch((): PostModel[] => []) : Promise.resolve<PostModel[]>([]),
    signedIn ? countAllies(id).catch(() => null) : Promise.resolve(null),
  ]);
  return { for: username, profile, focus, focusDays, coding, projects, shipped, posts, allyCount };
}

/** Sections rise in together, a beat apart. */
function rise(index: number): { className: string; style: CSSProperties } {
  return { className: "ui-rise", style: { animationDelay: `${Math.min(index, 5) * 30}ms` } };
}

export default function UserProfile() {
  const { username } = useParams<{ username: string }>();
  const { colors, spacing } = useTokens();
  const { profile: me } = useProfile();
  const session = useAuth();
  const signedIn = !!session;
  // Wait for the first session read, so posts and allies come in with everything else.
  const authReady = session !== undefined;

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loadError, setLoadError] = useState<{ for: string; message: string } | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!username || !authReady) return;
    let cancelled = false;
    loadProfilePage(username, signedIn).then(
      (next) => {
        if (cancelled) return;
        setLoadError(null);
        setLoaded(next);
      },
      (e: unknown) => {
        if (!cancelled) setLoadError({ for: username, message: loadErrorMessage(e, "this profile") });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [username, signedIn, authReady, attempt]);

  const failed = loadError && loadError.for === username ? loadError.message : null;
  const data = loaded && loaded.for === username ? loaded : null;

  if (failed && !data) {
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
          message={failed}
          onRetry={() => {
            setLoadError(null);
            setAttempt((n) => n + 1);
          }}
        />
      </div>
    );
  }

  if (!data) return <ProfileSkeleton />;

  const profile = data.profile;
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
          padding: spacing.base,
          fontFamily: FONT,
          textAlign: "center",
        }}
      >
        <Text tone="secondary" style={{ overflowWrap: "anywhere" }}>
          Nobody here goes by @{username}.
        </Text>
        <Link to={signedIn ? "/home" : "/"} style={{ fontWeight: 600 }}>
          {signedIn ? "Go to Today" : "Go to the home page"}
        </Link>
      </div>
    );
  }

  const isOwn = !!me && me.id === profile.id;
  const displayName = profile.displayname ?? profile.username ?? "—";
  // The server hides private coding time from visitors; this keeps it hidden if it ever doesn't.
  const coding = data.coding && (isOwn || data.coding.is_public) ? data.coding : null;
  const summary = profileSummary(coding, data.focus);
  const codingPrivate = isOwn && !!coding && coding.total_seconds > 0 && !coding.is_public;
  const shipped = data.shipped.slice(0, SHIPPED_SHOWN);
  const showBanner = !!profile.banner || isOwn;

  const patchProfile = (patch: Partial<PublicProfile>) =>
    setLoaded((prev) => (prev?.profile ? { ...prev, profile: { ...prev.profile, ...patch } } : prev));

  let section = 0;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: colors.bg.muted,
        paddingTop: 88,
        paddingBottom: 160,
        fontFamily: FONT,
        overflowX: "clip",
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
        <div {...rise(section++)}>
          {showBanner && (
            <EditableImage
              kind="banner"
              editable={isOwn}
              radius={16}
              onSaved={(url) => patchProfile({ banner: url })}
              style={{ width: "100%", aspectRatio: "1000 / 350" }}
            >
              <div
                className="size-full overflow-hidden rounded-2xl border border-[var(--color-border-subtle)]"
                style={{
                  background: profile.banner
                    ? colors.surface.secondary
                    : `linear-gradient(135deg, ${colors.surface.secondary}, ${colors.surface.skillhive}22, ${colors.surface.secondary})`,
                }}
              >
                {profile.banner && <img src={profile.banner} alt="" className="block size-full object-cover" />}
              </div>
            </EditableImage>
          )}

          <div
            style={{
              display: "flex",
              gap: spacing.base,
              alignItems: showBanner ? "flex-end" : "center",
              marginTop: showBanner ? spacing.sm : 0,
              paddingLeft: showBanner ? spacing.base : 0,
            }}
          >
            <EditableImage
              kind="avatar"
              editable={isOwn}
              radius="50%"
              onSaved={(url) => patchProfile({ avatar: url })}
              // Over a banner, the avatar rises into it; the name stays below it.
              style={{ width: 80, height: 80, flexShrink: 0, position: "relative", marginTop: showBanner ? -44 : 0 }}
            >
              <div
                className="flex size-full items-center justify-center overflow-hidden rounded-full"
                style={{ border: `3px solid ${colors.bg.muted}`, background: colors.surface.secondary }}
              >
                {profile.avatar ? (
                  <img src={profile.avatar} alt={displayName} className="block size-full object-cover" />
                ) : (
                  <Text variant="title" tone="skillhive" weight={900}>
                    {(displayName[0] ?? "?").toUpperCase()}
                  </Text>
                )}
              </div>
            </EditableImage>

            <div style={{ minWidth: 0, flex: 1 }}>
              <Text as="h1" variant="headline" weight={900} style={{ display: "block", letterSpacing: -0.5, overflowWrap: "anywhere" }}>
                {displayName}
              </Text>
              {profile.username && (
                <Text
                  tone="secondary"
                  title={`@${profile.username}`}
                  style={{
                    display: "block",
                    fontFamily: "monospace",
                    fontSize: 13,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  @{profile.username}
                </Text>
              )}
            </div>
          </div>

          <div style={{ marginTop: spacing.sm, display: "flex", flexDirection: "column", gap: spacing.sm }}>
            {profile.bio && (
              <Text variant="bodySm" tone="secondary" style={{ display: "block", overflowWrap: "anywhere" }}>
                {profile.bio}
              </Text>
            )}
            <div className="flex flex-wrap items-center gap-3">
              {isOwn ? (
                <Link
                  to="/settings/profile"
                  className="ui-press inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--color-border-subtle)] px-3 text-[13px] font-bold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                >
                  <Pencil size={13} aria-hidden="true" />
                  Edit profile
                </Link>
              ) : (
                <AllyButton
                  profileId={profile.id}
                  returnTo={`/p/${encodeURIComponent(profile.username ?? username ?? "")}`}
                  onAlliesChanged={(d) =>
                    setLoaded((prev) => (prev ? { ...prev, allyCount: Math.max(0, (prev.allyCount ?? 0) + d) } : prev))
                  }
                />
              )}
              {data.allyCount !== null && data.allyCount > 0 && (
                <span className="text-sm text-[var(--color-text-tertiary)]">
                  <b className="font-extrabold text-[var(--color-text-primary)] tabular-nums">{data.allyCount}</b>{" "}
                  {data.allyCount === 1 ? "ally" : "allies"}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* The one summary and heatmap */}
        {summary ? (
          <div {...rise(section++)}>
            <ActivityCard
              summary={summary}
              coding={coding}
              focusDays={data.focusDays}
              shipped={data.shipped}
              privateToOwner={codingPrivate}
            />
          </div>
        ) : isOwn ? (
          <div {...rise(section++)}>
            <EmptyState
              icon={<Keyboard size={20} />}
              title="No time tracked yet"
              action={<ActionLink to="/settings/trackers">Connect Cue</ActionLink>}
            />
          </div>
        ) : null}

        {data.projects.length > 0 ? (
          <Card label="Projects" {...rise(section++)}>
            {data.projects.map((p) => (
              <Link
                key={p.id}
                to={`/projects/${p.id}`}
                className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors duration-[var(--dur-hover)] hover:bg-[var(--color-overlay-press)]"
              >
                <FolderGit2 size={16} aria-hidden="true" className="shrink-0 text-[var(--color-text-tertiary)]" />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--color-text-primary)]">{p.name}</span>
                {isOwn && p.is_public === false && (
                  <Lock size={13} aria-label="Only you" className="shrink-0 text-[var(--color-text-tertiary)]" />
                )}
                {p.total_minutes > 0 && (
                  <span title="focus" className="inline-flex shrink-0 items-center gap-1 text-xs text-[var(--color-text-tertiary)] tabular-nums">
                    <Timer size={12} aria-hidden="true" />
                    {formatDuration(p.total_minutes * 60)}
                  </span>
                )}
              </Link>
            ))}
          </Card>
        ) : isOwn ? (
          <div {...rise(section++)}>
            <EmptyState
              icon={<FolderGit2 size={20} />}
              title="No projects yet"
              action={<ActionLink to="/home">Go to Today</ActionLink>}
            />
          </div>
        ) : null}

        {shipped.length > 0 ? (
          <Card label="Shipped" {...rise(section++)}>
            {shipped.map((s) => (
              <div key={s.id} className="flex items-start gap-3 py-1.5">
                <CircleCheck size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--color-tint-success)]" />
                <span className="min-w-0 flex-1 text-sm text-[var(--color-text-secondary)]" style={{ overflowWrap: "anywhere" }}>
                  {s.body}
                </span>
                <time dateTime={s.created_at} className="shrink-0 text-xs text-[var(--color-text-tertiary)] tabular-nums">
                  {timeAgo(s.created_at)}
                </time>
              </div>
            ))}
          </Card>
        ) : isOwn ? (
          <div {...rise(section++)}>
            <EmptyState
              icon={<CircleCheck size={20} />}
              title="Nothing shipped yet"
              action={<ActionLink to="/home">Go to Today</ActionLink>}
            />
          </div>
        ) : null}

        {/* Posts are readable when signed in. */}
        {data.posts.length > 0 ? (
          <section aria-label="Posts" {...rise(section++)}>
            <div style={{ display: "flex", flexDirection: "column", gap: spacing.sm }}>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">Posts</h2>
              {data.posts.map((post) => (
                <PostCard key={post.id} post={post} myId={me?.id ?? null} hideAuthor />
              ))}
            </div>
          </section>
        ) : isOwn ? (
          <div {...rise(section++)}>
            <EmptyState
              icon={<MessageSquare size={20} />}
              title="No posts yet"
              action={<ActionLink to="/feed">Go to Feed</ActionLink>}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Card({
  label,
  className,
  style,
  children,
}: {
  label: string;
  className: string;
  style: CSSProperties;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={label}
      className={`flex flex-col rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-primary)] p-4 ${className}`}
      style={style}
    >
      <h2 className="mb-1 text-xs font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">{label}</h2>
      {children}
    </section>
  );
}

function ActionLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="ui-press inline-flex h-9 items-center rounded-full bg-[var(--color-tint-primary)] px-4 text-sm font-semibold text-[var(--color-text-onTint)]"
    >
      {children}
    </Link>
  );
}

/** Shaped like the profile, so nothing jumps when it arrives. */
function ProfileSkeleton() {
  const { colors, spacing } = useTokens();
  return (
    <div role="status" aria-label="Loading profile" style={{ minHeight: "100vh", background: colors.bg.muted, paddingTop: 88 }}>
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
        <div style={{ display: "flex", alignItems: "center", gap: spacing.base }}>
          <Skeleton style={{ width: 80, height: 80, borderRadius: 999, flexShrink: 0 }} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
            <Skeleton style={{ height: 22, width: "45%" }} />
            <Skeleton style={{ height: 14, width: "30%" }} />
          </div>
        </div>
        <Skeleton style={{ height: 36, width: 120, borderRadius: 999 }} />
        <Skeleton style={{ height: 200, borderRadius: 16 }} />
        <Skeleton style={{ height: 120, borderRadius: 16 }} />
      </div>
    </div>
  );
}
