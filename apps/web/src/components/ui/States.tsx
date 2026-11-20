import type { ReactNode } from "react";

/** A placeholder shaped like the content that is loading. */
export function Skeleton({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return <div aria-hidden="true" className={`ui-skeleton ${className}`} style={style} />;
}

/** A few placeholder rows, for lists and cards while they load. */
export function SkeletonRows({ rows = 3, height = 56 }: { rows?: number; height?: number }) {
  return (
    <div role="status" aria-label="Loading" className="flex flex-col gap-2">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} style={{ height, opacity: 1 - i * 0.18 }} />
      ))}
    </div>
  );
}

/**
 * Nothing here yet: an icon, one short line, and at most one thing to do.
 * Keep `title` to a few words; it should read at a glance.
 */
export function EmptyState({ icon, title, action }: { icon: ReactNode; title: string; action?: ReactNode }) {
  return (
    <div className="ui-rise flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[var(--color-border-subtle)] px-6 py-8 text-center">
      <span aria-hidden="true" className="text-[var(--color-text-tertiary)]">
        {icon}
      </span>
      <p className="text-sm font-medium text-[var(--color-text-secondary)]">{title}</p>
      {action}
    </div>
  );
}
