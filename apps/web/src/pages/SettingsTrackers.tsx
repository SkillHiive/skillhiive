import { useEffect, useState } from "react";
import { Check, Keyboard, RefreshCw, Trash2 } from "lucide-react";
import { BackLink } from "@/components/ui/BackLink";
import SwipeLayout from "@/components/SwipeLayout";
import { Text } from "@skillhiive/ui";
import { useTokens } from "@/theme";
import { useTrackerConnection } from "@/hooks/useTimeTracker";
import {
  deleteTrackerConnection,
  fetchUserCodingTime,
  saveTrackerConnection,
  setMyCodingStatsVisibility,
  triggerSync,
  type TrackerProvider,
} from "@/lib/timeTracker";
import { supabase } from "@/lib/supabase";
import { useConfirm } from "@/lib/confirm";
import { CueCard } from "@/components/CodingTime/CueCard";
import { fetchMyCueDevices } from "@/lib/cue";

const FONT =
  '"popreg", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

const PROVIDERS: Array<{
  id: TrackerProvider;
  label: string;
  hint: string;
  keyUrl: string;
}> = [
  {
    id: "wakatime",
    label: "Wakatime",
    hint: "wakatime.com/settings/api-key",
    keyUrl: "https://wakatime.com/settings/api-key",
  },
  {
    id: "hackatime",
    label: "Hackatime",
    hint: "hackatime.hackclub.com",
    keyUrl: "https://hackatime.hackclub.com",
  },
];

export default function SettingsTrackers() {
  const confirm = useConfirm();
  const { colors, spacing, radii } = useTokens();
  const { connection, loading, refresh } = useTrackerConnection();

  const [provider, setProvider] = useState<TrackerProvider>("wakatime");
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [statsPublic, setStatsPublic] = useState<boolean | null>(null);
  const [hasCueDevice, setHasCueDevice] = useState(false);
  const [hasStats, setHasStats] = useState(false);
  const [visibilitySaving, setVisibilitySaving] = useState(false);
  const [visibilityError, setVisibilityError] = useState<string | null>(null);
  const [cueReloads, setCueReloads] = useState(0);

  // The profile switch applies to all coding time, whatever its source, so it is read for everyone.
  useEffect(() => {
    let active = true;
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const [stats, devices] = await Promise.all([fetchUserCodingTime(user.id), fetchMyCueDevices()]);
      if (!active) return;
      setStatsPublic(stats?.is_public ?? false);
      setHasStats(stats !== null);
      setHasCueDevice(devices.some((device) => device.revoked_at === null));
    })();
    return () => {
      active = false;
    };
  }, [connection, cueReloads]);

  const hasCodingSource = !!connection || hasCueDevice || hasStats;

  async function handleVisibility(next: boolean) {
    const previous = !!statsPublic;
    setStatsPublic(next);
    setVisibilityError(null);
    setVisibilitySaving(true);
    const ok = await setMyCodingStatsVisibility(next);
    setVisibilitySaving(false);
    if (!ok) {
      setStatsPublic(previous);
      setVisibilityError("Couldn't change that. Try again.");
    }
  }

  async function handleSave() {
    if (!apiKey.trim()) return;
    setSaving(true);
    setMessage(null);
    const result = await saveTrackerConnection(provider, apiKey);
    setSaving(false);
    if (result.ok) {
      setApiKey("");
      setMessage("Connected. Importing your time…");
      await new Promise((r) => setTimeout(r, 500));
      refresh();
      await handleSync(true);
    } else {
      setMessage(`Could not connect: ${result.error ?? "check the key"}`);
    }
  }

  async function handleSync(force = false) {
    setSyncing(true);
    const result = await triggerSync(force);
    setSyncing(false);
    setMessage(
      result.ok ? "Up to date." : `Sync failed: ${result.error ?? "is the API key valid?"}`,
    );
    if (result.ok) {
      await new Promise((r) => setTimeout(r, 500));
      refresh();
    }
  }

  async function handleDisconnect() {
    const ok = await confirm({
      title: `Disconnect ${providerLabel ?? "tracker"}?`,
      description: "We'll stop importing from it. Time already imported stays.",
      confirmLabel: "Disconnect",
    });
    if (!ok) return;
    setSyncing(true);
    const result = await deleteTrackerConnection();
    setSyncing(false);
    if (result.ok) {
      setMessage("Disconnected.");
      await new Promise((r) => setTimeout(r, 300));
      refresh();
    } else {
      setMessage(`Could not disconnect: ${result.error ?? "unknown error"}`);
    }
  }

  const providerLabel = PROVIDERS.find((p) => p.id === connection?.provider)?.label;

  return (
    <SwipeLayout>
      <div
        style={{
          minHeight: "100vh",
          background: colors.bg.muted,
          paddingTop: 80,
          paddingBottom: 120,
          fontFamily: FONT,
        }}
      >
        <div
          style={{
            maxWidth: 560,
            margin: "0 auto",
            padding: `0 ${spacing.base}px`,
            display: "flex",
            flexDirection: "column",
            gap: spacing.base,
          }}
        >
          <BackLink to="/profile" label="Profile" />

          <Text as="h1" variant="display">
            Coding time
          </Text>

          <CueCard
            hasTracker={!!connection}
            onChanged={() => {
              refresh();
              setCueReloads((count) => count + 1);
            }}
          />

          {loading ? (
            <Text variant="bodySm" tone="tertiary">
              Loading…
            </Text>
          ) : connection ? (
            <>
              <Card>
                <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
                  <Keyboard size={18} color={colors.surface.skillhive} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text variant="title" weight={800}>
                      {providerLabel}
                    </Text>
                    <Text
                      variant="caption"
                      tone="tertiary"
                      style={connection.status === "error" ? { color: colors.tint.warning } : undefined}
                    >
                      {syncing
                        ? "Syncing…"
                        : connection.status === "error"
                          ? connection.last_error ?? "Sync error"
                          : connection.last_sync_at
                            ? `Synced ${new Date(connection.last_sync_at).toLocaleString()}`
                            : "Not synced yet"}
                    </Text>
                  </div>
                  <button
                    onClick={() => handleSync(true)}
                    disabled={syncing}
                    style={iconBtn(colors, syncing)}
                    title="Sync now"
                    aria-label="Sync now"
                  >
                    <RefreshCw size={15} style={syncing ? { animation: "spin 1s linear infinite" } : undefined} />
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  </button>
                  <button
                    onClick={handleDisconnect}
                    disabled={syncing}
                    style={iconBtn(colors)}
                    title="Disconnect"
                    aria-label="Disconnect"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </Card>
            </>
          ) : (
            <details
              style={{
                background: colors.surface.primary,
                border: `1px solid ${colors.border.subtle}`,
                borderRadius: radii.lg,
                padding: spacing.base,
              }}
            >
              <summary style={{ cursor: "pointer", fontWeight: 700, fontSize: 14, color: colors.text.primary }}>
                Already use Wakatime or Hackatime? Import it
              </summary>
              <div style={{ display: "flex", flexDirection: "column", gap: spacing.sm, marginTop: spacing.base }}>
                <div role="radiogroup" aria-label="Provider" style={{ display: "flex", gap: spacing.sm }}>
                  {PROVIDERS.map((p) => (
                    <button
                      key={p.id}
                      role="radio"
                      aria-checked={provider === p.id}
                      onClick={() => setProvider(p.id)}
                      style={{
                        flex: 1,
                        padding: "10px 12px",
                        borderRadius: radii.lg,
                        border: `1.5px solid ${
                          provider === p.id ? colors.surface.skillhive : colors.border.subtle
                        }`,
                        background: provider === p.id ? colors.bg.accentDim : "transparent",
                        color: colors.text.primary,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        fontSize: 14,
                        fontWeight: 700,
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <input
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="API key"
                  aria-label="API key"
                  type="password"
                  autoComplete="off"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: radii.md,
                    border: `1px solid ${colors.border.subtle}`,
                    background: colors.bg.muted,
                    color: colors.text.primary,
                    fontSize: 14,
                    fontFamily: "monospace",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                <Text variant="caption" tone="tertiary">
                  Key from{" "}
                  <a
                    href={PROVIDERS.find((p) => p.id === provider)?.keyUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: colors.surface.skillhive }}
                  >
                    {PROVIDERS.find((p) => p.id === provider)?.hint}
                  </a>
                  .
                </Text>
                <button
                  onClick={handleSave}
                  disabled={saving || !apiKey.trim()}
                  style={{
                    alignSelf: "flex-start",
                    padding: "9px 20px",
                    borderRadius: radii.pill,
                    border: "none",
                    background: colors.surface.skillhive,
                    color: "#111",
                    fontSize: 13,
                    fontWeight: 800,
                    fontFamily: "inherit",
                    cursor: saving ? "wait" : "pointer",
                    opacity: !apiKey.trim() ? 0.5 : 1,
                  }}
                >
                  {saving ? "Connecting…" : "Connect"}
                </button>
              </div>
            </details>
          )}

          {hasCodingSource && statsPublic !== null && (
            <Card>
              <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
                <div style={{ flex: 1 }}>
                  <Text id="coding-public-label" variant="bodySm" weight={700} style={{ display: "block" }}>
                    Show coding time on my profile
                  </Text>
                  <Text variant="caption" tone="tertiary">
                    Projects have their own switch.
                  </Text>
                </div>
                <Toggle
                  checked={!!statsPublic}
                  disabled={visibilitySaving}
                  labelledBy="coding-public-label"
                  onChange={(next) => void handleVisibility(next)}
                />
              </div>
              {visibilityError && (
                <Text variant="caption" role="alert" style={{ display: "block", marginTop: spacing.sm, color: colors.tint.danger }}>
                  {visibilityError}
                </Text>
              )}
            </Card>
          )}

          {message && (
            <div role="status" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Check size={14} color={colors.tint.success} />
              <Text variant="bodySm" tone="secondary">
                {message}
              </Text>
            </div>
          )}
        </div>
      </div>
    </SwipeLayout>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  const { colors, spacing, radii } = useTokens();
  return (
    <div
      style={{
        background: colors.surface.primary,
        border: `1px solid ${colors.border.subtle}`,
        borderRadius: radii.lg,
        padding: spacing.base,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function iconBtn(
  colors: ReturnType<typeof useTokens>["colors"],
  syncing?: boolean
): React.CSSProperties {
  return {
    background: "transparent",
    border: `1px solid ${syncing ? colors.surface.skillhive : colors.border.subtle}`,
    borderRadius: 999,
    color: syncing ? colors.surface.skillhive : colors.text.secondary,
    cursor: syncing ? "wait" : "pointer",
    padding: 7,
    display: "inline-flex",
    alignItems: "center",
  };
}

function Toggle({
  checked,
  disabled,
  labelledBy,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  labelledBy?: string;
  onChange: (next: boolean) => void;
}) {
  const { colors } = useTokens();
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={{
        width: 40,
        height: 22,
        borderRadius: 999,
        border: "none",
        background: checked ? colors.tint.success : colors.border.subtle,
        position: "relative",
        cursor: disabled ? "wait" : "pointer",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: checked ? 21 : 3,
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "#fff",
          transition: "left 0.15s ease",
        }}
      />
    </button>
  );
}
