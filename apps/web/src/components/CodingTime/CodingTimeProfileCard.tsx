import { useEffect, useState } from "react";
import { Clock, Flame, TrendingUp, RefreshCw, ExternalLink } from "lucide-react";
import { Text } from "@skillhiive/ui";
import { useTokens } from "@/theme";
import { useUserCodingStats } from "@/hooks/useTimeTracker";
import { triggerSync, formatDuration, type UserCodingTime } from "@/lib/timeTracker";
import { MiniHeatmap } from "./parts";
import { agentSharePercent, earlierHistoryNote, fetchUserCodingExtras, type CodingExtras } from "@/lib/cue";

interface Props {
  userId: string;
  isOwnProfile: boolean;
  username?: string;
}

export function CodingTimeProfileCard({ userId, isOwnProfile, username }: Props) {
  const { colors, spacing, radii } = useTokens();
  const { stats, loading, refresh } = useUserCodingStats(userId);
  const [syncing, setSyncing] = useState(false);
  const [extras, setExtras] = useState<CodingExtras | null>(null);

  useEffect(() => {
    let active = true;
    void fetchUserCodingExtras(userId).then((next) => {
      if (active) setExtras(next);
    });
    return () => {
      active = false;
    };
  }, [userId, stats?.total_seconds]);

  const handleSync = async () => {
    if (!isOwnProfile) return;
    setSyncing(true);
    try {
      await triggerSync(true);
      await new Promise((r) => setTimeout(r, 500));
      refresh();
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          background: colors.surface.primary,
          border: `1px solid ${colors.border.subtle}`,
          borderRadius: radii.lg,
          padding: spacing.base,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
          <div
            style={{
              width: 18,
              height: 18,
              border: `2px solid ${colors.border.subtle}`,
              borderTopColor: colors.surface.skillhive,
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <Text variant="bodySm" tone="tertiary">
            Loading coding stats…
          </Text>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (!stats || !stats.is_public) {
    if (isOwnProfile) {
      return (
        <div
          style={{
            background: colors.surface.primary,
            border: `1px solid ${colors.border.subtle}`,
            borderRadius: radii.lg,
            padding: spacing.base,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm }}>
            <Clock size={16} color={colors.surface.skillhive} />
            <Text variant="label" tone="secondary">
              Coding Time
            </Text>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 0.5,
                padding: "2px 6px",
                borderRadius: 999,
                background: colors.surface.skillhive + "22",
                color: colors.surface.skillhive,
                border: `1px solid ${colors.surface.skillhive}55`,
              }}
            >
              AUTO-FETCHED
            </span>
          </div>
          <Text variant="bodySm" tone="tertiary">
            Connect Wakatime or Hackatime in Settings → Coding time. Your coding time is
            auto-fetched from the tracker — no manual entry needed.
          </Text>
          <Text variant="caption" tone="tertiary" style={{ display: "block", marginTop: spacing.xs }}>
            Your data is private by default. Toggle visibility in Settings → Coding time.
          </Text>
        </div>
      );
    }
    return null;
  }

  const totalHours = (stats.total_seconds / 3600).toFixed(1);
  const lastCoded = stats.last_coded_at
    ? new Date(stats.last_coded_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : "Never";

  return (
    <div
      style={{
        background: colors.surface.primary,
        border: `1px solid ${colors.border.subtle}`,
        borderRadius: radii.lg,
        padding: spacing.base,
        display: "flex",
        flexDirection: "column",
        gap: spacing.base,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: spacing.sm }}>
        <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
          <Clock size={16} color={colors.surface.skillhive} />
          <Text variant="label" tone="secondary">
            Coding Time
          </Text>
          {stats.is_public && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 0.5,
                padding: "2px 6px",
                borderRadius: 999,
                background: colors.tint.success + "22",
                color: colors.tint.success,
                border: `1px solid ${colors.tint.success}55`,
              }}
            >
              {extras?.source === "cue" ? "VIA CUE" : "VERIFIED"}
            </span>
          )}
        </div>
        {isOwnProfile && extras?.source !== "cue" && (
          <button
            onClick={handleSync}
            disabled={syncing}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 10px",
              borderRadius: radii.pill,
              border: `1px solid ${colors.border.subtle}`,
              background: "transparent",
              color: colors.text.secondary,
              fontSize: 11,
              fontWeight: 700,
              fontFamily: "inherit",
              cursor: syncing ? "wait" : "pointer",
            }}
          >
            {syncing ? (
              <>
                <div
                  style={{
                    width: 12,
                    height: 12,
                    border: `2px solid ${colors.surface.skillhive}55`,
                    borderTopColor: colors.surface.skillhive,
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                  }}
                />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                Syncing…
              </>
            ) : (
              <>
                <RefreshCw size={12} />
                Sync Now
              </>
            )}
          </button>
        )}
      </div>

      {extras?.source === "cue" && (
        <Text variant="caption" tone="tertiary">
          {isOwnProfile ? "From your device via Cue" : "From their device via Cue"}
          {agentSharePercent(stats.total_seconds, extras.agent_seconds) > 0
            ? ` · ${agentSharePercent(stats.total_seconds, extras.agent_seconds)}% with a coding agent`
            : ""}
        </Text>
      )}
      {earlierHistoryNote(extras) && (
        <Text variant="caption" tone="tertiary">{earlierHistoryNote(extras)}</Text>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: spacing.sm }}>
        <StatCard
          icon={<Clock size={18} color={colors.surface.skillhive} />}
          label="Total Time"
          value={`${totalHours}h`}
        />
        <StatCard
          icon={<Flame size={18} color={colors.tint.warning} />}
          label="Current Streak"
          value={`${stats.current_streak_days}d`}
        />
        <StatCard
          icon={<TrendingUp size={18} color={colors.tint.success} />}
          label="Longest Streak"
          value={`${stats.longest_streak_days}d`}
        />
      </div>

      {stats.last_coded_at && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: spacing.sm,
            paddingTop: spacing.xs,
            borderTop: `1px solid ${colors.border.subtle}`,
          }}
        >
          <Text variant="caption" tone="tertiary">
            Last coded: {lastCoded}
          </Text>
          {username && (
            <a
              href={`https://wakatime.com/@${username}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                marginLeft: "auto",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontSize: 11,
                fontWeight: 600,
                color: colors.surface.skillhive,
              }}
            >
              <ExternalLink size={10} />
              View on Wakatime
            </a>
          )}
        </div>
      )}

      {stats.language_breakdown.length > 0 && (
        <div>
          <Text variant="caption" tone="secondary" style={{ textTransform: "uppercase", letterSpacing: 1 }}>
            Languages
          </Text>
          <div style={{ marginTop: spacing.sm }}>
            <LanguageBars breakdown={stats.language_breakdown} maxItems={6} colors={colors} />
          </div>
        </div>
      )}

      {stats.daily_breakdown.length > 0 && (
        <div>
          <Text variant="caption" tone="secondary" style={{ textTransform: "uppercase", letterSpacing: 1 }}>
            Activity (Last 12 Weeks)
          </Text>
          <div style={{ marginTop: spacing.sm }}>
            <MiniHeatmap daily={stats.daily_breakdown} />
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  const { colors, radii, spacing } = useTokens();
  return (
    <div
      style={{
        background: colors.bg.muted,
        border: `1px solid ${colors.border.subtle}`,
        borderRadius: radii.md,
        padding: spacing.base,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
      }}
    >
      <div style={{ display: "flex", alignItems: "center" }}>{icon}</div>
      <Text variant="title" tone="skillhive" weight={900} style={{ lineHeight: 1 }}>
        {value}
      </Text>
      <Text variant="caption" tone="tertiary" style={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
        {label}
      </Text>
    </div>
  );
}

function LanguageBars({
  breakdown,
  maxItems,
  colors,
}: {
  breakdown: UserCodingTime["language_breakdown"];
  maxItems: number;
  colors: ReturnType<typeof useTokens>["colors"];
}) {
  const top = breakdown.slice(0, maxItems);
  if (top.length === 0) return null;
  const max = Math.max(...top.map((l) => l.total_seconds), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {top.map((lang) => (
        <div key={lang.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Text
            variant="caption"
            weight={700}
            style={{ width: 72, overflow: "hidden", textOverflow: "ellipsis" }}
          >
            {lang.name}
          </Text>
          <div
            style={{
              flex: 1,
              height: 6,
              borderRadius: 3,
              background: colors.bg.muted,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${Math.max(4, (lang.total_seconds / max) * 100)}%`,
                height: "100%",
                borderRadius: 3,
                background: colors.surface.skillhive,
              }}
            />
          </div>
          <Text variant="caption" tone="tertiary" style={{ width: 52, textAlign: "right" }}>
            {formatDuration(lang.total_seconds)}
          </Text>
        </div>
      ))}
    </div>
  );
}