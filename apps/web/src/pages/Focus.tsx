import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { Check, Clock, CloudRain, Coffee, CornerDownLeft, Pause, Play, RotateCcw, Sparkles, Square, VolumeX } from "lucide-react";
import { Text, Button } from "@skillhiive/ui";
import { useTokens } from "@/theme";
import { useToday } from "@/hooks/useToday";
import { useFocusSession } from "@/hooks/useFocusSession";
import { useNow } from "@/hooks/useNow";
import type { AmbienceKind } from "@/hooks/useAmbience";
import { BackLink } from "@/components/ui/BackLink";
import { Segmented, type SegmentedOption } from "@/components/ui/Segmented";
import { CaptureSheet, type CaptureDraft } from "@/components/focus/CaptureSheet";
import { useToast } from "@/lib/toast";
import { useConfirm } from "@/lib/confirm";
import { backTarget } from "@/lib/backNav";
import { formatDuration } from "@/lib/timeTracker";
import { elapsedSec, isRunning, sessionSeconds } from "@/lib/focusClock";
import { clockLabel, heroTask, phaseAt, unsavedSeconds, type FocusPhase } from "@/lib/focusSession";
import { fetchMyProjects, saveNote, saveSession, type Project } from "@/lib/todayData";

const FONT = '"popreg", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

const minutes = (min: number) => formatDuration(min * 60);

const AMBIENCE: SegmentedOption<AmbienceKind>[] = [
  { value: "none", label: "Off", icon: <VolumeX size={13} aria-hidden="true" /> },
  { value: "rain", label: "Rain", icon: <CloudRain size={13} aria-hidden="true" /> },
  { value: "cafe", label: "Cafe", icon: <Coffee size={13} aria-hidden="true" /> },
];

/** Leaving keeps the session: only End, or finishing the last task, stops it. */
export default function Focus() {
  const today = useToday();
  const focus = useFocusSession();
  const { session } = focus;
  const { colors, spacing, radii } = useTokens();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const confirm = useConfirm();

  const running = isRunning(session.clock);
  const now = useNow(running);
  const elapsed = elapsedSec(session.clock, now);
  const { phase, remaining, progress } = phaseAt(elapsed);

  const hero = heroTask(today.tasks, session.taskId);
  const queue = today.tasks.filter((t) => t.status === "queued" && t.id !== hero?.id);

  const [capture, setCapture] = useState<CaptureDraft | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    let cancelled = false;
    void fetchMyProjects().then((list) => {
      if (!cancelled) setProjects(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Back to where you came from (Today, usually); the session keeps running. */
  const leave = useCallback(() => {
    if (backTarget(location.key, "/home").kind === "history") navigate(-1);
    else navigate("/home", { replace: true });
  }, [location.key, navigate]);

  // Esc closes the capture sheet if it's open, otherwise steps back out of focus.
  const captureOpen = capture !== null;
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (captureOpen) {
        setCapture(null);
        return;
      }
      // A confirm dialog handles its own Esc.
      if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return;
      leave();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [leave, captureOpen]);

  function toggle() {
    if (!session.active) focus.begin(hero?.id ?? null);
    else focus.toggle();
  }

  async function askIfUnsaved(title: string, confirmLabel: string): Promise<boolean> {
    const unsaved = unsavedSeconds(session, Date.now());
    if (!hero || unsaved < 60) return true;
    const ok = await confirm({
      title,
      description: `${formatDuration(unsaved)} on “${hero.text}” isn't saved.`,
      confirmLabel,
    });
    return ok !== null;
  }

  async function endSession() {
    if (!(await askIfUnsaved("End session?", "End"))) return;
    focus.end();
    leave();
  }

  async function restart() {
    if (!(await askIfUnsaved("Restart timer?", "Restart"))) return;
    focus.restart();
  }

  function openCapture() {
    if (!hero) return;
    setCapture({
      task: hero,
      actualMin: Math.round(unsavedSeconds(session, Date.now()) / 60),
      shipped: "",
      blockers: "",
      projectId: "",
    });
  }

  function saveCapture(endAfter: boolean) {
    if (!capture) return;
    const { task, actualMin, shipped, blockers, projectId } = capture;
    today.completeTask(task.id, { actualMin, shipped, blockers });
    const project = projects.find((p) => p.id === projectId) ?? null;
    const seconds = sessionSeconds(actualMin);
    if (seconds !== null) {
      void saveSession({
        task_text: task.text,
        estimate_min: task.estimateMin,
        duration_seconds: seconds,
        project_id: project?.id ?? null,
      });
    }
    void saveNote({
      ritual_type: "checkout",
      body: shipped.trim() || task.text,
      blockers: blockers.trim() || null,
      actual_min: actualMin,
      project_id: project?.id ?? null,
    });
    toast(`Saved${project ? ` to ${project.name}` : ""}${actualMin > 0 ? ` · ${minutes(actualMin)}` : ""}`);
    setCapture(null);

    const next = queue[0];
    if (endAfter || !next) {
      focus.end();
      leave();
    } else {
      focus.nextTask(next.id);
    }
  }

  function carryHero() {
    if (!hero) return;
    today.carryTask(hero.id);
    focus.nextTask(queue[0]?.id ?? null);
  }

  const phaseLabel = !session.active ? "Ready" : running ? (phase === "focus" ? "Focus" : "Break") : "Paused";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1200,
        background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${colors.bg.elevated}, ${colors.bg.canvas})`,
        display: "flex",
        flexDirection: "column",
        fontFamily: FONT,
        overflow: "hidden",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: spacing.sm,
          padding: `${spacing.base}px ${spacing.base}px`,
          flexShrink: 0,
        }}
      >
        <BackLink to="/home" label="Today" />
        {session.active && (
          <Button label="End" size="sm" variant="secondary" icon={<Square size={13} />} onClick={() => void endSession()} />
        )}
      </header>

      <main
        style={{
          flex: 1,
          overflowY: "auto",
          padding: `0 ${spacing.base}px ${spacing.base}px`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div style={{ width: "100%", maxWidth: 560, display: "flex", flexDirection: "column", gap: spacing.lg }}>
          {hero ? (
            <>
              <section
                className="ui-rise"
                aria-label="Current task"
                style={{
                  background: colors.surface.primary,
                  border: `1px solid ${colors.border.subtle}`,
                  borderRadius: radii.xxl,
                  padding: `${spacing.xl}px ${spacing.base}px`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: spacing.base,
                }}
              >
                <Text variant="headline" weight={800} align="center" style={{ overflowWrap: "anywhere" }}>
                  {hero.text}
                </Text>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: colors.text.tertiary }}>
                  <Clock size={13} aria-hidden="true" />
                  <Text variant="caption" tone="tertiary">
                    {minutes(hero.estimateMin)}
                  </Text>
                </span>

                <div style={{ position: "relative", width: 220, height: 220, maxWidth: "100%" }}>
                  <TimerRing progress={session.active ? progress : 0} phase={phase} />
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      variant="display"
                      weight={900}
                      role="timer"
                      aria-label={`${clockLabel(remaining)} left`}
                      style={{ fontVariantNumeric: "tabular-nums", letterSpacing: -1 }}
                    >
                      {clockLabel(remaining)}
                    </Text>
                    <Text variant="caption" tone="tertiary" style={{ textTransform: "uppercase", letterSpacing: 2 }}>
                      {phaseLabel}
                    </Text>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
                  <Button
                    label={running ? "Pause" : session.active ? "Resume" : "Start"}
                    size="lg"
                    icon={running ? <Pause size={18} /> : <Play size={18} />}
                    onClick={toggle}
                  />
                  {session.active && elapsed > 0 && (
                    <button
                      type="button"
                      aria-label="Restart timer"
                      title="Restart"
                      onClick={() => void restart()}
                      className="ui-press"
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 999,
                        display: "grid",
                        placeItems: "center",
                        border: `1px solid ${colors.border.subtle}`,
                        background: "transparent",
                        color: colors.text.secondary,
                        cursor: "pointer",
                      }}
                    >
                      <RotateCcw size={16} />
                    </button>
                  )}
                </div>

                <div style={{ display: "flex", gap: spacing.sm, width: "100%" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Button label="Complete" fullWidth icon={<Check size={16} />} onClick={openCapture} />
                  </div>
                  <Button label="Carry" variant="secondary" icon={<Clock size={16} />} onClick={carryHero} />
                </div>
              </section>

              {queue.length > 0 && (
                <section aria-label="Up next" style={{ display: "flex", flexDirection: "column", gap: spacing.sm }}>
                  <Text variant="caption" tone="tertiary" style={{ textTransform: "uppercase", letterSpacing: 2 }}>
                    Next · {queue.length}
                  </Text>
                  {queue.map((t, i) => (
                    <div
                      key={t.id}
                      className="ui-rise"
                      style={{
                        animationDelay: `${Math.min(i, 5) * 30}ms`,
                        display: "flex",
                        alignItems: "center",
                        gap: spacing.sm,
                        background: colors.surface.primary,
                        border: `1px solid ${colors.border.subtle}`,
                        borderRadius: radii.md,
                        padding: `${spacing.sm}px ${spacing.base}px`,
                      }}
                    >
                      <Text variant="bodySm" tone="secondary" style={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>
                        {t.text}
                      </Text>
                      <Text variant="caption" tone="tertiary">
                        {minutes(t.estimateMin)}
                      </Text>
                    </div>
                  ))}
                </section>
              )}
            </>
          ) : (
            <div
              className="ui-rise"
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: spacing.base, paddingTop: spacing.huge }}
            >
              <Check size={40} color={colors.tint.success} aria-hidden="true" />
              <Text variant="headline" weight={800} align="center">
                All done
              </Text>
              <span style={{ display: "inline-flex", gap: spacing.base, color: colors.text.secondary }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Check size={14} aria-hidden="true" />
                  <Text variant="bodySm" tone="secondary">
                    {today.summary.done}
                  </Text>
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Clock size={14} aria-hidden="true" />
                  <Text variant="bodySm" tone="secondary">
                    {minutes(today.summary.actualMin)}
                  </Text>
                </span>
              </span>
              <Button
                label="Today"
                onClick={() => {
                  focus.end();
                  leave();
                }}
              />
            </div>
          )}

          {today.carryFrom.length > 0 && (
            <section
              aria-label="From yesterday"
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
                </div>
              ))}
            </section>
          )}

          <QuickCapture onCapture={today.addCapture} />
        </div>
      </main>

      {/* One compact control; wraps rather than overflowing on a phone. */}
      <footer
        style={{
          flexShrink: 0,
          borderTop: `1px solid ${colors.border.subtle}`,
          background: colors.surface.primary,
          padding: `${spacing.sm}px ${spacing.base}px calc(${spacing.sm}px + env(safe-area-inset-bottom, 0px))`,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "center",
          gap: spacing.sm,
        }}
      >
        <Segmented label="Sound" size="sm" options={AMBIENCE} value={focus.ambience} onChange={focus.setAmbience} />
      </footer>

      <CaptureSheet
        draft={capture}
        projects={projects}
        hasNext={queue.length > 0}
        onChange={(patch) => setCapture((c) => (c ? { ...c, ...patch } : c))}
        onCancel={() => setCapture(null)}
        onSave={saveCapture}
      />
    </div>
  );
}

function TimerRing({ progress, phase }: { progress: number; phase: FocusPhase }) {
  const { colors } = useTokens();
  const size = 220;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = phase === "focus" ? colors.surface.skillhive : colors.tint.success;
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      aria-hidden="true"
      style={{ transform: "rotate(-90deg)", maxWidth: "100%", height: "auto" }}
    >
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={colors.border.subtle} strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - clamped)}
        // The colour eases into the break (and back) instead of snapping.
        style={{ transition: "stroke-dashoffset 0.5s linear, stroke 320ms var(--ease-ui)" }}
      />
    </svg>
  );
}

function QuickCapture({ onCapture }: { onCapture: (text: string) => void }) {
  const { colors, radii, spacing } = useTokens();
  const [text, setText] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  function commit() {
    const trimmed = text.trim();
    if (!trimmed) return;
    onCapture(trimmed);
    void saveNote({ ritual_type: "capture", body: trimmed });
    setText("");
    ref.current?.focus();
  }

  const hasText = text.trim().length > 0;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: spacing.xs,
        background: colors.surface.primary,
        border: `1px solid ${colors.border.subtle}`,
        borderRadius: radii.pill,
        padding: `6px ${spacing.base}px`,
      }}
    >
      <Sparkles size={15} color={colors.tint.accent} aria-hidden="true" />
      <input
        ref={ref}
        value={text}
        aria-label="Quick capture"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
        }}
        placeholder="Quick capture"
        style={{
          flex: 1,
          minWidth: 0,
          border: "none",
          outline: "none",
          background: "transparent",
          color: colors.text.primary,
          fontSize: 14,
          fontFamily: "inherit",
          padding: "6px 0",
        }}
      />
      <span
        aria-hidden="true"
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "3px 7px",
          borderRadius: 7,
          border: `1px solid ${colors.border.subtle}`,
          background: colors.surface.sunken,
          color: hasText ? colors.tint.accent : colors.text.tertiary,
          transition: "color 0.15s ease",
        }}
      >
        <CornerDownLeft size={12} />
      </span>
    </div>
  );
}
