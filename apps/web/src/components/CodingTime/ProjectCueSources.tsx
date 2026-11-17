import { useEffect, useState } from "react";
import { Globe, Lock } from "lucide-react";
import { Text } from "@skillhiive/ui";
import { useTokens } from "@/theme";
import { formatDuration } from "@/lib/timeTracker";
import {
  fetchMyCodingVisibility,
  fetchMyCueDevices,
  fetchMyCueProjects,
  fetchProjectIsPublic,
  groupCueProjects,
  mapCueProject,
  setProjectVisibility,
  type CueProjectGroup,
  type CueResult,
} from "@/lib/cue";

interface Props {
  projectId: string;
  projectName: string;
  /** Called after visibility or a link changed, so the page can reload its coding time. */
  onChanged?: () => void;
}

/** Owner-only: who can see this project, and which Cue projects feed its coding time. */
export function ProjectCueSources({ projectId, projectName, onChanged }: Props) {
  const { colors, spacing, radii } = useTokens();
  const [loading, setLoading] = useState(true);
  const [isPublic, setIsPublic] = useState(false);
  const [groups, setGroups] = useState<CueProjectGroup[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [reloads, setReloads] = useState(0);

  useEffect(() => {
    let active = true;
    void Promise.all([
      fetchProjectIsPublic(projectId),
      fetchMyCodingVisibility(),
      fetchMyCueDevices(),
      fetchMyCueProjects(),
    ]).then(([projectPublic, coding, devices, projects]) => {
      if (!active) return;
      setIsPublic(projectPublic && coding.get(projectId) === true);
      setGroups(groupCueProjects(projects, devices));
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [projectId, reloads]);

  if (loading) return null;

  const linked = groups.filter((group) => group.today_project_id === projectId);
  const unlinked = groups.filter((group) => group.today_project_id === null);

  async function run(pending: Promise<CueResult>, done: string) {
    setBusy(true);
    const result = await pending;
    setBusy(false);
    setConfirming(false);
    setMessage(result.ok ? done : result.error);
    if (result.ok) {
      setReloads((count) => count + 1);
      onChanged?.();
    }
  }

  const pill: React.CSSProperties = {
    padding: "5px 10px",
    borderRadius: radii.pill,
    border: `1px solid ${colors.border.subtle}`,
    background: "transparent",
    color: colors.text.secondary,
    fontFamily: "inherit",
    fontSize: 12,
    fontWeight: 700,
    cursor: busy ? "wait" : "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
  };

  return (
    <section
      aria-label="Visibility and sources"
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
      <div style={{ display: "flex", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: isPublic ? colors.tint.success : colors.text.tertiary }}>
          {isPublic ? <Globe size={14} /> : <Lock size={14} />}
          <Text variant="bodySm" weight={700} style={{ color: "inherit" }}>
            {isPublic ? "Public" : "Only you"}
          </Text>
        </span>
        <Text variant="caption" tone="tertiary" style={{ flex: 1, minWidth: 160 }}>
          {isPublic
            ? "Everyone can see this project, its coding time and languages."
            : "Nobody else can see this project or its coding time."}
        </Text>
        {isPublic ? (
          <button style={pill} disabled={busy} onClick={() => void run(setProjectVisibility(projectId, false), "This project is private again.")}>
            Make private
          </button>
        ) : (
          <button style={pill} disabled={busy} onClick={() => setConfirming(true)}>
            Make public…
          </button>
        )}
      </div>

      {confirming && (
        <div role="group" aria-label={`Make ${projectName} public`} style={{ display: "flex", flexDirection: "column", gap: 6, padding: spacing.sm, borderRadius: radii.md, background: colors.bg.muted }}>
          <Text variant="caption" tone="secondary">
            Everyone will see <b>{projectName}</b>, its coding time and its languages. Repository addresses and the
            folders you work in stay private.
          </Text>
          <div style={{ display: "flex", gap: spacing.sm }}>
            <button
              style={{ ...pill, color: colors.text.skillhive, borderColor: colors.surface.skillhive }}
              disabled={busy}
              onClick={() => void run(setProjectVisibility(projectId, true), "This project is public.")}
            >
              Make public
            </button>
            <button style={pill} onClick={() => setConfirming(false)}>Cancel</button>
          </div>
        </div>
      )}

      {(linked.length > 0 || unlinked.length > 0) && (
        <>
          <Text variant="label" tone="secondary">From Cue</Text>
          {linked.length === 0 && (
            <Text variant="caption" tone="tertiary">No Cue project feeds this one yet.</Text>
          )}
          {linked.map((group) => (
            <div key={group.id} style={{ display: "flex", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 140 }}>
                <Text variant="bodySm" weight={700}>{group.name}</Text>
                <Text variant="caption" tone="tertiary" style={{ display: "block" }}>
                  {[formatDuration(group.total_seconds), group.device_names.join(", ")].filter(Boolean).join(" · ")}
                </Text>
              </div>
              <button
                style={pill}
                disabled={busy}
                aria-label={`Unlink ${group.name}`}
                onClick={() => void run(mapCueProject(group.members[0]!.device_id, group.members[0]!.project_key, null), `${group.name} unlinked.`)}
              >
                Unlink
              </button>
            </div>
          ))}
          {unlinked.length > 0 && (
            <label>
              <span style={{ position: "absolute", left: -9999 }}>Add a Cue project to {projectName}</span>
              <select
                value=""
                disabled={busy}
                style={{ ...pill, background: colors.bg.canvas, color: colors.text.primary }}
                onChange={(event) => {
                  const group = unlinked.find((candidate) => candidate.id === event.target.value);
                  if (group) {
                    void run(mapCueProject(group.members[0]!.device_id, group.members[0]!.project_key, projectId), `${group.name} linked.`);
                  }
                }}
              >
                <option value="">Add from Cue…</option>
                {unlinked.map((group) => (
                  <option key={group.id} value={group.id}>{group.name}</option>
                ))}
              </select>
            </label>
          )}
        </>
      )}

      {message && <Text variant="caption" role="status" tone="secondary">{message}</Text>}
    </section>
  );
}
