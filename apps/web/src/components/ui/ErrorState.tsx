import { RefreshCw, TriangleAlert } from "lucide-react";

/** A failed load: what went wrong, and a way to try again. */
export function ErrorState({
  message,
  onRetry,
  retrying = false,
}: {
  message: string;
  onRetry?: () => void;
  retrying?: boolean;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-primary)] px-6 py-8 text-center"
    >
      <TriangleAlert size={20} aria-hidden="true" className="text-[var(--color-tint-warning)]" />
      <p className="max-w-sm text-sm text-[var(--color-text-secondary)]">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--color-border-strong)] px-4 text-sm font-semibold text-[var(--color-text-primary)] disabled:opacity-60"
        >
          <RefreshCw size={14} aria-hidden="true" className={retrying ? "animate-spin" : undefined} />
          {retrying ? "Trying again…" : "Try again"}
        </button>
      )}
    </div>
  );
}
