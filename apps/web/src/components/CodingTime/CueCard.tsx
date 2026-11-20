import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Laptop, Trash2 } from "lucide-react";
import { useConfirm } from "@/lib/confirm";
import { Text } from "@skillhiive/ui";
import { useTokens } from "@/theme";
import { timeAgo } from "@/lib/timeAgo";
import {
  fetchCodingTimeSource,
  fetchMyCueDevices,
  revokeCueDevice,
  setCodingTimeSource,
  type CodingTimeSource,
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
  const [message, setMessage] = useState<string | null>(null);
  const confirm = useConfirm();

  const [reloads, setReloads] = useState(0);

  useEffect(() => {
    let active = true;
    void Promise.all([
      fetchMyCueDevices(),
      fetchCodingTimeSource(),
    ]).then(([nextDevices, nextSource]) => {
      if (!active) return;
      setDevices(nextDevices);
      setSource(nextSource);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [reloads]);

  const active = devices.filter((device) => device.revoked_at === null);

  async function after(pending: Promise<CueResult>, done: string) {
    const result = await pending;
    setMessage(result.ok ? done : result.error);
    if (result.ok) {
      setReloads((count) => count + 1);
      onChanged?.();
    }
  }

  async function remove(device: CueDevice) {
    const answer = await confirm({
      title: "Remove this device?",
      description: "It stops syncing. Past time stays unless you tick the box.",
      confirmLabel: "Remove",
      option: { label: "Also delete everything it sent" },
    });
    if (!answer) return;
    const deleteData = answer.checked;
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

  const iconButton: React.CSSProperties = {
    ...quiet,
    padding: 7,
    display: "inline-flex",
    alignItems: "center",
    flexShrink: 0,
  };

  const block: React.CSSProperties = { display: "block" };

  return (
    <section style={{ ...card, gap: spacing.base }} aria-label="Cue">
      <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
        <Laptop size={18} color={colors.surface.skillhive} />
        <Text variant="title" weight={800}>Cue</Text>
      </div>

      {loading ? (
        <Text variant="bodySm" tone="tertiary">Loading…</Text>
      ) : active.length === 0 ? (
        <Text variant="bodySm" tone="secondary">
          Install Cue on your computer, then run <code>cue login</code> and approve the link it prints.
        </Text>
      ) : (
        <>
          <div>
            <Text variant="label" tone="secondary" style={{ ...block, marginBottom: spacing.xs }}>Devices</Text>
            {active.map((device) => (
              <div
                key={device.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: spacing.sm,
                  padding: `${spacing.sm}px 0`,
                  borderTop: `1px solid ${colors.border.subtle}`,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    variant="bodySm"
                    weight={700}
                    style={{ ...block, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  >
                    <span title={device.name}>{device.name}</span>
                  </Text>
                  <Text variant="caption" tone="tertiary" style={block}>
                    {device.last_seen_at ? `Synced ${timeAgo(device.last_seen_at)}` : "No sync yet"}
                  </Text>
                </div>
                <button
                  style={iconButton}
                  onClick={() => void remove(device)}
                  aria-label={`Remove ${device.name}`}
                  title="Remove device"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>

          {hasTracker && (
            <div style={{ display: "flex", flexDirection: "column", gap: spacing.sm }}>
              <Text variant="label" tone="secondary">Time shown on your profile</Text>
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
              <Text variant="caption" tone="tertiary">
                Switching to Cue keeps your earlier history.
              </Text>
            </div>
          )}

          <Text variant="caption" tone="tertiary">
            Your Cue projects are on <Link to="/home" style={{ color: colors.text.skillhive }}>Today</Link>.
          </Text>
        </>
      )}

      {message && <Text variant="caption" role="status" tone="secondary">{message}</Text>}
    </section>
  );
}
