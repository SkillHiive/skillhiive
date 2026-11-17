import { useEffect, useState } from "react";
import { Globe, Lock } from "lucide-react";
import { Text } from "@skillhiive/ui";
import { useTokens } from "@/theme";
import { formatDuration } from "@/lib/timeTracker";
import {
  createProjectFromCue,
  fetchMyCodingVisibility,
  fetchMyCueDevices,
  fetchMyCueProjects,
  fetchPrivateWorkSeconds,
  groupCueProjects,
  isPublicProject,
  mapCueProject,
  setProjectVisibility,
  suggestedProject,
  type CueDevice,
  type CueProjectGroup,
  type CueResult,
  type PanelProject,
} from "@/lib/cue";

interface Props {
  /** The user's SkillHiive projects, as the Projects card lists them. */
  projects: PanelProject[];
  /** Called after a project was created, linked or changed visibility. */
  onChanged?: () => void;
}

function localDate(daysAgo: number): string {
  const day = new Date(Date.now() - daysAgo * 86_400_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
}

/**
 * Projects Cue reported, shown only to their owner. Each one is linked to a
 * SkillHiive project, made into one, or left alone; making one public is a
 * separate, confirmed step.
 */
export function CueProjectsPanel({ projects, onChanged }: Props) {
  const { colors, spacing, radii } = useTokens();
  const [loading, setLoading] = useState(true);
  const [devices, setDevices] = useState<CueDevice[]>([]);
  const [groups, setGroups] = useState<CueProjectGroup[]>([]);
  const [codingPublic, setCodingPublic] = useState<Map<string, boolean>>(new Map());
  const [privateSeconds, setPrivateSeconds] = useState(0);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [reloads, setReloads] = useState(0);

  useEffect(() => {
    let active = true;
    void Promise.all([
      fetchMyCueDevices(),
      fetchMyCueProjects(),
      fetchMyCodingVisibility(),
      fetchPrivateWorkSeconds(localDate(6)),
    ]).then(([nextDevices, nextProjects, nextCoding, nextPrivate]) => {
      if (!active) return;
      setDevices(nextDevices);
      setGroups(groupCueProjects(nextProjects, nextDevices));
      setCodingPublic(nextCoding);
      setPrivateSeconds(nextPrivate);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [reloads]);

  if (loading || (devices.length === 0 && groups.length === 0)) return null;

  const byId = new Map(projects.map((project) => [project.id, project]));

  async function run(pending: Promise<CueResult>, done: string) {
    setBusy(true);
    const result = await pending;
    setBusy(false);
    setConfirming(null);
    setMessage(result.ok ? done : result.error);
    if (result.ok) {
      setReloads((count) => count + 1);
      onChanged?.();
    }
  }

  const first = (group: CueProjectGroup) => group.members[0]!;

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
  const select: React.CSSProperties = {
    ...pill,
    padding: "5px 8px",
    background: colors.bg.canvas,
    color: colors.text.primary,
  };

  return (
    <section aria-label="From Cue" style={{ display: "flex", flexDirection: "column", gap: spacing.sm, paddingTop: spacing.sm }}>
      <div>
        <Text variant="label" tone="secondary">From Cue</Text>
        <Text variant="caption" tone="tertiary" style={{ display: "block" }}>
          Only you can see these. Link one to a project, or make it public when you want others to see it.
        </Text>
      </div>

      {groups.length === 0 && (
        <Text variant="bodySm" tone="tertiary">
          Nothing yet. Projects appear here after your first <code>cue sync</code>.
        </Text>
      )}

      {groups.map((group) => {
        const linked = group.today_project_id ? byId.get(group.today_project_id) : undefined;
        const suggestion = linked ? null : suggestedProject(group, projects);
        const isPublic = isPublicProject(linked, codingPublic);
        const where = [formatDuration(group.total_seconds), group.device_names.join(", ")].filter(Boolean).join(" · ");
        return (
          <div
            key={group.id}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              padding: `${spacing.xs}px 0`,
              borderBottom: `1px solid ${colors.border.subtle}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 140 }}>
                <Text variant="bodySm" weight={700}>{group.name}</Text>
                <Text variant="caption" tone="tertiary" style={{ display: "block" }}>
                  {linked ? `in ${linked.name} · ` : ""}{where}
                </Text>
              </div>

              {linked ? (
                <>
                  <span
                    style={{ ...pill, cursor: "default", border: "none", color: isPublic ? colors.tint.success : colors.text.tertiary }}
                  >
                    {isPublic ? <Globe size={13} /> : <Lock size={13} />}
                    {isPublic ? "Public" : "Only you"}
                  </span>
                  {isPublic ? (
                    <button
                      style={pill}
                      disabled={busy}
                      onClick={() => void run(setProjectVisibility(linked.id, false), `${linked.name} is private again.`)}
                    >
                      Make private
                    </button>
                  ) : (
                    <button style={pill} disabled={busy} onClick={() => setConfirming(group.id)}>
                      Make public…
                    </button>
                  )}
                  <button
                    style={pill}
                    disabled={busy}
                    aria-label={`Unlink ${group.name}`}
                    onClick={() => void run(mapCueProject(first(group).device_id, first(group).project_key, null), `${group.name} unlinked.`)}
                  >
                    Unlink
                  </button>
                </>
              ) : (
                <>
                  {suggestion && (
                    <button
                      style={{ ...pill, color: colors.text.skillhive, borderColor: colors.surface.skillhive }}
                      disabled={busy}
                      onClick={() =>
                        void run(
                          mapCueProject(first(group).device_id, first(group).project_key, suggestion.id),
                          `${group.name} linked to ${suggestion.name}.`,
                        )
                      }
                    >
                      Link to {suggestion.name}
                    </button>
                  )}
                  {!suggestion && (
                    <button
                      style={pill}
                      disabled={busy}
                      onClick={() =>
                        void run(
                          createProjectFromCue(first(group).device_id, first(group).project_key).then((result) =>
                            result.ok ? { ok: true as const } : result,
                          ),
                          `${group.name} is now a project. Only you can see it.`,
                        )
                      }
                    >
                      Create project
                    </button>
                  )}
                  {projects.length > 0 && (
                    <label>
                      <span style={{ position: "absolute", left: -9999 }}>Add {group.name} to a project</span>
                      <select
                        style={select}
                        value=""
                        disabled={busy}
                        onChange={(event) => {
                          const target = byId.get(event.target.value);
                          if (target) {
                            void run(
                              mapCueProject(first(group).device_id, first(group).project_key, target.id),
                              `${group.name} linked to ${target.name}.`,
                            );
                          }
                        }}
                      >
                        <option value="">Add to…</option>
                        {projects.map((project) => (
                          <option key={project.id} value={project.id}>{project.name}</option>
                        ))}
                      </select>
                    </label>
                  )}
                </>
              )}
            </div>

            {linked && confirming === group.id && (
              <div
                role="group"
                aria-label={`Make ${linked.name} public`}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  padding: spacing.sm,
                  borderRadius: radii.md,
                  background: colors.bg.muted,
                }}
              >
                <Text variant="caption" tone="secondary">
                  Everyone will see <b>{linked.name}</b>, its coding time and its languages. Your repository address
                  and the folders you work in stay private.
                </Text>
                <div style={{ display: "flex", gap: spacing.sm }}>
                  <button
                    style={{ ...pill, color: colors.text.skillhive, borderColor: colors.surface.skillhive }}
                    disabled={busy}
                    onClick={() => void run(setProjectVisibility(linked.id, true), `${linked.name} is public.`)}
                  >
                    Make public
                  </button>
                  <button style={pill} onClick={() => setConfirming(null)}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {privateSeconds > 0 && (
        <Text variant="caption" tone="tertiary">
          Plus {formatDuration(privateSeconds)} this week in projects you keep on your computer. Their names never
          leave it. Run <code>cue projects</code> there to see them, or <code>cue share &lt;project&gt;</code> to bring
          one here.
        </Text>
      )}

      {message && <Text variant="caption" role="status" tone="secondary">{message}</Text>}
    </section>
  );
}
