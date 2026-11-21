import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CircleCheck, Keyboard, Timer } from "lucide-react";
import { formatDuration } from "@/lib/timeTracker";
import { dayLabel, isEmptyDay, type DayActivity } from "@/lib/profileActivity";

const WIDTH = 240;

/**
 * One heatmap day: coding time, focus sessions and what shipped. Opens under the
 * day's cell inside `container`; Escape or a click elsewhere closes it.
 */
export function DayPopover({
  activity,
  anchor,
  container,
  onClose,
}: {
  activity: DayActivity;
  anchor: HTMLElement;
  container: HTMLElement;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const a = anchor.getBoundingClientRect();
    const c = container.getBoundingClientRect();
    const width = Math.min(WIDTH, c.width);
    const centre = a.left - c.left + a.width / 2;
    const left = Math.max(0, Math.min(c.width - width, centre - width / 2));
    // Measured once on open; the popover then stays put inside the card.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPos({ left, top: a.bottom - c.top + 8 });
  }, [anchor, container]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      // Clicks on the heatmap are handled by its days (toggle or switch).
      if (ref.current?.contains(target) || anchor.parentElement?.contains(target)) return;
      onClose();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      anchor.focus();
      onClose();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [anchor, onClose]);

  const { codingSeconds, focusMinutes, sessions, shipped } = activity;

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={dayLabel(activity.day)}
      className="ui-rise absolute z-20 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] p-3 shadow-lg"
      style={{
        width: Math.min(WIDTH, container.getBoundingClientRect().width),
        left: pos?.left ?? 0,
        top: pos?.top ?? 0,
        visibility: pos ? "visible" : "hidden",
      }}
    >
      <p className="text-xs font-bold text-[var(--color-text-primary)]">{dayLabel(activity.day)}</p>
      <div aria-live="polite" className="mt-2 flex flex-col gap-1.5 text-sm text-[var(--color-text-secondary)]">
        {isEmptyDay(activity) && <p className="text-[var(--color-text-tertiary)]">Nothing logged</p>}
        {codingSeconds > 0 && (
          <Row icon={<Keyboard size={14} />}>
            <b className="text-[var(--color-text-primary)]">{formatDuration(codingSeconds)}</b> coding
          </Row>
        )}
        {sessions > 0 && (
          <Row icon={<Timer size={14} />}>
            <b className="text-[var(--color-text-primary)]">{sessions}</b> {sessions === 1 ? "session" : "sessions"}
            {focusMinutes > 0 ? ` · ${formatDuration(focusMinutes * 60)}` : ""}
          </Row>
        )}
        {shipped.slice(0, 3).map((s) => (
          <Row key={s.id} icon={<CircleCheck size={14} className="text-[var(--color-tint-success)]" />}>
            <span className="line-clamp-2 break-words">{s.body}</span>
          </Row>
        ))}
        {shipped.length > 3 && <p className="pl-5 text-xs text-[var(--color-text-tertiary)]">+{shipped.length - 3}</p>}
      </div>
    </div>
  );
}

function Row({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--color-text-tertiary)]">
        {icon}
      </span>
      <span className="min-w-0">{children}</span>
    </div>
  );
}
