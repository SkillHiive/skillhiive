import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

export type SegmentedOption<T extends string> = { value: T; label: string; icon?: ReactNode };

type Pill = { left: number; top: number; width: number; height: number; opacity: number };

/**
 * The nav's sliding yellow pill, for any set of tabs or filters. The pill sits on
 * the chosen option and follows the pointer or keyboard focus while you look
 * around, the same as the nav (components/Nav.tsx). It works as a radio group:
 * one option is always chosen.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  size = "md",
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name for the group, e.g. "Show". */
  label: string;
  size?: "sm" | "md";
}) {
  const [hovered, setHovered] = useState<T | null>(null);
  const [pill, setPill] = useState<Pill>({ left: 0, top: 0, width: 0, height: 0, opacity: 0 });
  const refs = useRef(new Map<T, HTMLButtonElement>());
  const target = hovered ?? value;

  // offset* sizes ignore the hover scale, so the pill doesn't wobble under a growing option.
  const measure = useCallback(() => {
    const el = refs.current.get(target);
    setPill((prev) =>
      el
        ? { left: el.offsetLeft, top: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight, opacity: 1 }
        : { ...prev, opacity: 0 },
    );
  }, [target]);

  useLayoutEffect(() => {
    measure();
  }, [measure, options.length]);

  useEffect(() => {
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => measure());
    refs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [measure, options.length]);

  function onKeyDown(event: React.KeyboardEvent, index: number) {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const next = options[(index + step + options.length) % options.length];
    if (!next) return;
    onChange(next.value);
    refs.current.get(next.value)?.focus();
  }

  const pad = size === "sm" ? "px-3 py-1.5 text-xs" : "px-3.5 py-2 text-sm";

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onMouseLeave={() => setHovered(null)}
      className="relative inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-primary)] p-1"
    >
      {options.map((option, index) => {
        const chosen = option.value === value;
        const lit = option.value === target;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={chosen}
            tabIndex={chosen ? 0 : -1}
            ref={(el) => {
              if (el) refs.current.set(option.value, el);
              else refs.current.delete(option.value);
            }}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            onMouseEnter={() => setHovered(option.value)}
            onFocus={() => setHovered(option.value)}
            onBlur={() => setHovered(null)}
            className={`ui-press relative z-10 inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full font-semibold ${pad} ${
              lit ? "text-black" : "text-[var(--color-text-secondary)]"
            }`}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute z-0 rounded-full bg-[#fffd01]"
        style={{
          left: pill.left,
          top: pill.top,
          width: pill.width,
          height: pill.height,
          opacity: pill.opacity,
          transition: "left var(--dur-move) var(--ease-ui), width var(--dur-move) var(--ease-ui), opacity var(--dur-hover) var(--ease-ui)",
        }}
      />
    </div>
  );
}
