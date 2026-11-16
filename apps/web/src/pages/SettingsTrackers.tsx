import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  Check,
  Keyboard,
  Link2,
  RefreshCw,
  Trash2,
  Unlock,
} from "lucide-react";
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
  fetchMyTrackerProjects,
  fetchProjectMappings,
  type TrackerProvider,
  type ProjectMapping,
} from "@/lib/timeTracker";
import { fetchMyProjects } from "@/lib/todayData";
import { supabase } from "@/lib/supabase";
import { CueCard } from "@/components/CodingTime/CueCard";

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
    hint: "wakatime.com",
    keyUrl: "https://wakatime.com/settings/api-key",
  },
  {
    id: "hackatime",
    label: "Hackatime",
    hint: "Hack Club's hosted tracker",
    keyUrl: "https://hackatime.hackclub.com",
  },
];

export default function SettingsTrackers() {
  const navigate = useNavigate();
  const { colors, spacing, radii } = useTokens();
  const { connection, loading, refresh } = useTrackerConnection();

  const [provider, setProvider] = useState<TrackerProvider>("wakatime");
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [statsPublic, setStatsPublic] = useState<boolean | null>(null);
  const [projectCount, setProjectCount] = useState(0);
  const [mappings, setMappings] = useState<ProjectMapping[]>([]);

  useEffect(() => {
    void (async () => {
      const projects = await fetchMyProjects();
      setProjectCount(projects.length);
    })();
  }, [connection?.last_sync_at]);

  useEffect(() => {
    if (!connection) return;
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const stats = await fetchUserCodingTime(user.id);
      setStatsPublic(stats?.is_public ?? false);
    })();
  }, [connection]);

  useEffect(() => {
    if (!connection) {
      setMappings([]);
      return;
    }
    void (async () => {
      await fetchMyTrackerProjects();
      // Only fetch mappings for projects the user owns
      const projectIds = (await fetchMyProjects()).map(p => p.id);
      const allMappings: ProjectMapping[] = [];
      for (const pid of projectIds) {
        const pm = await fetchProjectMappings(pid);
        allMappings.push(...pm);
      }
      setMappings(allMappings);
    })();
  }, [connection, refresh]);

  async function handleSave() {
    if (!apiKey.trim()) return;
    setSaving(true);
    setMessage(null);
    console.log("[handleSave] Saving connection for provider:", provider);
    const result = await saveTrackerConnection(provider, apiKey);
    console.log("[handleSave] Result:", result);
    setSaving(false);
    if (result.ok) {
      setApiKey("");
      setMessage("Connected. Running first sync…");
      await new Promise((r) => setTimeout(r, 500));
      refresh();
      await handleSync(true);
    } else {
      setMessage(`Could not connect: ${result.error ?? "check the key"}`);
    }
  }

  async function handleSync(force = false) {
    setSyncing(true);
    console.log("[handleSync] Starting sync, force:", force);
    const result = await triggerSync(force);
    console.log("[handleSync] Result:", result);
    setSyncing(false);
    setMessage(
      result.ok
        ? "Sync complete — your coding time is up to date."
        : `Sync failed: ${result.error ?? "is the API key valid?"}`,
    );
    if (result.ok) {
      await new Promise((r) => setTimeout(r, 500));
      refresh();
    }
  }

  async function handleDisconnect() {
    setSyncing(true);
    console.log("[handleDisconnect] Starting disconnect");
    const result = await deleteTrackerConnection();
    console.log("[handleDisconnect] Result:", result);
    setSyncing(false);
    if (result.ok) {
      setMessage("Disconnected.");
      await new Promise((r) => setTimeout(r, 300));
      refresh();
    } else {
      setMessage(`Could not disconnect: ${result.error ?? "unknown error"}`);
    }
  }

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
            maxWidth: 640,
            margin: "0 auto",
            padding: `0 ${spacing.base}px`,
            display: "flex",
            flexDirection: "column",
            gap: spacing.lg,
          }}
        >
          <button
            onClick={() => navigate(-1)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: colors.text.secondary,
              fontFamily: "inherit",
              fontSize: 14,
              fontWeight: 600,
              padding: 0,
              width: "fit-content",
            }}
          >
            <ArrowLeft size={18} />
            Back
          </button>

          <div>
            <Text variant="headline" weight={900} style={{ letterSpacing: -0.5 }}>
              Time tracker
            </Text>
            <Text variant="bodySm" tone="secondary">
              Link Cue, or connect Wakatime or Hackatime, to show your coding
              time on SkillHive.
            </Text>
          </div>

          <CueCard hasTracker={!!connection} onChanged={refresh} />

          {loading ? (
            <Text variant="bodySm" tone="tertiary">
              Loading…
            </Text>
          ) : connection ? (
            <>
              {/* Connected card */}
              <Card>
                <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
                  <Keyboard size={18} color={colors.surface.skillhive} />
                  <div style={{ flex: 1 }}>
                    <Text variant="title" weight={800}>
                      {PROVIDERS.find((p) => p.id === connection.provider)?.label}
                    </Text>
                    <Text variant="caption" tone={connection.status === "error" ? "tint" : "tertiary"}
                      style={connection.status === "error" ? { color: colors.tint.warning } : undefined}>
                      {connection.status === "error"
                        ? connection.last_error ?? "sync error"
                        : connection.last_sync_at
                          ? `last synced ${new Date(connection.last_sync_at).toLocaleString()}`
                          : "never synced"}
                    </Text>
                  </div>
                  <button
                    onClick={() => handleSync(true)}
                    disabled={syncing}
                    style={iconBtn(colors, syncing)}
                    title="Sync now"
                  >
                    {syncing ? (
                      <RefreshCw size={15} style={{ animation: "spin 1s linear infinite" }} />
                    ) : (
                      <RefreshCw size={15} />
                    )}
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  </button>
                  <button onClick={handleDisconnect} disabled={syncing} style={iconBtn(colors)} title="Disconnect">
                    <Trash2 size={15} />
                  </button>
                </div>
                {syncing && (
                  <div style={{ marginTop: spacing.xs, display: "flex", alignItems: "center", gap: spacing.sm }}>
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        border: `2px solid ${colors.border.subtle}`,
                        borderTopColor: colors.surface.skillhive,
                        borderRadius: "50%",
                        animation: "spin 0.8s linear infinite",
                      }}
                    />
                    <Text variant="bodySm" tone="secondary">
                      Syncing with {connection.provider === "wakatime" ? "Wakatime" : "Hackatime"}…
                    </Text>
                  </div>
                )}
              </Card>

              {mappings.length === 0 && connection && (
                <Card style={{ border: `1px solid ${colors.surface.skillhive}55`, background: colors.bg.accentDim }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: spacing.sm }}>
                    <Link2 size={18} color={colors.surface.skillhive} style={{ marginTop: 2, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Text variant="bodySm" weight={700} style={{ color: colors.surface.skillhive }}>
                        No projects linked yet
                      </Text>
                      <Text variant="caption" tone="secondary" style={{ display: "block", marginTop: 2 }}>
                        Your tracker has coding data but it's not linked to any SkillHive project.
                        Open a project on <Text tone="skillhive">/home</Text> or the <Text tone="skillhive">Projects</Text> page
                        and click <Text tone="skillhive" weight={700}>"Link projects"</Text> to connect them.
                      </Text>
                      <Text variant="caption" tone="skillhive" weight={700} style={{ display: "block", marginTop: 4 }}>
                        ⚡ Time is auto-fetched from Hackatime/Wakatime — no manual entry ever
                      </Text>
                    </div>
                    <button
                      onClick={() => navigate("/home")}
                      style={{
                        padding: "8px 14px",
                        borderRadius: radii.pill,
                        border: `1px solid ${colors.surface.skillhive}`,
                        background: colors.bg.accentDim,
                        color: colors.text.skillhive,
                        fontSize: 13,
                        fontWeight: 800,
                        fontFamily: "inherit",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                    >
                      Go to /home
                    </button>
                  </div>
                </Card>
              )}

              {/* Profile visibility */}
              <Card>
                <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
                  <Unlock
                    size={16}
                    color={statsPublic ? colors.tint.success : colors.text.tertiary}
                  />
                  <div style={{ flex: 1 }}>
                    <Text variant="bodySm" weight={700} style={{ display: "block" }}>
                      Show coding time on my public profile
                    </Text>
                    <Text variant="caption" tone="tertiary">
                      Off by default. Per-project visibility is managed on each project page.
                    </Text>
                  </div>
                  <Toggle
                    checked={!!statsPublic}
                    onChange={async (next) => {
                      setStatsPublic(next);
                      await setMyCodingStatsVisibility(next);
                    }}
                  />
                </div>
              </Card>

              {/* Mappings overview */}
              <Card>
                <Text variant="label" tone="secondary" style={{ display: "block", marginBottom: spacing.sm }}>
                  Linked projects
                </Text>
                <Text variant="bodySm" tone="tertiary">
                  Coding time is linked per project. Open one of your{" "}
                  {projectCount} project{projectCount === 1 ? "" : "s"} on /home
                  and hit “Link projects” to connect its tracked time.
                </Text>
              </Card>
            </>
          ) : (
            <>
              {/* Connect flow */}
              <Card>
                <Text variant="label" tone="secondary" style={{ display: "block", marginBottom: spacing.sm }}>
                  Choose provider
                </Text>
                <div style={{ display: "flex", gap: spacing.sm }}>
                  {PROVIDERS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setProvider(p.id)}
                      style={{
                        flex: 1,
                        padding: spacing.base,
                        borderRadius: radii.lg,
                        border: `1.5px solid ${
                          provider === p.id ? colors.surface.skillhive : colors.border.subtle
                        }`,
                        background: provider === p.id ? colors.bg.accentDim : "transparent",
                        cursor: "pointer",
                        textAlign: "left",
                        fontFamily: "inherit",
                      }}
                    >
                      <Text variant="title" weight={800} style={{ display: "block" }}>
                        {p.label}
                      </Text>
                      <Text variant="caption" tone="tertiary">
                        {p.hint}
                      </Text>
                    </button>
                  ))}
                </div>
              </Card>

              <Card>
                <Text variant="label" tone="secondary" style={{ display: "block", marginBottom: spacing.sm }}>
                  API key
                </Text>
                <input
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Paste your secret API key"
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
                <Text variant="caption" tone="tertiary" style={{ display: "block", marginTop: spacing.sm }}>
                  Find it at{" "}
                  <a
                    href={PROVIDERS.find((p) => p.id === provider)?.keyUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: colors.surface.skillhive }}
                  >
                    {provider === "wakatime"
                      ? "wakatime.com/settings/api-key"
                      : "hackatime.hackclub.com"}
                  </a>
                  . We only read project names and totals — never keystrokes or
                  file contents.
                </Text>
                <button
                  onClick={handleSave}
                  disabled={saving || !apiKey.trim()}
                  style={{
                    marginTop: spacing.base,
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
              </Card>
            </>
          )}

          {message && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
  onChange,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  const { colors } = useTokens();
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 40,
        height: 22,
        borderRadius: 999,
        border: "none",
        background: checked ? colors.tint.success : colors.border.subtle,
        position: "relative",
        cursor: "pointer",
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
