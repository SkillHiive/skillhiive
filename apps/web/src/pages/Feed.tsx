import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { ArrowUp, ChevronDown, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { fetchAllyIds } from "@/lib/allies";
import { loadErrorMessage, withTimeout } from "@/lib/load";
import { POST_SELECT } from "@/lib/posts";
import { groupByDay } from "@/lib/feedDays";
import { onPostChange } from "@/lib/postDetail";
import { ErrorState } from "@/components/ui/ErrorState";
import { Segmented } from "@/components/ui/Segmented";
import { EmptyState, Skeleton } from "@/components/ui/States";
import SwipeLayout from "@/components/SwipeLayout";
import { PostCard, type PostModel } from "@/components/feed/PostCards";
import { FloorLine, PeopleCard, RoomsCard } from "@/components/home/FloorRail";
import { useActiveRooms } from "@/hooks/useActiveRooms";
import { useFollowing } from "@/hooks/useFollowing";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { lastClockOffset } from "@/lib/room";
import { Composer } from "@/components/feed/Composer";
import { useTokens } from "@/theme";

const PAGE_SIZE = 10;

/** How often to look for new posts while the tab is visible. Nothing on screen moves until you ask. */
const NEW_POSTS_CHECK_MS = 60_000;

/** Where sticky things sit: just under the floating nav. */
const STICKY_TOP = "top-[76px]";

type Filter = "all" | "projects";

/** A placeholder shaped like a post card. */
function SkeletonCard() {
  return (
    <div
      aria-hidden="true"
      className="mb-3 flex flex-col gap-3 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-primary)] p-4"
    >
      <div className="flex items-center gap-2">
        <Skeleton className="size-[30px] shrink-0 !rounded-full" />
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-3 w-8" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-5 w-10" />
        <Skeleton className="h-5 w-10" />
      </div>
    </div>
  );
}

function SkeletonTimeline() {
  return (
    <div role="status" aria-label="Loading" className="pt-9">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} style={{ opacity: 1 - i * 0.2 }}>
          <SkeletonCard />
        </div>
      ))}
    </div>
  );
}

export default function Feed() {
  const session = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  // A draft handed over by leaving a room, read once; the history entry is cleared so a reload
  // or going back doesn't open it again.
  const [draft] = useState<string | null>(() => {
    const d = (location.state as { draft?: unknown } | null)?.draft;
    return typeof d === "string" && d.trim() ? d : null;
  });
  useEffect(() => {
    if (draft !== null) navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { colors } = useTokens();
  const myId = session?.user.id ?? null;

  const [authors, setAuthors] = useState<string[] | null>(null);
  const [posts, setPosts] = useState<PostModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [newCount, setNewCount] = useState(0);

  const isFetchingMore = useRef(false);

  // The feed is you and your allies only: no strangers, no algorithm.
  const feedQuery = useCallback(
    (who: string[]) => {
      let query = supabase
        .from("posts")
        .select(POST_SELECT)
        .in("user_id", who)
        .order("created_at", { ascending: false });
      if (filter === "projects") query = query.eq("post_type", "project");
      return query;
    },
    [filter],
  );

  const fetchFirstPage = useCallback(async (): Promise<{ who: string[]; rows: PostModel[] }> => {
    if (!myId) throw new Error("You're signed out.");
    const allies = await fetchAllyIds(myId);
    const who = [myId, ...allies];
    const { data, error: fetchErr } = await withTimeout(
      feedQuery(who).limit(PAGE_SIZE).returns<PostModel[]>(),
    );
    if (fetchErr) throw fetchErr;
    return { who, rows: data ?? [] };
  }, [myId, feedQuery]);

  const applyFirstPage = useCallback(({ who, rows }: { who: string[]; rows: PostModel[] }) => {
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
        feedQuery(authors).lt("created_at", cursor).limit(PAGE_SIZE).returns<PostModel[]>(),
      );
      if (fetchErr) throw fetchErr;
      const rows = data ?? [];
      setPosts((prev) => [...prev, ...rows.filter((r) => !prev.some((p) => p.id === r.id))]);
      setHasMore(rows.length === PAGE_SIZE);
      setCursor(rows.at(-1)?.created_at ?? cursor);
    } catch {
      // Keep what is already on screen; "More" stays, so they can try again.
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

  // Your own post goes straight to the top; nothing reloads.
  const onPosted = useCallback(
    (post: PostModel) => {
      if (filter === "projects" && post.post_type !== "project") return;
      setPosts((prev) => [post, ...prev.filter((p) => p.id !== post.id)]);
    },
    [filter],
  );

  // A post opened in the sheet above was edited, commented on or deleted: match it here.
  useEffect(
    () =>
      onPostChange((change) => {
        if (change.deleted) {
          setPosts((prev) => prev.filter((p) => p.id !== change.id));
          return;
        }
        setPosts((prev) => {
          const i = prev.findIndex((p) => p.id === change.id);
          const cur = prev[i];
          if (!cur) return prev;
          const patch = change.patch;
          const next = { ...cur, ...patch };
          if (next.caption === cur.caption && next.comments_count === cur.comments_count) return prev;
          const copy = [...prev];
          copy[i] = next;
          return copy;
        });
      }),
    [],
  );

  const allyIds = useMemo(() => (authors ? authors.filter((id) => id !== myId) : null), [authors, myId]);

  const days = useMemo(() => groupByDay(posts), [posts]);
  // Wide screens get the rail: open rooms, and the people you follow with their latest work.
  const wide = useMediaQuery("(min-width: 960px)");
  const { rooms } = useActiveRooms();
  const following = useFollowing(wide ? allyIds : null);
  const [clockOffsetMs] = useState(lastClockOffset);

  return (
    <SwipeLayout>
      <div
        style={{
          minHeight: "100vh",
          background: colors.bg.muted,
          paddingTop: 80,
          fontFamily: '"popreg", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <div
          className="mx-auto w-full"
          style={{
            maxWidth: wide ? 1120 : 640,
            padding: `0 ${wide ? 24 : 0}px`,
            display: "grid",
            gridTemplateColumns: wide ? "minmax(0, 1fr) 340px" : "minmax(0, 1fr)",
            gap: wide ? 40 : 0,
            alignItems: "start",
          }}
        >
        <main className="w-full px-4 pb-[120px] pt-6" style={{ minWidth: 0, paddingLeft: wide ? 0 : undefined, paddingRight: wide ? 0 : undefined }}>

          <Composer onPosted={onPosted} draft={draft} />

          <div className="mb-1">
            <Segmented
              label="Show"
              size="sm"
              value={filter}
              onChange={(f) => {
                if (f === filter) return;
                setLoading(true);
                setFilter(f);
              }}
              options={[
                { value: "all", label: "All" },
                { value: "projects", label: "Projects" },
              ]}
            />
          </div>

          {/* Floats over the day headers without taking up room. */}
          {newCount > 0 && !loading && (
            <div className={`sticky ${STICKY_TOP} z-20 h-0`}>
              <div className="flex justify-center pt-1">
                <button
                  type="button"
                  onClick={() => void showNewPosts()}
                  className="ui-press inline-flex h-9 items-center gap-2 rounded-full bg-[var(--color-text-primary)] px-4 text-sm font-semibold text-[var(--color-bg-canvas)] shadow-lg"
                >
                  <ArrowUp size={14} aria-hidden="true" />
                  {newCount} new
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <SkeletonTimeline />
          ) : error ? (
            <div className="py-8">
              <ErrorState message={error} onRetry={() => void retry()} retrying={retrying} />
            </div>
          ) : posts.length === 0 ? (
            <div className="pt-2">
              <EmptyState
                icon={<Sparkles size={22} />}
                title={filter === "projects" ? "No projects yet" : "Nothing shipped yet"}
              />
            </div>
          ) : (
            <div>
              {days.map((day) => (
                <section key={day.key} aria-label={day.label}>
                  <h2
                    className={`sticky ${STICKY_TOP} z-10 -mx-4 px-4 py-2 text-xs font-bold uppercase tracking-wide text-[var(--color-text-tertiary)]`}
                    style={{ background: colors.bg.muted }}
                  >
                    {day.label}
                  </h2>
                  {day.items.map((post, j) => (
                    // New cards rise in; the first few are staggered.
                    <div
                      key={post.id}
                      className="ui-rise"
                      style={{ animationDelay: `${Math.min(day.start + j, 6) * 30}ms` }}
                    >
                      <PostCard post={post} myId={myId} sheet />
                    </div>
                  ))}
                </section>
              ))}

              {loadingMore && <SkeletonCard />}

              {!loadingMore && hasMore && (
                <div className="flex justify-center py-6">
                  <button
                    type="button"
                    onClick={() => void fetchMore()}
                    className="ui-press inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--color-border-subtle)] px-4 text-xs font-semibold text-[var(--color-text-secondary)]"
                  >
                    <ChevronDown size={14} aria-hidden="true" />
                    More
                  </button>
                </div>
              )}

              {!hasMore && (
                <div className="flex items-center gap-4 py-6">
                  <div className="h-px flex-1 bg-[var(--color-border-subtle)]" />
                  <span className="text-xs text-[var(--color-text-tertiary)]">All caught up</span>
                  <div className="h-px flex-1 bg-[var(--color-border-subtle)]" />
                </div>
              )}
              {/* The end of the Feed opens a door: people working right now. */}
              {!hasMore && <FloorLine rooms={rooms} clockOffsetMs={clockOffsetMs} />}
            </div>
          )}
        </main>

        {wide && (
          <aside
            aria-label="Space"
            className="pt-6"
            style={{ position: "sticky", top: 96, display: "flex", flexDirection: "column", gap: 12 }}
          >
            <RoomsCard rooms={rooms} clockOffsetMs={clockOffsetMs} />
            {following && <PeopleCard people={following} />}
          </aside>
        )}
        </div>
      </div>
    </SwipeLayout>
  );
}
