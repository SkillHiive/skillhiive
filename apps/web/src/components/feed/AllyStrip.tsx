import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { RefreshCw, UserPlus } from "lucide-react";
import { Avatar } from "@skillhiive/ui";
import { Skeleton } from "@/components/ui/States";
import {
  fetchAllyStrip,
  fetchPresence,
  orderAllies,
  withPresence,
  type AllyCardModel,
} from "@/lib/allyStrip";
import { timeAgo } from "@/lib/timeAgo";

/** How often presence is checked while the tab is visible. */
export const PRESENCE_REFRESH_MS = 30_000;

/** With fewer allies than this, the strip ends with an "add ally" card. */
const FEW_ALLIES = 3;

const LIVE = "#fffd01";

/** Phones: one row that scrolls sideways. Wider screens: a grid that wraps. */
const ROW =
  "-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0";
const CARD =
  "flex w-[152px] shrink-0 snap-start flex-col gap-2 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-primary)] p-3 sm:w-auto";

function profileHref(card: AllyCardModel): string {
  return card.username ? `/p/${encodeURIComponent(card.username)}` : `/profile/${card.id}`;
}

function AllyCard({ card, now }: { card: AllyCardModel; now: number }) {
  const latest = card.latest;
  return (
    <article className={`ui-lift ${CARD} min-w-0 sm:flex-1`} aria-label={card.name}>
      <Link to={profileHref(card)} className="flex min-w-0 items-center gap-2">
        {/* A yellow ring means "in a room now". */}
        <span
          className="shrink-0 rounded-full"
          style={{ boxShadow: card.live ? `0 0 0 2px var(--color-surface-primary), 0 0 0 4px ${LIVE}` : undefined }}
        >
          <Avatar name={card.name} source={card.avatar} size={32} />
        </span>
        <span className="min-w-0 truncate text-sm font-semibold text-[var(--color-text-primary)]">{card.name}</span>
      </Link>

      {card.live ? (
        <div className="flex min-w-0 items-center gap-1.5">
          <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full" style={{ background: LIVE, boxShadow: "0 0 0 1px rgba(0,0,0,0.25)" }} />
          <span className="min-w-0 flex-1 truncate text-xs font-medium text-[var(--color-text-secondary)]" title={card.live.room}>
            {card.live.room}
          </span>
          <Link
            to={`/rooms/${encodeURIComponent(card.live.room)}`}
            className="ui-press inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-xs font-bold text-black"
            style={{ background: LIVE }}
            aria-label={`Join ${card.name} in ${card.live.room}`}
          >
            Join
          </Link>
        </div>
      ) : card.lastActiveAt ? (
        <time
          dateTime={card.lastActiveAt}
          title={new Date(card.lastActiveAt).toLocaleString()}
          className="text-xs text-[var(--color-text-tertiary)]"
        >
          {timeAgo(card.lastActiveAt, now)}
        </time>
      ) : null}

      {latest &&
        (latest.postId ? (
          <Link
            to={`/post/${latest.postId}`}
            className="line-clamp-2 text-[13px] leading-snug break-words text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          >
            {latest.title}
          </Link>
        ) : (
          <p className="line-clamp-2 text-[13px] leading-snug break-words text-[var(--color-text-secondary)]">{latest.title}</p>
        ))}
    </article>
  );
}

function AddAllyCard() {
  return (
    <Link
      to="/rooms"
      className={`ui-lift ${CARD} items-center justify-center border-dashed text-[var(--color-text-secondary)]`}
      style={{ minHeight: 96 }}
    >
      <UserPlus size={18} aria-hidden="true" />
      <span className="text-sm font-semibold">Add ally</span>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className={CARD} aria-hidden="true">
      <div className="flex items-center gap-2">
        <Skeleton className="size-8 shrink-0 !rounded-full" />
        <Skeleton className="h-3.5 flex-1" />
      </div>
      <Skeleton className="h-3 w-10" />
      <Skeleton className="h-3 w-full" />
    </div>
  );
}

/**
 * One card per ally: who they are, whether they're in a room now, and the last thing of
 * theirs you can see. Newest activity first; nothing is ranked or scored.
 */
export function AllyStrip({ allyIds }: { allyIds: string[] | null }) {
  const [cards, setCards] = useState<AllyCardModel[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // A new array with the same people must not reload the strip.
  const idsKey = allyIds ? [...allyIds].sort().join(",") : null;
  const ids = useMemo(() => (idsKey === null ? null : idsKey ? idsKey.split(",") : []), [idsKey]);
  const loaded = useRef(false);

  const load = useCallback(async (who: string[]) => {
    try {
      const next = await fetchAllyStrip(who);
      setCards(next);
      setFailed(false);
      loaded.current = true;
    } catch {
      // A failed reload keeps what is on screen.
      if (!loaded.current) setFailed(true);
    } finally {
      setNow(Date.now());
    }
  }, []);

  useEffect(() => {
    if (!ids) return;
    let cancelled = false;
    fetchAllyStrip(ids).then(
      (next) => {
        if (cancelled) return;
        setCards(next);
        setFailed(false);
        setNow(Date.now());
        loaded.current = true;
      },
      () => {
        if (!cancelled && !loaded.current) setFailed(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [ids]);

  // Presence only: swapped in place, so nothing flashes or shows a spinner.
  useEffect(() => {
    if (!ids || ids.length === 0) return;
    let cancelled = false;
    async function refresh() {
      if (document.visibilityState !== "visible") return;
      try {
        const rows = await fetchPresence(ids!);
        if (cancelled) return;
        const at = Date.now();
        setCards((prev) => (prev ? orderAllies(withPresence(prev, rows, at)) : prev));
        setNow(at);
      } catch {
        // Keep the last known presence.
      }
    }
    const timer = setInterval(() => void refresh(), PRESENCE_REFRESH_MS);
    const onVisible = () => void refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [ids]);

  async function retry() {
    if (!ids) return;
    setRetrying(true);
    await load(ids);
    setRetrying(false);
  }

  const loading = ids === null || (ids.length > 0 && cards === null && !failed);

  return (
    <section aria-label="Allies" className="mb-4">
      <div className={ROW}>
        {loading ? (
          Array.from({ length: 3 }, (_, i) => <SkeletonCard key={i} />)
        ) : failed ? (
          <div className={`${CARD} items-center justify-center`} style={{ minHeight: 96 }} role="alert">
            <button
              type="button"
              onClick={() => void retry()}
              disabled={retrying}
              aria-label="Retry loading allies"
              className="ui-press inline-flex h-8 items-center gap-1.5 rounded-full border border-[var(--color-border-strong)] px-3 text-xs font-semibold text-[var(--color-text-primary)] disabled:opacity-60"
            >
              <RefreshCw size={13} aria-hidden="true" className={retrying ? "animate-spin" : undefined} />
              Retry
            </button>
          </div>
        ) : (
          <>
            {(cards ?? []).map((card, i) => (
              <div key={card.id} className="ui-rise flex min-w-0 shrink-0 snap-start" style={{ animationDelay: `${Math.min(i, 6) * 30}ms` }}>
                <AllyCard card={card} now={now} />
              </div>
            ))}
            {(cards?.length ?? 0) < FEW_ALLIES && <AddAllyCard />}
          </>
        )}
      </div>
    </section>
  );
}
