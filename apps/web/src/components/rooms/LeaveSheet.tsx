import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Users } from "lucide-react";
import { Button, Text } from "@skillhiive/ui";
import { useTokens } from "@/theme";
import { formatDuration } from "@/lib/timeTracker";
import type { Project } from "@/lib/todayData";
import { MONO } from "@/lib/room";
import { useEscape } from "@/hooks/useEscape";

export interface LeaveDraft {
  focusSeconds: number;
  people: number;
  shipped: string;
  projectId: string;
}

/** Leaving a room: the focus time it gave you, saved with what you shipped and where it belongs. */
export function LeaveSheet({
  draft,
  projects,
  onChange,
  onStay,
  onLeave,
  onPost,
}: {
  draft: LeaveDraft | null;
  projects: Project[];
  onChange: (patch: Partial<Omit<LeaveDraft, "focusSeconds" | "people">>) => void;
  onStay: () => void;
  onLeave: () => void;
  /** Save, leave, and open the Floor's composer with what shipped. Nothing is posted for you. */
  onPost: () => void;
}) {
  const { colors, radii, spacing } = useTokens();
  useEscape(draft !== null, onStay);
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

  return createPortal(
    <AnimatePresence>
      {draft && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onStay}
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
            aria-label="Leave the room"
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
              background: colors.bg.muted,
              borderRadius: radii.xxl,
              border: `1px solid ${colors.border.subtle}`,
              padding: spacing.lg,
              display: "flex",
              flexDirection: "column",
              gap: spacing.base,
            }}
          >
            <div style={{ width: 40, height: 4, borderRadius: 999, background: colors.border.strong, margin: "0 auto" }} />

            <div style={{ display: "flex", alignItems: "baseline", gap: spacing.md }}>
              <Text variant="headline" weight={900} style={{ fontVariantNumeric: "tabular-nums", letterSpacing: -0.5 }}>
                {formatDuration(draft.focusSeconds)}
              </Text>
              <span style={{ fontFamily: MONO, fontSize: 12, color: colors.text.skillhive }}>focus</span>
              <span
                aria-label={`${draft.people} people`}
                style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, fontFamily: MONO, fontSize: 13, color: colors.text.tertiary }}
              >
                <Users size={14} aria-hidden="true" />
                {draft.people}
              </span>
            </div>

            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Text variant="caption" tone="tertiary" style={caption}>
                Shipped
              </Text>
              <textarea
                rows={2}
                value={draft.shipped}
                onChange={(e) => onChange({ shipped: e.target.value })}
                style={{ ...field, resize: "vertical" }}
              />
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

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end" style={{ marginTop: spacing.xs }}>
              <div className="w-full sm:w-auto">
                <Button label="Stay" variant="ghost" fullWidth onClick={onStay} />
              </div>
              {draft.shipped.trim() && (
                <div className="w-full sm:w-auto">
                  <Button label="Save and post" variant="secondary" fullWidth onClick={onPost} />
                </div>
              )}
              <div className="w-full sm:w-auto">
                <Button label="Save and leave" fullWidth onClick={onLeave} />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
