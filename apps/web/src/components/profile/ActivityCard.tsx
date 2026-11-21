import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router";
import { CalendarDays, Flame, Lock, Timer } from "lucide-react";
import { Heatmap } from "@/components/ui/Heatmap";
import { LanguageBreakdown } from "@/components/CodingTime/parts";
import { formatDuration, type UserCodingTime } from "@/lib/timeTracker";
import type { HeatmapDay, ShippedNote } from "@/lib/todayData";
import { activityHeatmap, dayActivity, type ProfileSummary } from "@/lib/profileActivity";
import { DayPopover } from "./DayPopover";
import { useCountUp } from "./useCountUp";

const WEEKS = 26;

/**
 * The profile's one summary: a headline total (coding when there is any, else focus),
 * its streak and active days, focus sessions when there are any, and one heatmap whose
 * days open a popover.
 */
export function ActivityCard({
  summary,
  coding,
  focusDays,
  shipped,
  privateToOwner,
}: {
  summary: ProfileSummary;
  coding: UserCodingTime | null;
  focusDays: HeatmapDay[];
  shipped: ShippedNote[];
  /** Coding time only the owner can see: a lock, linking to where that changes. */
  privateToOwner: boolean;
}) {
  const [card, setCard] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState<{ day: string; anchor: HTMLElement } | null>(null);
  const heatmap = useMemo(() => activityHeatmap(coding, focusDays), [coding, focusDays]);

  const total = useCountUp(Math.round(summary.totalSeconds / 60));
  const streak = useCountUp(summary.streakDays);
  const days = useCountUp(summary.activeDays);
  const sessions = useCountUp(summary.sessions);

  const close = useCallback(() => setOpen(null), []);

  const activity = open ? dayActivity(open.day, coding, focusDays, shipped) : null;

  return (
    <section
      ref={setCard}
      aria-label="Activity"
      className="relative flex flex-col gap-4 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-primary)] p-4"
    >
      <div className="flex flex-wrap items-end gap-x-5 gap-y-2">
        <div className="mr-auto flex items-baseline gap-2">
          <span className="text-3xl font-black leading-none tracking-tight text-[var(--color-text-skillhive)] tabular-nums">
            {formatDuration(total * 60)}
          </span>
          <span className="text-sm font-semibold text-[var(--color-text-tertiary)]">{summary.unit}</span>
          {privateToOwner && (
            <Link
              to="/settings/trackers"
              aria-label="Only you can see your coding time"
              title="Only you"
              className="ui-press inline-flex size-6 items-center justify-center self-center rounded-full text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
            >
              <Lock size={13} aria-hidden="true" />
            </Link>
          )}
        </div>
        {summary.streakDays > 0 && (
          <Fact icon={<Flame size={14} />} value={`${streak}d`} label="streak" />
        )}
        {summary.activeDays > 0 && (
          <Fact icon={<CalendarDays size={14} />} value={String(days)} label={summary.activeDays === 1 ? "day" : "days"} />
        )}
        {summary.sessions > 0 && (
          <Fact
            icon={<Timer size={14} />}
            value={String(sessions)}
            label={summary.sessions === 1 ? "session" : "sessions"}
          />
        )}
      </div>

      {heatmap && (
        <Heatmap
          data={heatmap.days}
          weeks={WEEKS}
          gap={3}
          fit
          maxCellSize={16}
          unitLabel={heatmap.unit}
          label={heatmap.unit === "coding" ? "Coding by day" : "Focus by day"}
          selectedDay={open?.day ?? null}
          onDayClick={(day, anchor) => setOpen((cur) => (cur?.day === day ? null : { day, anchor }))}
        />
      )}

      {summary.unit === "coding" && coding && coding.language_breakdown.length > 0 && (
        <LanguageBreakdown breakdown={coding.language_breakdown} maxItems={4} showTime={false} />
      )}

      {open && activity && card && (
        <DayPopover key={open.day} activity={activity} anchor={open.anchor} container={card} onClose={close} />
      )}
    </section>
  );
}

function Fact({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 text-sm">
      <span aria-hidden="true" className="self-center text-[var(--color-text-tertiary)]">
        {icon}
      </span>
      <b className="font-extrabold text-[var(--color-text-primary)] tabular-nums">{value}</b>
      <span className="text-[var(--color-text-tertiary)]">{label}</span>
    </span>
  );
}
