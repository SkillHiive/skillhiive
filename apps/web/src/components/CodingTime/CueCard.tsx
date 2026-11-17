import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Laptop, Trash2 } from "lucide-react";
import { Text } from "@skillhiive/ui";
import { useTokens } from "@/theme";
import { formatDuration } from "@/lib/timeTracker";
import {
  fetchCodingTimeComparison,
  fetchCodingTimeSource,
  fetchMyCueDevices,
  revokeCueDevice,
  setCodingTimeSource,
  summarizeComparison,
  type CodingTimeSource,
  type ComparisonDay,
  type CueDevice,
  type CueResult,
} from "@/lib/cue";

interface Props {
  /** Whether a WakaTime or Hackatime connection exists, which is when a source choice is meaningful. */
  hasTracker: boolean;
  /** Called after anything that changes the user's aggregated coding time. */
  onChanged?: () => void;
}

/** Linked Cue devices and which source feeds the profile. Projects live on the Home page. */
export function CueCard({ hasTracker, onChanged }: Props) {
  const { colors, spacing, radii } = useTokens();
  const [loading, setLoading] = useState(true);
  const [devices, setDevices] = useState<CueDevice[]>([]);
  const [source, setSource] = useState<CodingTimeSource>("tracker");
  const [comparison, setComparison] = useState<ComparisonDay[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const [reloads, setReloads] = useState(0);

  useEffect(() => {
    let active = true;
    void Promise.all([
      fetchMyCueDevices(),
      fetchCodingTimeSource(),
      fetchCodingTimeComparison(7),
    ]).then(([nextDevices, nextSource, nextComparison]) => {
      if (!active) return;
      setDevices(nextDevices);
      setSource(nextSource);
      setComparison(nextComparison);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [reloads]);

  const active = devices.filter((device) => device.revoked_at === null);
  const summary = summarizeComparison(comparison);

  async function after(pending: Promise<CueResult>, done: string) {
    const result = await pending;
    setMessage(result.ok ? done : result.error);
    if (result.ok) {
      setReloads((count) => count + 1);
      onChanged?.();
    }
  }

  async function remove(device: CueDevice, deleteData: boolean) {
    setConfirming(null);
    await after(
      revokeCueDevice(device.id, deleteData),
      deleteData ? "Device and everything it sent were deleted." : "Device removed. Its history was kept.",
    );
  }

  const card: React.CSSProperties = {
    background: colors.surface.primary,
    border: `1px solid ${colors.border.subtle}`,
    borderRadius: radii.lg,
    padding: spacing.base,
    display: "flex",
    flexDirection: "column",
    gap: spacing.sm,
  };
  const quiet: React.CSSProperties = {
    padding: "6px 12px",
    borderRadius: radii.pill,
    border: `1px solid ${colors.border.subtle}`,
    background: "transparent",
    color: colors.text.secondary,
    fontFamily: "inherit",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  };

  return (
    <section style={card} aria-label="Cue">
      <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
        <Laptop size={18} color={colors.surface.skillhive} />
        <div style={{ flex: 1 }}>
          <Text variant="title" weight={800}>Cue</Text>
          <Text variant="caption" tone="tertiary">
            Tracks time on your own computer, including work done with coding agents. No editor plugin or API key.
          </Text>
        </div>
      </div>

      {loading ? (
        <Text variant="bodySm" tone="tertiary">Loading…</Text>
      ) : active.length === 0 ? (
        <Text variant="bodySm" tone="secondary">
          Install Cue on your computer, then run <code>cue login</code>. It prints a code and a link back to this
          site; approve it and your daily totals start arriving. Run <code>cue sync --dry-run</code> any time to
          see exactly what would be sent.
        </Text>
      ) : (
        <>
          <Text variant="label" tone="secondary">Linked devices</Text>
          {active.map((device) => (
            <div key={device.id} style={{ display: "flex", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <Text variant="bodySm" weight={700}>{device.name}</Text>
                <Text variant="caption" tone="tertiary">
                  {device.platform} ·{" "}
                  {device.last_seen_at ? `last sync ${new Date(device.last_seen_at).toLocaleString()}` : "no sync yet"}
                </Text>
              </div>
              {confirming === device.id ? (
                <>
                  <button style={quiet} onClick={() => void remove(device, false)}>
                    Remove, keep history
                  </button>
                  <button style={{ ...quiet, color: colors.tint.warning }} onClick={() => void remove(device, true)}>
                    Remove and delete its data
                  </button>
                  <button style={quiet} onClick={() => setConfirming(null)}>Cancel</button>
                </>
              ) : (
                <button style={quiet} onClick={() => setConfirming(device.id)} aria-label={`Remove ${device.name}`}>
                  <Trash2 size={13} style={{ verticalAlign: -2 }} /> Remove
                </button>
              )}
            </div>
          ))}

          <Text variant="caption" tone="secondary" style={{ marginTop: spacing.sm }}>
            Your projects from Cue are on <Link to="/home">Today</Link>, under Projects. Only you see them
            until you make one public. <code>cue projects</code> on your computer shows which ones it keeps to itself.
          </Text>

          {hasTracker && (
            <>
              <Text variant="label" tone="secondary" style={{ marginTop: spacing.sm }}>Time shown on your profile</Text>
              <div role="radiogroup" aria-label="Time shown on your profile" style={{ display: "flex", gap: spacing.sm, flexWrap: "wrap" }}>
                {(["tracker", "cue"] as const).map((option) => (
                  <button
                    key={option}
                    role="radio"
                    aria-checked={source === option}
                    onClick={() => source !== option && void after(setCodingTimeSource(option), option === "cue" ? "Your profile now shows time from Cue." : "Your profile now shows time from your tracker.")}
                    style={{
                      ...quiet,
                      borderColor: source === option ? colors.surface.skillhive : colors.border.subtle,
                      color: source === option ? colors.text.skillhive : colors.text.secondary,
                    }}
                  >
                    {option === "cue" ? "Cue" : "Wakatime / Hackatime"}
                  </button>
                ))}
              </div>
              <Text variant="caption" tone="secondary">
                Switching to Cue keeps your earlier history; days from your first Cue day on come from Cue only.
              </Text>
              <Text variant="caption" tone="secondary">
                Last 7 days: Cue {formatDuration(summary.cueTotal)}, tracker {formatDuration(summary.trackerTotal)}.
                {summary.comparableDays > 0
                  ? ` They agree within 10% on ${summary.closeDays} of the ${summary.comparableDays} days both counted.`
                  : " They haven't both counted the same day yet, so there's nothing to compare."}
              </Text>
            </>
          )}
        </>
      )}

      {message && <Text variant="caption" role="status" tone="secondary">{message}</Text>}
    </section>
  );
}
