import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { AnimatePresence, Reorder, motion, useDragControls } from "framer-motion";
import {
  ArrowRight,
  Check,
  Circle,
  Clock,
  CornerDownLeft,
  FolderGit2,
  GripVertical,
  Plus,
  RotateCcw,
  Sparkles,
  Timer,
  Code2,
  Trash2,
  X,
} from "lucide-react";

import { Text, Button } from "@skillhiive/ui";
import { useTokens } from "@/theme";
import { useProfile } from "@/hooks/useProfile";
import { useToday, type TodayTask, ESTIMATE_OPTIONS } from "@/hooks/useToday";
import { useFocusSession } from "@/hooks/useFocusSession";
import { Skeleton } from "@/components/ui/States";
import { formatDuration } from "@/lib/timeTracker";
import { heroTask } from "@/lib/focusSession";
import { lastClockOffset } from "@/lib/room";
import { useActiveRooms } from "@/hooks/useActiveRooms";
import { useAllyShipped } from "@/hooks/useAllyShipped";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { FloorLine, RailCard, RoomsCard, ShippedCard, ShippedLine } from "@/components/home/FloorRail";
import { StartCard } from "@/components/home/StartCard";
import { fetchWeekCoding, fetchWeekProjectTime, localDate, pickSpotlight } from "@/lib/projectTime";
import {
  flushSyncQueue,
  fetchFocusStats,
  fetchHeatmap,
  fetchUserProjects,
  type FocusStats,
  type HeatmapDay,
  type ProjectWithStats,
} from "@/lib/todayData";

const FONT = '"popreg", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

/** The one duration format (lib/timeTracker), from minutes. */
const minutes = (min: number) => formatDuration(min * 60);

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function dateLabel(): string {
  return new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

interface Week {
  stats: FocusStats | null;
  days: HeatmapDay[];
  spotlight: { project: ProjectWithStats; seconds: number } | null;
  /** Coding seconds this week; it leads when there is coding time. */
  coded: number;
}

/** This week's numbers for the header and the spotlight line; null while loading. */
function useWeek(): Week | null {
  const { profile } = useProfile();
  const [week, setWeek] = useState<{ for: string; value: Week } | null>(null);
  const userId = profile?.id;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void Promise.all([
      fetchFocusStats(userId),
      fetchHeatmap(userId, 7),
      fetchUserProjects(userId),
      fetchWeekProjectTime(userId),
      fetchWeekCoding(userId),
    ]).then(([stats, heatmap, projects, time, coding]) => {
      if (cancelled) return;
      const byDay = new Map(heatmap.map((h) => [h.day, h]));
      // Same rule as the profile: with coding time, the strip shows coding minutes.
      const days = Array.from({ length: 7 }, (_, i) => {
        const key = localDate(6 - i);
        if (coding.total > 0) {
          return { day: key, minutes: Math.round((coding.byDay.get(key) ?? 0) / 60), sessions: 0 };
        }
        return byDay.get(key) ?? { day: key, minutes: 0, sessions: 0 };
      });
      setWeek({
        for: userId,
        value: { stats, days, spotlight: pickSpotlight(projects, time), coded: coding.total },
      });
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return week && week.for === userId ? week.value : null;
}

export default function Home() {
  const today = useToday();
  const focus = useFocusSession();
  const navigate = useNavigate();
  const { colors, spacing } = useTokens();
  const week = useWeek();

  useEffect(() => {
    void flushSyncQueue();
    const onOnline = () => void flushSyncQueue();
    const onVisible = () => {
      if (document.visibilityState === "visible") void flushSyncQueue();
    };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const { profile } = useProfile();
  // Wide screens get two zones: today's work, and a quiet rail for the Space around you.
  const wide = useMediaQuery("(min-width: 960px)");
  const { rooms } = useActiveRooms();
  const shipped = useAllyShipped(profile?.id);
  const [clockOffsetMs] = useState(lastClockOffset);
  const next = heroTask(today.tasks, null);

  function startFocus() {
    if (!focus.session.active) focus.begin(next?.id ?? null);
    navigate("/focus");
  }

  return (
    <div style={{ minHeight: "100vh", background: colors.bg.muted, paddingTop: 96, paddingBottom: 160, fontFamily: FONT }}>
      <div
        style={{
          maxWidth: wide ? 1120 : 640,
          margin: "0 auto",
          padding: `0 ${wide ? spacing.xl : spacing.base}px`,
          display: "grid",
          gridTemplateColumns: wide ? "minmax(0, 1fr) 340px" : "minmax(0, 1fr)",
          gap: wide ? 40 : spacing.lg,
          alignItems: "start",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: spacing.lg, minWidth: 0 }}>
          <Header week={week} showWeek={!wide} />

          {!wide && (
            <div style={{ display: "flex", flexDirection: "column", gap: spacing.sm }}>
              <FloorLine rooms={rooms} clockOffsetMs={clockOffsetMs} />
              {shipped?.[0] && <ShippedLine post={shipped[0]} />}
            </div>
          )}

          {today.carryFrom.length > 0 && <CarryCard today={today} />}

          <TaskList today={today} />

          <StartCard
            focusActive={focus.session.active}
            nextTask={next?.text ?? null}
            rooms={rooms}
            clockOffsetMs={clockOffsetMs}
            onStartAlone={startFocus}
          />

          <Review today={today} />

          {!wide && <Spotlight week={week} />}
        </div>

        {wide && (
          <aside
            aria-label="Space"
            style={{ position: "sticky", top: 96, display: "flex", flexDirection: "column", gap: spacing.md }}
          >
            <RoomsCard rooms={rooms} clockOffsetMs={clockOffsetMs} />
            {shipped && <ShippedCard posts={shipped} />}
            <RailCard label="your week">
              <WeekStats week={week} />
              <Spotlight week={week} stacked />
            </RailCard>
          </aside>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────── HEADER ─────────────────────────── */

function Header({ week, showWeek }: { week: Week | null; showWeek: boolean }) {
  const { spacing } = useTokens();
  const { profile } = useProfile();
  const name = profile?.displayname ?? "there";

  return (
    <header style={{ display: "flex", flexDirection: "column", gap: spacing.sm }}>
      <Text variant="caption" tone="tertiary" style={{ textTransform: "uppercase", letterSpacing: 2 }}>
        {dateLabel()}
      </Text>
      <Text as="h1" variant="display">
        {greeting()}, {name}.
      </Text>

      {showWeek && <WeekStats week={week} />}

      <Text variant="title" tone="secondary" weight={600} style={{ display: "block", marginTop: spacing.xs }}>
        What must happen today?
      </Text>
    </header>
  );
}

/** This week's time and its seven days. No streak: a streak counts days, not work. */
function WeekStats({ week }: { week: Week | null }) {
  const { spacing } = useTokens();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: spacing.sm, flexWrap: "wrap", minHeight: 30 }}>
      {week ? (
        <>
          {week.coded > 0 ? (
            <StatPill icon={<Code2 size={14} />} label="Coded this week" value={formatDuration(week.coded)} />
          ) : (
            <StatPill
              icon={<Timer size={14} />}
              label="Focus this week"
              value={minutes(week.stats?.last_7d_minutes ?? week.days.reduce((s, d) => s + d.minutes, 0))}
            />
          )}
          <WeekStrip days={week.days} />
        </>
      ) : (
        <>
          <Skeleton style={{ width: 84, height: 28, borderRadius: 999 }} />
          <Skeleton style={{ width: 70, height: 20 }} />
        </>
      )}
    </div>
  );
}

function StatPill({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  const { colors, radii } = useTokens();
  return (
    <span
      className="ui-rise"
      title={label}
      aria-label={`${label}: ${value}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: 28,
        padding: "0 10px",
        borderRadius: radii.pill,
        background: colors.surface.primary,
        border: `1px solid ${colors.border.subtle}`,
      }}
    >
      <span aria-hidden="true" style={{ display: "inline-flex", color: colors.surface.skillhive }}>
        {icon}
      </span>
      <span aria-hidden="true" style={{ fontSize: 13, fontWeight: 800, color: colors.text.primary, fontVariantNumeric: "tabular-nums" }}>
        {value}
      </span>
    </span>
  );
}

/** Seven bars, oldest first; height is that day's focus time. */
function WeekStrip({ days }: { days: HeatmapDay[] }) {
  const { colors } = useTokens();
  const max = Math.max(1, ...days.map((d) => d.minutes));
  const active = days.filter((d) => d.minutes > 0).length;
  return (
    <span
      className="ui-rise"
      role="img"
      aria-label={`Focused ${active} of the last 7 days`}
      title={`${active}/7 days`}
      style={{ display: "inline-flex", alignItems: "flex-end", gap: 3, height: 20, paddingLeft: 4 }}
    >
      {days.map((d) => (
        <span
          key={d.day}
          style={{
            width: 6,
            height: d.minutes > 0 ? Math.max(6, Math.round((d.minutes / max) * 20)) : 4,
            borderRadius: 2,
            background: d.minutes > 0 ? colors.surface.skillhive : colors.border.strong,
          }}
        />
      ))}
    </span>
  );
}

/* ─────────────────────────── CARRIED FROM YESTERDAY ─────────────────────────── */

function CarryCard({ today }: { today: ReturnType<typeof useToday> }) {
  const { colors, spacing, radii } = useTokens();
  return (
    <section
      aria-label="From yesterday"
      className="ui-rise"
      style={{
        background: colors.bg.accentDim,
        border: `1px solid ${colors.surface.skillhive}44`,
        borderRadius: radii.lg,
        padding: spacing.base,
        display: "flex",
        flexDirection: "column",
        gap: spacing.sm,
      }}
    >
      <Text variant="label" tone="skillhive">
        Yesterday · {today.carryFrom.length}
      </Text>
      {today.carryFrom.map((c) => (
        <div key={c.id} style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
          <Text variant="bodySm" tone="secondary" style={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>
            {c.text}
          </Text>
          <Text variant="caption" tone="tertiary">
            {minutes(c.estimateMin)}
          </Text>
          <Button label="Add" size="sm" variant="secondary" onClick={() => today.addCarry(c.id)} />
          <IconBtn label={`Dismiss ${c.text}`} onClick={() => today.dismissCarry(c.id)}>
            <X size={14} />
          </IconBtn>
        </div>
      ))}
    </section>
  );
}

/* ─────────────────────────── TASKS ─────────────────────────── */

function TaskList({ today }: { today: ReturnType<typeof useToday> }) {
  const { spacing } = useTokens();
  const queued = today.tasks.filter((t) => t.status === "queued");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: spacing.sm }}>
      <Reorder.Group
        axis="y"
        values={queued}
        onReorder={(next: TodayTask[]) => today.setQueueOrder(next.map((t) => t.id))}
        aria-label="Today's tasks"
        style={{ display: "flex", flexDirection: "column", gap: spacing.sm, margin: 0, padding: 0, listStyle: "none" }}
      >
        <AnimatePresence initial={false}>
          {queued.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onDone={() => today.completeTask(task.id, { actualMin: 0, shipped: "", blockers: "" })}
              onText={(text) => today.updateTask(task.id, { text })}
              onEstimate={(min) => today.updateTask(task.id, { estimateMin: min })}
              onRemove={() => today.removeTask(task.id)}
            />
          ))}
        </AnimatePresence>
      </Reorder.Group>
      <NewTaskRow onCommit={today.addTask} />
    </div>
  );
}

function TaskRow({
  task,
  onDone,
  onText,
  onEstimate,
  onRemove,
}: {
  task: TodayTask;
  onDone: () => void;
  onText: (text: string) => void;
  onEstimate: (min: number) => void;
  onRemove: () => void;
}) {
  const { colors, radii, spacing } = useTokens();
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={task}
      dragListener={false}
      dragControls={controls}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.14 } }}
      whileDrag={{ scale: 1.01, boxShadow: "0 8px 24px rgba(0,0,0,0.18)", zIndex: 2 }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: spacing.xs,
        background: colors.surface.primary,
        border: `1px solid ${colors.border.subtle}`,
        borderRadius: radii.lg,
        padding: `${spacing.xs}px ${spacing.xs}px ${spacing.xs}px ${spacing.xs}px`,
      }}
    >
      <span
        aria-hidden="true"
        onPointerDown={(e) => controls.start(e)}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 4, cursor: "grab", touchAction: "none" }}
      >
        <GripVertical size={16} color={colors.text.tertiary} />
      </span>
      <IconBtn label={`Done: ${task.text}`} onClick={onDone} size={32}>
        <Circle size={18} />
      </IconBtn>
      <input
        value={task.text}
        aria-label="Task"
        onChange={(e) => onText(e.target.value)}
        style={{
          flex: 1,
          minWidth: 0,
          border: "none",
          outline: "none",
          background: "transparent",
          color: colors.text.primary,
          fontSize: 15,
          fontWeight: 600,
          fontFamily: "inherit",
          padding: "8px 0",
        }}
      />
      <EstimateSelect value={task.estimateMin} onChange={onEstimate} />
      <IconBtn onClick={onRemove} label={`Remove ${task.text}`}>
        <Trash2 size={14} />
      </IconBtn>
    </Reorder.Item>
  );
}

// Autofocus only where it cannot pop up an on-screen keyboard (mouse/trackpad).
function hasFinePointer(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(pointer: fine)").matches;
}

function NewTaskRow({ onCommit }: { onCommit: (text: string, min: number) => void }) {
  const { colors, radii, spacing } = useTokens();
  const [text, setText] = useState("");
  const [estimate, setEstimate] = useState(30);
  const ref = useRef<HTMLInputElement>(null);

  function commit() {
    const trimmed = text.trim();
    if (!trimmed) return;
    onCommit(trimmed, estimate);
    setText("");
    setEstimate(30);
    ref.current?.focus();
  }

  const hasText = text.trim().length > 0;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: spacing.xs,
        border: `1px dashed ${colors.border.strong}`,
        borderRadius: radii.lg,
        padding: `${spacing.xs}px ${spacing.xs}px ${spacing.xs}px ${spacing.base}px`,
      }}
    >
      <Plus size={16} color={colors.text.tertiary} aria-hidden="true" />
      <input
        ref={ref}
        autoFocus={hasFinePointer()}
        value={text}
        aria-label="Add a task"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
        }}
        placeholder="Add a task"
        style={{
          flex: 1,
          minWidth: 0,
          border: "none",
          outline: "none",
          background: "transparent",
          color: colors.text.primary,
          fontSize: 15,
          fontWeight: 600,
          fontFamily: "inherit",
          padding: "8px 0",
        }}
      />
      <button
        type="button"
        aria-label="Add task"
        title="Add"
        disabled={!hasText}
        onClick={commit}
        className="ui-press"
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "4px 8px",
          borderRadius: 7,
          border: `1px solid ${colors.border.subtle}`,
          background: colors.surface.sunken,
          color: hasText ? colors.surface.skillhive : colors.text.tertiary,
          cursor: hasText ? "pointer" : "default",
        }}
      >
        <CornerDownLeft size={12} />
      </button>
      <EstimateSelect value={estimate} onChange={setEstimate} />
    </div>
  );
}

/* ─────────────────────────── REVIEW ─────────────────────────── */

function Review({ today }: { today: ReturnType<typeof useToday> }) {
  const { colors, spacing, radii } = useTokens();
  const done = today.tasks.filter((t) => t.status === "done");
  const carried = today.tasks.filter((t) => t.status === "carried");
  if (done.length === 0 && carried.length === 0 && today.captures.length === 0) return null;

  const row: React.CSSProperties = {
    display: "flex",
    gap: spacing.sm,
    alignItems: "center",
    background: colors.surface.primary,
    border: `1px solid ${colors.border.subtle}`,
    borderRadius: radii.md,
    padding: `${spacing.xs}px ${spacing.sm}px`,
    minHeight: 44,
  };
  const heading: React.CSSProperties = { textTransform: "uppercase", letterSpacing: 2, display: "block", marginTop: spacing.sm };

  return (
    <section aria-label="Review" style={{ display: "flex", flexDirection: "column", gap: spacing.sm }}>
      {done.length > 0 && (
        <>
          <Text variant="caption" tone="tertiary" style={heading}>
            Done · {done.length}
            {today.summary.actualMin > 0 ? ` · ${minutes(today.summary.actualMin)}` : ""}
          </Text>
          <AnimatePresence initial={false}>
            {done.map((t) => (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 26 }}
                style={row}
              >
                <IconBtn label={`Undo: ${t.text}`} onClick={() => today.restoreTask(t.id)} size={32}>
                  <Check size={16} color={colors.tint.success} />
                </IconBtn>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text variant="bodySm" weight={600} style={{ textDecoration: "line-through", opacity: 0.7, overflowWrap: "anywhere" }}>
                    {t.text}
                  </Text>
                  {t.shipped ? (
                    <Text variant="caption" tone="tertiary" style={{ display: "block" }}>
                      {t.shipped}
                    </Text>
                  ) : null}
                </div>
                {t.actualMin ? (
                  <Text variant="caption" tone="tertiary">
                    {minutes(t.actualMin)}
                  </Text>
                ) : null}
              </motion.div>
            ))}
          </AnimatePresence>
        </>
      )}

      {carried.length > 0 && (
        <>
          <Text variant="caption" tone="tertiary" style={heading}>
            Carried · {carried.length}
          </Text>
          {carried.map((t) => (
            <motion.div key={t.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={row}>
              <span aria-hidden="true" style={{ display: "inline-flex", width: 32, justifyContent: "center" }}>
                <Clock size={16} color={colors.tint.warning} />
              </span>
              <Text variant="bodySm" tone="secondary" style={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>
                {t.text}
              </Text>
              <IconBtn label={`Restore ${t.text}`} onClick={() => today.restoreTask(t.id)}>
                <RotateCcw size={14} />
              </IconBtn>
            </motion.div>
          ))}
        </>
      )}

      {today.captures.length > 0 && (
        <>
          <Text variant="caption" tone="tertiary" style={heading}>
            Captures · {today.captures.length}
          </Text>
          {today.captures.map((c) => (
            <motion.div key={c.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={row}>
              <span aria-hidden="true" style={{ display: "inline-flex", width: 32, justifyContent: "center" }}>
                <Sparkles size={16} color={colors.tint.accent} />
              </span>
              <Text variant="bodySm" tone="secondary" style={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>
                {c.text}
              </Text>
              <IconBtn label="Remove capture" onClick={() => today.removeCapture(c.id)}>
                <X size={14} />
              </IconBtn>
            </motion.div>
          ))}
        </>
      )}
    </section>
  );
}

/* ─────────────────────────── SPOTLIGHT ─────────────────────────── */

/** One line: the project with the most time this week, and the way to all projects. */
function Spotlight({ week, stacked = false }: { week: Week | null; stacked?: boolean }) {
  const { colors, spacing, radii } = useTokens();
  const spot = week?.spotlight ?? null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: stacked ? "column" : "row",
        alignItems: stacked ? "stretch" : "center",
        gap: stacked ? spacing.xs : spacing.sm,
        flexWrap: stacked ? "nowrap" : "wrap",
        marginTop: stacked ? 0 : spacing.sm,
      }}
    >
      {!week ? (
        <Skeleton style={{ flex: 1, height: 44, borderRadius: radii.lg }} />
      ) : spot ? (
        <Link
          to={`/projects/${spot.project.id}`}
          className="ui-lift ui-rise group"
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            alignItems: "center",
            gap: spacing.sm,
            padding: `${spacing.sm}px ${spacing.base}px`,
            borderRadius: radii.lg,
            background: colors.surface.primary,
            border: `1px solid ${colors.border.subtle}`,
            color: colors.text.primary,
            textDecoration: "none",
          }}
        >
          <FolderGit2 size={16} color={colors.surface.skillhive} aria-hidden="true" />
          <Text
            variant="bodySm"
            weight={700}
            style={{ minWidth: 0, flexShrink: stacked ? 1 : 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
          >
            {spot.project.name}
          </Text>
          <Text variant="bodySm" tone="tertiary" style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            · {formatDuration(spot.seconds)} this week
          </Text>
          <ArrowRight
            size={16}
            color={colors.text.tertiary}
            aria-hidden="true"
            className="transition-transform duration-[var(--dur-hover)] group-hover:translate-x-0.5"
          />
        </Link>
      ) : null}
      <Link
        to="/projects"
        className="ui-press"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          height: stacked ? 28 : 36,
          padding: stacked ? "0 4px" : "0 12px",
          alignSelf: stacked ? "flex-start" : undefined,
          borderRadius: radii.pill,
          color: colors.text.secondary,
          fontSize: 13,
          fontWeight: 700,
          textDecoration: "none",
        }}
      >
        <FolderGit2 size={14} aria-hidden="true" />
        Projects
      </Link>
    </div>
  );
}

/* ─────────────────────────── HELPERS ─────────────────────────── */

function IconBtn({
  children,
  onClick,
  disabled,
  label,
  size = 28,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  label: string;
  size?: number;
}) {
  const { colors } = useTokens();
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="ui-press"
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        border: "none",
        borderRadius: 999,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.3 : 1,
        color: colors.text.tertiary,
      }}
    >
      {children}
    </button>
  );
}

function EstimateSelect({ value, onChange }: { value: number; onChange: (min: number) => void }) {
  const { colors, radii } = useTokens();
  return (
    <select
      value={value}
      aria-label="Estimate"
      onChange={(e) => onChange(Number(e.target.value))}
      className="ui-press"
      style={{
        border: `1px solid ${colors.border.subtle}`,
        background: colors.surface.secondary,
        color: colors.text.secondary,
        borderRadius: radii.md,
        padding: "4px 6px",
        fontSize: 12,
        fontWeight: 600,
        fontFamily: "inherit",
        cursor: "pointer",
        outline: "none",
        flexShrink: 0,
      }}
    >
      {ESTIMATE_OPTIONS.map((m) => (
        <option key={m} value={m}>
          {minutes(m)}
        </option>
      ))}
    </select>
  );
}
