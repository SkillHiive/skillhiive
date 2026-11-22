import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Mic, MicOff, Square } from "lucide-react";
import { Text, Button } from "@skillhiive/ui";
import { useTokens } from "@/theme";
import type { TodayTask } from "@/hooks/useToday";
import type { Project } from "@/lib/todayData";

export interface CaptureDraft {
  task: TodayTask;
  actualMin: number;
  shipped: string;
  blockers: string;
  /** A project the user already has, or "" for none. */
  projectId: string;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: { results?: ArrayLike<ArrayLike<{ transcript?: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}

/** Finishing a task: how long it took, what shipped, what's in the way, which project. */
export function CaptureSheet({
  draft,
  projects,
  hasNext,
  onChange,
  onCancel,
  onSave,
}: {
  draft: CaptureDraft | null;
  projects: Project[];
  /** Another task is queued, so "next" can carry on with it. */
  hasNext: boolean;
  onChange: (patch: Partial<Omit<CaptureDraft, "task">>) => void;
  onCancel: () => void;
  /** endAfter: end the session after saving. */
  onSave: (endAfter: boolean) => void;
}) {
  const { colors, radii, spacing } = useTokens();
  const [listening, setListening] = useState(false);
  const recRef = useRef<{ stop: () => void } | null>(null);

  function toggleVoice(onResult: (text: string) => void) {
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const transcript = e.results?.[0]?.[0]?.transcript ?? "";
      if (transcript) onResult(transcript);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = { stop: () => rec.stop() };
    setListening(true);
    rec.start();
  }

  const field: React.CSSProperties = {
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
    border: `1px solid ${colors.border.default}`,
    borderRadius: radii.md,
    padding: "12px 14px",
    fontSize: 15,
    background: colors.surface.sunken,
    color: colors.text.primary,
    outline: "none",
    fontFamily: "inherit",
  };
  const caption: React.CSSProperties = { textTransform: "uppercase", letterSpacing: 1 };
  const canVoice =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  return (
    <AnimatePresence>
      {draft && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onCancel}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1400,
            background: colors.overlay.scrim,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`Finish ${draft.task.text}`}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 480,
              maxHeight: "calc(100dvh - 24px)",
              overflowY: "auto",
              boxSizing: "border-box",
              margin: `0 ${spacing.sm}px ${spacing.sm}px`,
              background: colors.surface.primary,
              borderRadius: radii.xxl,
              border: `1px solid ${colors.border.subtle}`,
              padding: spacing.lg,
              display: "flex",
              flexDirection: "column",
              gap: spacing.base,
            }}
          >
            <div style={{ width: 40, height: 4, borderRadius: 999, background: colors.border.strong, margin: "0 auto" }} />
            <Text variant="subtitle" style={{ display: "block", overflowWrap: "anywhere" }}>
              {draft.task.text}
            </Text>

            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Text variant="caption" tone="tertiary" style={caption}>
                Minutes
              </Text>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={draft.actualMin}
                onChange={(e) => onChange({ actualMin: Math.max(0, Number(e.target.value) || 0) })}
                style={{ ...field, fontVariantNumeric: "tabular-nums" }}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Text variant="caption" tone="tertiary" style={caption}>
                  Shipped
                </Text>
                {canVoice && (
                  <button
                    type="button"
                    aria-label={listening ? "Stop dictation" : "Dictate"}
                    aria-pressed={listening}
                    title={listening ? "Stop" : "Dictate"}
                    className="ui-press"
                    onClick={() =>
                      toggleVoice((text) => onChange({ shipped: draft.shipped ? `${draft.shipped} ${text}` : text }))
                    }
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 28,
                      height: 24,
                      borderRadius: 999,
                      border: `1px solid ${listening ? colors.surface.skillhive : colors.border.subtle}`,
                      background: listening ? `${colors.surface.skillhive}22` : "transparent",
                      color: listening ? colors.surface.skillhive : colors.text.tertiary,
                      cursor: "pointer",
                    }}
                  >
                    {listening ? <MicOff size={12} /> : <Mic size={12} />}
                  </button>
                )}
              </span>
              <textarea
                rows={2}
                value={draft.shipped}
                onChange={(e) => onChange({ shipped: e.target.value })}
                style={{ ...field, resize: "vertical" }}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Text variant="caption" tone="tertiary" style={caption}>
                Blockers
              </Text>
              <input value={draft.blockers} onChange={(e) => onChange({ blockers: e.target.value })} style={field} />
            </label>

            {projects.length > 0 && (
              <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <Text variant="caption" tone="tertiary" style={caption}>
                  Project
                </Text>
                <select
                  value={draft.projectId}
                  onChange={(e) => onChange({ projectId: e.target.value })}
                  style={{ ...field, cursor: "pointer" }}
                >
                  <option value="">None</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {/* Stacked on phones (primary on top), in a row from the sm breakpoint. */}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end" style={{ marginTop: spacing.xs }}>
              <div className="w-full sm:w-auto">
                <Button label="Cancel" variant="ghost" fullWidth onClick={onCancel} />
              </div>
              {hasNext && (
                <div className="w-full sm:w-auto">
                  <Button label="Save & end" variant="secondary" fullWidth icon={<Square size={14} />} onClick={() => onSave(true)} />
                </div>
              )}
              <div className="w-full sm:w-auto">
                <Button
                  label={hasNext ? "Save & next" : "Save"}
                  fullWidth
                  icon={<Check size={15} />}
                  onClick={() => onSave(!hasNext)}
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
