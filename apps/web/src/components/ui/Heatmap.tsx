import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useTokens } from "@/theme";
import { formatDuration } from "@/lib/timeTracker";
import type { HeatmapDay } from "@/lib/todayData";

export interface HeatmapProps {
  data: HeatmapDay[];
  /** Number of weeks (columns) to render. */
  weeks?: number;
  cellSize?: number;
  gap?: number;
  /**
   * Makes days buttons: click, or Enter/Space on the focused day. Arrow keys move
   * between days, with one tab stop for the whole grid. `anchor` is the day's cell.
   */
  onDayClick?: (day: string, anchor: HTMLElement) => void;
  /** What the minutes in the tooltip are, e.g. "Nm focus" or "Nm coding". */
  unitLabel?: string;
  /** Stretch the weeks to the container's width instead of scrolling, up to `maxCellSize`. */
  fit?: boolean;
  maxCellSize?: number;
  /** A day to outline, e.g. the one whose popover is open. */
  selectedDay?: string | null;
  /** Accessible name for the grid of days, e.g. "Coding by day". */
  label?: string;
}

function toKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type Cell = { key: string; minutes: number; future: boolean };

/**
 * GitHub-style contribution heatmap, driven by per-day minutes (focus by default).
 * Columns are weeks (oldest → newest), rows are days of the week.
 */
export function Heatmap({
  data,
  weeks = 26,
  cellSize = 11,
  gap = 3,
  onDayClick,
  unitLabel = "focus",
  fit = false,
  maxCellSize = 16,
  selectedDay = null,
  label,
}: HeatmapProps) {
  const { colors } = useTokens();
  const refs = useRef(new Map<number, HTMLButtonElement>());

  const byDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of data) map.set(d.day, (map.get(d.day) ?? 0) + d.minutes);
    return map;
  }, [data]);

  const cells = useMemo<Cell[]>(() => {
    const days = 7 * weeks;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Whole weeks ending on this week's Saturday, so the columns stay stable and today is
    // always in the last one. Aligning the start instead used to cut the grid short of today.
    const end = new Date(today);
    end.setDate(today.getDate() + (6 - today.getDay()));
    const start = new Date(end);
    start.setDate(end.getDate() - (days - 1));

    const out: Cell[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = toKey(d);
      out.push({ key, minutes: byDay.get(key) ?? 0, future: d.getTime() > today.getTime() });
    }
    return out;
  }, [weeks, byDay]);

  const lastPast = useMemo(() => {
    for (let i = cells.length - 1; i >= 0; i--) if (!cells[i]!.future) return i;
    return 0;
  }, [cells]);

  // One tab stop for the grid: the last day moved to, else the chosen day, else today.
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const selectedIndex = selectedDay ? cells.findIndex((c) => c.key === selectedDay) : -1;
  const tabIndexAt = Math.min(focusIndex ?? (selectedIndex >= 0 ? selectedIndex : lastPast), lastPast);

  function colorFor(minutes: number, future: boolean): string {
    if (future) return "transparent";
    if (minutes <= 0) return colors.overlay.press;
    const base = colors.surface.skillhive;
    if (minutes < 30) return base + "2e";
    if (minutes < 60) return base + "59";
    if (minutes < 120) return base + "99";
    return base;
  }

  function titleFor(cell: Cell): string {
    if (cell.future) return "";
    return cell.minutes > 0 ? `${cell.key} · ${formatDuration(cell.minutes * 60)} ${unitLabel}` : cell.key;
  }

  function onKeyDown(event: KeyboardEvent, index: number) {
    const step =
      event.key === "ArrowLeft"
        ? -7
        : event.key === "ArrowRight"
          ? 7
          : event.key === "ArrowUp"
            ? -1
            : event.key === "ArrowDown"
              ? 1
              : 0;
    if (step === 0) return;
    event.preventDefault();
    const next = Math.max(0, Math.min(lastPast, index + step));
    setFocusIndex(next);
    refs.current.get(next)?.focus();
  }

  const interactive = !!onDayClick;

  return (
    <div style={{ overflowX: fit ? "visible" : "auto", paddingBottom: fit ? 0 : 4 }}>
      <div
        role={interactive ? "group" : undefined}
        aria-label={interactive ? label : undefined}
        style={{
          display: "grid",
          gridAutoFlow: "column",
          gridTemplateRows: "repeat(7, auto)",
          gridTemplateColumns: fit ? `repeat(${weeks}, minmax(0, 1fr))` : `repeat(${weeks}, ${cellSize}px)`,
          gap,
          width: fit ? "100%" : "max-content",
          maxWidth: fit ? weeks * (maxCellSize + gap) : undefined,
        }}
      >
        {cells.map((cell, index) => {
          const selected = cell.key === selectedDay;
          const style = {
            width: fit ? "100%" : cellSize,
            height: fit ? undefined : cellSize,
            aspectRatio: fit ? "1 / 1" : undefined,
            borderRadius: 2,
            background: colorFor(cell.minutes, cell.future),
            outline: selected ? `2px solid ${colors.text.primary}` : undefined,
            outlineOffset: selected ? 1 : undefined,
          } as const;

          if (!onDayClick || cell.future) {
            return <div key={cell.key} title={titleFor(cell)} style={style} />;
          }
          return (
            <button
              key={cell.key}
              type="button"
              ref={(el) => {
                if (el) refs.current.set(index, el);
                else refs.current.delete(index);
              }}
              tabIndex={index === tabIndexAt ? 0 : -1}
              title={titleFor(cell)}
              aria-label={titleFor(cell)}
              aria-pressed={selected}
              onFocus={() => setFocusIndex(index)}
              onClick={(event) => onDayClick(cell.key, event.currentTarget)}
              onKeyDown={(event) => onKeyDown(event, index)}
              style={{ ...style, display: "block", padding: 0, border: 0, cursor: "pointer" }}
            />
          );
        })}
      </div>
    </div>
  );
}

export default Heatmap;
