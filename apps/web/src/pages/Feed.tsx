import React, { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { fetchAllyIds } from "@/lib/allies";
import { loadErrorMessage, withTimeout } from "@/lib/load";
import { ErrorState } from "@/components/ui/ErrorState";
import {
  Briefcase,
  Camera,
  Plus,
  X,
  ChevronDown,
  ArrowUp,
} from "lucide-react";
import SwipeLayout from "@/components/SwipeLayout";
import { Avatar, Text } from "@skillhiive/ui";
import { PostCard, type PostModel } from "@/components/feed/PostCards";
import { useTokens } from "@/theme";
import { errorMessage } from "@/lib/errors";


type PostType = "project" | "offer" | "media";
type RawPost = PostModel & { post_type: PostType };
/** What the composer can make. Older "offer" posts still display, but new ones can't be written. */
type ComposeType = "project" | "media";


const PAGE_SIZE = 10;

const FEED_QUERY = `
  id,
  user_id,
  post_type,
  caption,
  likes_count,
  comments_count,
  created_at,
  profiles:profiles!posts_user_id_profiles_fkey (
    id,
    username,
    avatar
  ),
  project_posts:project_posts!project_posts_post_id_fkey (
    title,
    description,
    started_at,
    ended_at,
    status
  ),
  offer_posts:offer_posts!offer_posts_post_id_fkey (
    company,
    role,
    salary_range,
    location,
    offer_type
  ),
  post_images:post_images!post_images_post_id_fkey (
    url,
    sort_order
  )
`;

const POST_TYPES: {
  value: ComposeType;
  label: string;
  Icon: React.FC<{ size: number }>;
}[] = [
  { value: "project", label: "Project", Icon: Briefcase },
  { value: "media", label: "Media", Icon: Camera },
];

function todayLabel(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}


function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const { colors } = useTokens();
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 14px",
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        fontFamily: "inherit",
        border: `1px solid ${active ? colors.surface.skillhive + "66" : colors.border.subtle}`,
        background: active ? colors.surface.skillhive + "1a" : "transparent",
        color: active ? colors.surface.skillhive : colors.text.tertiary,
        transition: "all 0.15s",
      }}
    >
      {children}
    </button>
  );
}


async function uploadPostImage(file: File): Promise<string> {
  const fileName = `${Date.now()}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from("post-images")
    .upload(fileName, file, { contentType: file.type || "image/jpeg" });
  if (uploadError) throw uploadError;
  const { data } = supabase.storage.from("post-images").getPublicUrl(fileName);
  return data.publicUrl;
}

function ComposeBar({ onPosted }: { onPosted: () => void }) {
  const { profile } = useProfile();
  const { colors, spacing, radii } = useTokens();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ComposeType>("project");
  const [caption, setCaption] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [currentlyWorking, setCurrentlyWorking] = useState(true);
  const [startedAt, setStartedAt] = useState<string>(
    new Date().toISOString().slice(0, 10),
  );
  const [endedAt, setEndedAt] = useState<string>("");

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const canPost =
    caption.trim().length > 0 &&
    (type !== "project" || title.trim().length > 0);

  function reset() {
    setCaption("");
    setTitle("");
    setDescription("");
    setCurrentlyWorking(true);
    setStartedAt(new Date().toISOString().slice(0, 10));
    setEndedAt("");
    setImageFile(null);
    setImagePreview(null);
    setError(null);
    setType("project");
    setOpen(false);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function handlePost() {
    if (!canPost || posting) return;
    setError(null);
    try {
      setPosting(true);
      if (!profile?.id) throw new Error("You're signed out. Sign in again to post.");

      const { data: created, error: postErr } = await supabase
        .from("posts")
        .insert({
          user_id: profile.id,
          post_type: type,
          caption: caption.trim() || null,
        })
        .select("id")
        .single();
      if (postErr) throw postErr;
      const postId = created.id;

      if (type === "project") {
        const { error: e } = await supabase.from("project_posts").insert({
          post_id: postId,
          title: title.trim(),
          description: description.trim() || null,
          started_at: startedAt || null,
          ended_at: currentlyWorking || !endedAt ? null : endedAt,
          status: currentlyWorking ? "active" : "completed",
        });
        if (e) throw e;
      }

      if (imageFile) {
        const publicUrl = await uploadPostImage(imageFile);
        const { error: e } = await supabase
          .from("post_images")
          .insert({ post_id: postId, url: publicUrl, sort_order: 0 });
        if (e) throw e;
      }

      reset();
      onPosted();
    } catch (e) {
      setError(errorMessage(e) ?? "Something went wrong.");
    } finally {
      setPosting(false);
    }
  }

  const displayName = profile?.username ?? profile?.displayname ?? "ME";

  const field: React.CSSProperties = {
    width: "100%",
    background: colors.surface.secondary,
    border: `1px solid ${colors.border.subtle}`,
    borderRadius: radii.md,
    padding: "10px 14px",
    fontSize: 14,
    color: colors.text.primary,
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: spacing.md,
          padding: `${spacing.md}px ${spacing.base}px`,
          borderRadius: radii.xl,
          border: `1px dashed ${colors.border.strong}`,
          background: "transparent",
          textAlign: "left",
          marginBottom: spacing.lg,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        <Avatar name={displayName} source={profile?.avatar ?? null} size={32} />
        <Text variant="bodySm" tone="tertiary" style={{ flex: 1 }}>
          Share your progress…
        </Text>
        <span
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            background: colors.surface.skillhive + "1a",
            color: colors.surface.skillhive,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Plus size={16} strokeWidth={2.5} />
        </span>
      </button>
    );
  }

  return (
    <div
      style={{
        border: `1px solid ${colors.border.subtle}`,
        borderRadius: radii.xl,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        background: colors.surface.primary,
        display: "flex",
        flexDirection: "column",
        gap: spacing.base,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text variant="subtitle">New Post</Text>
        <button
          onClick={reset}
          style={{
            width: 26,
            height: 26,
            borderRadius: "50%",
            border: "none",
            background: "transparent",
            color: colors.text.tertiary,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <X size={14} strokeWidth={2.5} />
        </button>
      </div>

      {/* Type selector */}
      <div style={{ display: "flex", gap: spacing.sm }}>
        {POST_TYPES.map(({ value, label, Icon }) => (
          <Chip
            key={value}
            active={type === value}
            onClick={() => setType(value)}
          >
            <Icon size={13} />
            {label}
          </Chip>
        ))}
      </div>

      {/* Caption */}
      <div>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder={
            type === "project"
              ? "What are you building? Share an update…"
              : type === "media"
                ? "What's the story behind this?"
                : "Tell us about this opportunity…"
          }
          maxLength={500}
          rows={3}
          style={{ ...field, resize: "none", lineHeight: 1.5 }}
        />
        <Text
          variant="caption"
          align="right"
          style={{
            display: "block",
            marginTop: 4,
            color:
              caption.length > 400 ? colors.tint.warning : colors.text.tertiary,
          }}
        >
          {caption.length}/500
        </Text>
      </div>

      {/* PROJECT FIELDS */}
      {type === "project" && (
        <div
          style={{ display: "flex", flexDirection: "column", gap: spacing.md }}
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Project title *"
            maxLength={80}
            style={{ ...field, fontWeight: 600 }}
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tech stack, what you built, key learnings…"
            maxLength={300}
            rows={3}
            style={{ ...field, resize: "none", lineHeight: 1.5 }}
          />
          <div style={{ display: "flex", gap: spacing.md }}>
            <label
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <Text variant="caption" tone="tertiary">
                Started
              </Text>
              <input
                type="date"
                value={startedAt}
                onChange={(e) => setStartedAt(e.target.value)}
                max={endedAt || undefined}
                style={field}
              />
            </label>
            <label
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: 4,
                opacity: currentlyWorking ? 0.45 : 1,
              }}
            >
              <Text variant="caption" tone="tertiary">
                Ended
              </Text>
              <input
                type="date"
                value={endedAt}
                disabled={currentlyWorking}
                onChange={(e) => setEndedAt(e.target.value)}
                min={startedAt || undefined}
                max={new Date().toISOString().split("T")[0]}
                style={field}
              />
            </label>
          </div>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: spacing.sm,
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            <input
              type="checkbox"
              checked={currentlyWorking}
              onChange={(e) => {
                setCurrentlyWorking(e.target.checked);
                if (e.target.checked) setEndedAt("");
              }}
              style={{
                width: 16,
                height: 16,
                accentColor: colors.surface.skillhive,
              }}
            />
            <Text variant="bodySm" tone="secondary">
              I'm currently working on this
            </Text>
          </label>
        </div>
      )}

      {/* Cover image */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
        {imagePreview ? (
          <div
            style={{
              position: "relative",
              borderRadius: radii.lg,
              overflow: "hidden",
            }}
          >
            <img
              src={imagePreview}
              alt=""
              style={{
                width: "100%",
                height: 200,
                objectFit: "cover",
                display: "block",
              }}
            />
            <button
              onClick={() => {
                setImageFile(null);
                setImagePreview(null);
              }}
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "rgba(0,0,0,0.6)",
                border: "none",
                color: "#fff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={14} strokeWidth={2.5} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              padding: "24px 0",
              borderRadius: radii.lg,
              border: `1px dashed ${colors.border.strong}`,
              background: "transparent",
              cursor: "pointer",
            }}
          >
            <Camera size={18} style={{ color: colors.text.tertiary }} />
            <Text variant="bodySm" tone="tertiary">
              Add cover image
            </Text>
            <Text variant="caption" tone="tertiary">
              Optional · 16:9
            </Text>
          </button>
        )}
      </div>

      {error && (
        <div
          style={{
            background: colors.tint.danger + "1a",
            border: `1px solid ${colors.tint.danger}33`,
            borderRadius: radii.sm,
            padding: "8px 12px",
          }}
        >
          <Text variant="bodySm" style={{ color: colors.tint.danger }}>
            {error}
          </Text>
        </div>
      )}

      {/* Actions */}
      <div
        style={{ display: "flex", justifyContent: "flex-end", gap: spacing.sm }}
      >
        <button
          onClick={reset}
          style={{
            padding: "8px 16px",
            borderRadius: radii.md,
            border: `1px solid ${colors.border.subtle}`,
            background: "transparent",
            color: colors.text.secondary,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Cancel
        </button>
        <button
          onClick={handlePost}
          disabled={!canPost || posting}
          style={{
            padding: "8px 20px",
            borderRadius: radii.md,
            border: "none",
            background: colors.surface.skillhive,
            color: colors.text.onTint,
            fontSize: 14,
            fontWeight: 800,
            cursor: !canPost || posting ? "not-allowed" : "pointer",
            opacity: !canPost || posting ? 0.4 : 1,
            fontFamily: "inherit",
          }}
        >
          {posting ? "Publishing…" : "Publish"}
        </button>
      </div>
    </div>
  );
}


/** How often to look for new posts while the tab is visible. Nothing on screen moves until you ask. */
const NEW_POSTS_CHECK_MS = 60_000;

export default function Feed() {
  const session = useAuth();
  const { colors, spacing } = useTokens();
  const myId = session?.user.id ?? null;

  const [authors, setAuthors] = useState<string[] | null>(null);
  const [posts, setPosts] = useState<RawPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "projects">("all");
  const [newCount, setNewCount] = useState(0);

  const isFetchingMore = useRef(false);

  // The feed is you and your allies only: no strangers, no algorithm.
  const feedQuery = useCallback(
    (who: string[]) => {
      let query = supabase
        .from("posts")
        .select(FEED_QUERY)
        .in("user_id", who)
        .order("created_at", { ascending: false });
      if (filter === "projects") query = query.eq("post_type", "project");
      return query;
    },
    [filter],
  );

  const fetchFirstPage = useCallback(async (): Promise<{ who: string[]; rows: RawPost[] }> => {
    if (!myId) throw new Error("You're signed out.");
    const allies = await fetchAllyIds(myId);
    const who = [myId, ...allies];
    const { data, error: fetchErr } = await withTimeout(
      feedQuery(who).limit(PAGE_SIZE).returns<RawPost[]>(),
    );
    if (fetchErr) throw fetchErr;
    return { who, rows: data ?? [] };
  }, [myId, feedQuery]);

  const applyFirstPage = useCallback(({ who, rows }: { who: string[]; rows: RawPost[] }) => {
    setAuthors(who);
    setPosts(rows);
    setHasMore(rows.length === PAGE_SIZE);
    setCursor(rows.at(-1)?.created_at ?? null);
    setNewCount(0);
    setError(null);
    setLoading(false);
  }, []);

  const applyFirstPageError = useCallback((e: unknown) => {
    setError(loadErrorMessage(e, "your feed"));
    setLoading(false);
  }, []);

  const loadFirstPage = useCallback(
    () => fetchFirstPage().then(applyFirstPage, applyFirstPageError),
    [fetchFirstPage, applyFirstPage, applyFirstPageError],
  );

  useEffect(() => {
    if (!myId) return;
    let cancelled = false;
    fetchFirstPage().then(
      (page) => !cancelled && applyFirstPage(page),
      (e) => !cancelled && applyFirstPageError(e),
    );
    return () => {
      cancelled = true;
    };
  }, [myId, fetchFirstPage, applyFirstPage, applyFirstPageError]);

  const fetchMore = useCallback(async () => {
    if (!authors || isFetchingMore.current || !hasMore || !cursor) return;
    isFetchingMore.current = true;
    setLoadingMore(true);
    try {
      const { data, error: fetchErr } = await withTimeout(
        feedQuery(authors).lt("created_at", cursor).limit(PAGE_SIZE).returns<RawPost[]>(),
      );
      if (fetchErr) throw fetchErr;
      const rows = data ?? [];
      setPosts((prev) => [...prev, ...rows]);
      setHasMore(rows.length === PAGE_SIZE);
      setCursor(rows.at(-1)?.created_at ?? cursor);
    } catch {
      // Keep what is already on screen; "Load more" stays, so they can try again.
    } finally {
      setLoadingMore(false);
      isFetchingMore.current = false;
    }
  }, [authors, cursor, hasMore, feedQuery]);

  // Count newer posts in the background and offer them, instead of replacing the list.
  const newest = posts[0]?.created_at ?? null;
  useEffect(() => {
    if (!authors) return;
    const who = authors;
    let cancelled = false;
    async function check() {
      if (document.visibilityState !== "visible") return;
      let query = supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .in("user_id", who);
      if (newest) query = query.gt("created_at", newest);
      if (filter === "projects") query = query.eq("post_type", "project");
      const { count } = await query;
      if (!cancelled && typeof count === "number") setNewCount(count);
    }
    const timer = setInterval(() => void check(), NEW_POSTS_CHECK_MS);
    const onVisible = () => void check();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [authors, newest, filter]);

  async function showNewPosts() {
    window.scrollTo({ top: 0, behavior: "smooth" });
    await loadFirstPage();
  }

  async function retry() {
    setRetrying(true);
    await loadFirstPage();
    setRetrying(false);
  }

  const allyCount = authors ? authors.length - 1 : null;

  const divider = (label: React.ReactNode) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: spacing.base,
        padding: `${spacing.xl}px 0`,
      }}
    >
      <div style={{ flex: 1, height: 1, background: colors.border.subtle }} />
      {label}
      <div style={{ flex: 1, height: 1, background: colors.border.subtle }} />
    </div>
  );

  return (
    <SwipeLayout>
      <div
        style={{
          minHeight: "100vh",
          background: colors.bg.muted,
          paddingTop: 80,
          fontFamily:
            '"popreg", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <main
          style={{
            maxWidth: 640,
            width: "100%",
            margin: "0 auto",
            padding: `0 ${spacing.base}px 120px`,
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              paddingTop: spacing.xl,
              marginBottom: spacing.base,
            }}
          >
            <Text
              variant="caption"
              tone="tertiary"
              weight={700}
              style={{ textTransform: "uppercase", letterSpacing: 0.8 }}
            >
              {todayLabel()}
            </Text>
            {allyCount !== null && (
              <Text variant="caption" tone="secondary">
                {allyCount === 0
                  ? "Only you so far"
                  : `You and ${allyCount} ${allyCount === 1 ? "ally" : "allies"}`}
              </Text>
            )}
          </div>

          {/* Filters */}
          <div
            style={{
              display: "flex",
              gap: spacing.sm,
              marginBottom: spacing.lg,
            }}
          >
            {(["all", "projects"] as const).map((f) => (
              <Chip
                key={f}
                active={filter === f}
                onClick={() => {
                  if (f === filter) return;
                  setLoading(true);
                  setFilter(f);
                }}
              >
                {f === "all" ? "All" : "Projects"}
              </Chip>
            ))}
          </div>

          <ComposeBar onPosted={() => void loadFirstPage()} />

          {newCount > 0 && (
            <div className="sticky top-20 z-10 flex justify-center pb-2">
              <button
                type="button"
                onClick={() => void showNewPosts()}
                className="inline-flex h-9 items-center gap-2 rounded-full bg-[var(--color-text-primary)] px-4 text-sm font-semibold text-[var(--color-bg-canvas)] shadow-lg"
              >
                <ArrowUp size={14} aria-hidden="true" />
                {newCount} new {newCount === 1 ? "post" : "posts"}
              </button>
            </div>
          )}

          {loading ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                padding: "64px 0",
              }}
            >
              <Spinner />
            </div>
          ) : error ? (
            <div style={{ padding: "32px 0" }}>
              <ErrorState message={error} onRetry={() => void retry()} retrying={retrying} />
            </div>
          ) : posts.length === 0 ? (
            <Text
              align="center"
              tone="secondary"
              style={{ display: "block", padding: "64px 0", maxWidth: 420, margin: "0 auto" }}
            >
              {allyCount === 0
                ? "Your feed shows what you and your allies share. Ally someone from their profile and their work appears here."
                : "Nothing shared yet. When you or your allies post, it shows up here."}
            </Text>
          ) : (
            <div>
              {posts.map((post) => (
                <PostCard key={post.id} post={post} myId={myId} />
              ))}

              {loadingMore && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    padding: "32px 0",
                  }}
                >
                  <Spinner />
                </div>
              )}

              {!loadingMore &&
                hasMore &&
                divider(
                  <button
                    type="button"
                    onClick={() => void fetchMore()}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: colors.text.secondary,
                      fontSize: 12,
                      fontWeight: 600,
                      fontFamily: "inherit",
                    }}
                  >
                    <ChevronDown size={14} />
                    Load more posts
                  </button>,
                )}

              {!hasMore &&
                posts.length > 0 &&
                divider(
                  <Text variant="caption" tone="secondary" weight={500}>
                    You're all caught up
                  </Text>,
                )}
            </div>
          )}
        </main>
      </div>
    </SwipeLayout>
  );
}

function Spinner() {
  const { colors } = useTokens();
  return (
    <>
      <style>{`@keyframes feed-spin { to { transform: rotate(360deg); } }`}</style>
      <div
        style={{
          width: 22,
          height: 22,
          border: `2px solid ${colors.border.subtle}`,
          borderTopColor: colors.surface.skillhive,
          borderRadius: "50%",
          animation: "feed-spin 0.8s linear infinite",
        }}
      />
    </>
  );
}
