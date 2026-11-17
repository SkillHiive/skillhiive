import { useCallback, useEffect, useState } from "react";
import { Link2 } from "lucide-react";
import { useNavigate } from "react-router";
import { Text } from "@skillhiive/ui";
import { useTokens } from "@/theme";
import { useProfile } from "@/hooks/useProfile";
import {
  useProjectCodingTime,
  useTrackerConnection,
} from "@/hooks/useTimeTracker";
import {
  fetchProjectMappings,
  formatDuration,
  type ProjectMapping,
} from "@/lib/timeTracker";
import { CodingTimeBadge, LanguageBreakdown } from "./parts";
import { TrackerProjectPickerModal } from "./TrackerProjectPickerModal";

/**
 * Per-project "connect your time tracker" card (Hack Club style).
 *
 * Owner view: empty state → connect CTA; mapped state → live badge,
 * language breakdown and manage-link. Visibility is ProjectCueSources' one switch.
 * Visitors render nothing here — Project.tsx shows the badge itself.
 */
export function WakatimeConnectCard({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const { colors, spacing, radii } = useTokens();
  const navigate = useNavigate();
  const { profile: me } = useProfile();
  const { coding, refresh } = useProjectCodingTime(projectId);
  const { connection } = useTrackerConnection();

  const [mappings, setMappings] = useState<ProjectMapping[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const loadMappings = useCallback(() => {
    void fetchProjectMappings(projectId).then(setMappings);
    refresh();
  }, [projectId, refresh]);

  useEffect(() => {
    // Only meaningful for the owner; RPC returns [] for everyone else.
    void fetchProjectMappings(projectId).then(setMappings);
  }, [projectId]);

  const totalMappedSeconds = mappings.reduce(
    (acc, m) => acc + (m.total_seconds ?? 0),
    0,
  );

  return (
    <div
      style={{
        background: colors.surface.primary,
        border: `1px solid ${colors.border.subtle}`,
        borderRadius: radii.lg,
        padding: spacing.base,
        display: "flex",
        flexDirection: "column",
        gap: spacing.sm,
      }}
    >
<div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
        <Link2 size={15} color={colors.surface.skillhive} />
        <Text variant="label" tone="secondary" style={{ flex: 1 }}>
          Auto-tracked time
        </Text>
        <button
          onClick={() =>
            connection ? setPickerOpen(true) : navigate("/settings/trackers")
          }
          style={{
            background: connection
              ? colors.surface.skillhive
              : "transparent",
            border: `1px solid ${connection ? colors.surface.skillhive : colors.border.subtle}`,
            borderRadius: radii.pill,
            color: connection ? "#111" : colors.text.secondary,
            fontSize: 12,
            fontWeight: 700,
            fontFamily: "inherit",
            padding: "6px 14px",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          {!connection
            ? "Connect Tracker"
            : mappings.length > 0
            ? "Manage Links"
            : "Link Projects"}
        </button>
      </div>

      {!connection ? (
        <div
          style={{
            padding: spacing.sm,
            background: colors.bg.accentDim,
            border: `1px solid ${colors.surface.skillhive}33`,
            borderRadius: radii.md,
            display: "flex",
            flexDirection: "column",
            gap: spacing.sm,
          }}
        >
          <Text variant="caption" tone="skillhive" weight={700} style={{ display: "block" }}>
            No tracker connected
          </Text>
          <Text variant="bodySm" tone="secondary">
            Connect Wakatime or Hackatime in Settings → Trackers. Your coding time will be
            auto-fetched — no manual entry needed.
          </Text>
          <button
            onClick={() => navigate("/settings/trackers")}
            style={{
              alignSelf: "flex-start",
              padding: "8px 14px",
              borderRadius: radii.pill,
              border: `1px solid ${colors.surface.skillhive}`,
              background: colors.bg.accentDim,
              color: colors.text.skillhive,
              fontSize: 12,
              fontWeight: 800,
              fontFamily: "inherit",
              cursor: "pointer",
            }}
          >
            Open Settings → Trackers
          </button>
        </div>
      ) : mappings.length === 0 ? (
        <div
          style={{
            padding: spacing.sm,
            background: colors.bg.accentDim,
            border: `1px solid ${colors.surface.skillhive}33`,
            borderRadius: radii.md,
            display: "flex",
            flexDirection: "column",
            gap: spacing.sm,
          }}
        >
          <Text variant="caption" tone="skillhive" weight={700} style={{ display: "block" }}>
            No projects linked yet
          </Text>
          <Text variant="bodySm" tone="secondary">
            Your tracker has coding data but it's not linked to <Text tone="skillhive" weight={700}>"{projectName}"</Text>.
          </Text>
          <Text variant="caption" tone="skillhive" weight={700} style={{ display: "block" }}>
            ⚡ Time is auto-fetched from Hackatime/Wakatime — just link projects once
          </Text>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", gap: spacing.sm, flexWrap: "wrap", alignItems: "center" }}>
            <CodingTimeBadge
              totalSeconds={totalMappedSeconds || coding?.total_seconds || 0}
              lastCodedAt={coding?.last_coded_at}
            />
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                fontWeight: 700,
                color: colors.text.tertiary,
              }}
            >
              {mappings.length} linked ·{" "}
              {formatDuration(totalMappedSeconds)} tracked
            </span>
          </div>

          {coding && coding.language_breakdown.length > 0 && (
            <LanguageBreakdown breakdown={coding.language_breakdown} maxItems={5} />
          )}

          <Text variant="caption" tone="tertiary">
            Who can see this is set at the top of the page.
          </Text>
        </>
      )}

      {pickerOpen && me && (
        <TrackerProjectPickerModal
          projectId={projectId}
          projectName={projectName}
          currentMappings={mappings}
          onClose={() => setPickerOpen(false)}
          onChanged={loadMappings}
        />
      )}
    </div>
  );
}
