import { SkeletonRows } from "@/components/ui/States";
import { useNavigate } from "react-router";
import { BellOff, Check, X } from "lucide-react";
import { Avatar } from "@skillhiive/ui";
import { ErrorState } from "@/components/ui/ErrorState";
import type { AllyRequest } from "@/hooks/useNotifications";
import { timeAgo } from "@/lib/timeAgo";

interface Props {
  pending: AllyRequest[];
  accepted: AllyRequest[];
  loading: boolean;
  error?: string | null;
  actionError?: string | null;
  acting: string | null;
  accept: (req: AllyRequest) => void;
  decline: (req: AllyRequest) => void;
  onRetry?: () => void;
  /** compact = dropdown variant: denser, and only the newest few allies. */
  compact?: boolean;
  /** called after navigating to a profile (e.g. to close the dropdown). */
  onNavigate?: () => void;
}

const COMPACT_ALLIES = 3;

function Who({ req, onOpen }: { req: AllyRequest; onOpen: () => void }) {
  const name = req.requester.displayname || req.requester.username || "Someone";
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex min-w-0 flex-1 items-center gap-3 text-left"
    >
      <Avatar name={name} source={req.requester.avatar} size={40} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-[var(--color-text-primary)]">
          {name}
        </span>
        <span className="block truncate text-xs text-[var(--color-text-secondary)]">
          {req.requester.username ? `@${req.requester.username} · ` : ""}
          {timeAgo(req.created_at)}
        </span>
      </span>
    </button>
  );
}

export default function NotificationList({
  pending,
  accepted,
  loading,
  error,
  actionError,
  acting,
  accept,
  decline,
  onRetry,
  compact,
  onNavigate,
}: Props) {
  const navigate = useNavigate();

  const open = (req: AllyRequest) => {
    onNavigate?.();
    const { username, id } = req.requester;
    navigate(username ? `/p/${encodeURIComponent(username)}` : `/profile/${id}`);
  };

  if (loading) {
    return (
      <div className="py-2">
        <SkeletonRows rows={compact ? 2 : 3} height={60} />
      </div>
    );
  }

  if (error) return <ErrorState message={error} onRetry={onRetry} />;

  if (pending.length === 0 && accepted.length === 0) {
    return (
      <div className={`flex flex-col items-center gap-2 text-center ${compact ? "py-8" : "py-16"}`}>
        <BellOff size={26} strokeWidth={1.5} aria-hidden="true" className="text-[var(--color-text-secondary)]" />
        <p className="text-sm font-medium text-[var(--color-text-primary)]">You're all caught up</p>
      </div>
    );
  }

  const shownAllies = compact ? accepted.slice(0, COMPACT_ALLIES) : accepted;
  const headingClass =
    "px-1 pb-1 pt-2 font-mono text-[11px] uppercase tracking-wider text-[var(--color-text-secondary)]";

  return (
    <div className="flex flex-col gap-2">
      {actionError && (
        <p role="alert" className="rounded-lg bg-[color-mix(in_srgb,var(--color-tint-danger)_12%,transparent)] px-3 py-2 text-xs text-[var(--color-tint-danger)]">
          {actionError}
        </p>
      )}

      {pending.length > 0 && (
        <section aria-label="Ally requests">
          <h3 className={headingClass}>Ally requests</h3>
          <ul className="flex flex-col gap-2">
            {pending.map((req) => (
              <li
                key={req.id}
                className="rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface-primary)] p-3"
              >
                <Who req={req} onOpen={() => open(req)} />
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => accept(req)}
                    disabled={acting === req.id}
                    className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-[var(--color-tint-primary)] text-sm font-semibold text-[var(--color-text-onTint)] disabled:opacity-60"
                  >
                    <Check size={14} aria-hidden="true" />
                    {acting === req.id ? "Working…" : "Accept"}
                  </button>
                  <button
                    type="button"
                    onClick={() => decline(req)}
                    disabled={acting === req.id}
                    className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full border border-[var(--color-border-strong)] text-sm font-medium text-[var(--color-text-primary)] disabled:opacity-60"
                  >
                    <X size={14} aria-hidden="true" />
                    Decline
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {shownAllies.length > 0 && (
        <section aria-label="New allies">
          <h3 className={headingClass}>New allies</h3>
          <ul className="flex flex-col gap-2">
            {shownAllies.map((req) => (
              <li
                key={req.id}
                className="flex items-center gap-3 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-primary)] p-3"
              >
                <Who req={req} onOpen={() => open(req)} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
