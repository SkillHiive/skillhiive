import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { ChevronRight, FolderGit2, Lock, Plus, X } from "lucide-react";
import { Text, Button } from "@skillhiive/ui";
import { useTokens } from "@/theme";
import { useProfile } from "@/hooks/useProfile";
import { BackLink } from "@/components/ui/BackLink";
import { EmptyState, SkeletonRows } from "@/components/ui/States";
import { CueProjectsPanel } from "@/components/CodingTime/CueProjectsPanel";
import { useToast } from "@/lib/toast";
import { useConfirm } from "@/lib/confirm";
import { formatDuration } from "@/lib/timeTracker";
import { fetchMyCueProjects, type CueProject } from "@/lib/cue";
import { allTimeByProject, projectSeconds } from "@/lib/projectTime";
import { deleteProject, ensureProject, fetchUserProjects, type ProjectWithStats } from "@/lib/todayData";

const FONT = '"popreg", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

/** Your SkillHiive projects, the Cue projects that can feed them, and a field to add one. */
export default function Projects() {
  const { colors, spacing, radii } = useTokens();
  const { profile } = useProfile();
  const toast = useToast();
  const confirm = useConfirm();

  const [projects, setProjects] = useState<ProjectWithStats[] | null>(null);
  const [cue, setCue] = useState<CueProject[]>([]);
  const [reloads, setReloads] = useState(0);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const userId = profile?.id;
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void Promise.all([fetchUserProjects(userId), fetchMyCueProjects()]).then(([list, cueList]) => {
      if (cancelled) return;
      setProjects(list);
      setCue(cueList);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, reloads]);

  const reload = () => setReloads((n) => n + 1);
  const time = useMemo(() => allTimeByProject(projects ?? [], cue), [projects, cue]);

  async function add(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    if (projects?.some((p) => p.name.trim().toLowerCase() === trimmed.toLowerCase())) {
      toast(`${trimmed} already exists`);
      return;
    }
    setBusy(true);
    const id = await ensureProject(trimmed);
    setBusy(false);
    if (!id) {
      toast("Couldn't add. Try again.", { tone: "error" });
      return;
    }
    setName("");
    toast(`Added ${trimmed}`);
    reload();
  }

  async function remove(project: ProjectWithStats) {
    const ok = await confirm({
      title: `Delete ${project.name}?`,
      description: "Its sessions stay, untagged.",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    setProjects((list) => list?.filter((p) => p.id !== project.id) ?? list);
    if (await deleteProject(project.id)) {
      toast(`Deleted ${project.name}`);
    } else {
      toast("Couldn't delete. Try again.", { tone: "error" });
    }
    reload();
  }

  return (
    <div style={{ minHeight: "100vh", background: colors.bg.muted, paddingTop: 88, paddingBottom: 160, fontFamily: FONT }}>
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
        <BackLink to="/home" label="Today" className="w-fit" />
        <Text as="h1" variant="display">
          Projects
        </Text>

        <form
          onSubmit={(e) => void add(e)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: spacing.sm,
            background: colors.surface.primary,
            border: `1px dashed ${colors.border.strong}`,
            borderRadius: radii.lg,
            padding: `${spacing.xs}px ${spacing.xs}px ${spacing.xs}px ${spacing.base}px`,
          }}
        >
          <Plus size={16} color={colors.text.tertiary} aria-hidden="true" />
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New project"
            aria-label="New project name"
            maxLength={80}
            style={{
              flex: 1,
              minWidth: 0,
              border: "none",
              outline: "none",
              background: "transparent",
              color: colors.text.primary,
              fontSize: 15,
              fontWeight: 600,
              fontFamily: "inherit",
              padding: "8px 0",
            }}
          />
          <Button type="submit" label="Add" size="sm" loading={busy} disabled={!name.trim()} />
        </form>

        {projects === null ? (
          <SkeletonRows rows={3} height={52} />
        ) : projects.length === 0 ? (
          <EmptyState
            icon={<FolderGit2 size={22} />}
            title="No projects yet"
            action={<Button label="New project" size="sm" variant="secondary" onClick={() => inputRef.current?.focus()} />}
          />
        ) : (
          <ul aria-label="Your projects" style={{ display: "flex", flexDirection: "column", gap: spacing.sm, margin: 0, padding: 0, listStyle: "none" }}>
            {projects.map((p, i) => {
              const seconds = projectSeconds(time.get(p.id));
              return (
                <li
                  key={p.id}
                  className="ui-rise"
                  style={{ animationDelay: `${Math.min(i, 5) * 30}ms`, display: "flex", alignItems: "center", gap: spacing.xs }}
                >
                  <Link
                    to={`/projects/${p.id}`}
                    className="ui-lift"
                    style={{
                      flex: 1,
                      minWidth: 0,
                      display: "flex",
                      alignItems: "center",
                      gap: spacing.sm,
                      background: colors.surface.primary,
                      border: `1px solid ${colors.border.subtle}`,
                      borderRadius: radii.lg,
                      padding: `${spacing.sm + 2}px ${spacing.base}px`,
                      color: colors.text.primary,
                      textDecoration: "none",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: p.color || colors.surface.skillhive }}
                    />
                    <Text variant="bodySm" weight={700} style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.name}
                    </Text>
                    {p.is_public === false && (
                      <span role="img" aria-label="Only you" title="Only you" style={{ display: "inline-flex", color: colors.text.tertiary }}>
                        <Lock size={13} />
                      </span>
                    )}
                    {seconds > 0 && (
                      <Text variant="caption" tone="tertiary" style={{ fontVariantNumeric: "tabular-nums" }}>
                        {formatDuration(seconds)}
                      </Text>
                    )}
                    <ChevronRight size={16} color={colors.text.tertiary} aria-hidden="true" />
                  </Link>
                  <button
                    type="button"
                    className="ui-press"
                    aria-label={`Delete ${p.name}`}
                    title="Delete"
                    onClick={() => void remove(p)}
                    style={{
                      width: 32,
                      height: 32,
                      flexShrink: 0,
                      display: "grid",
                      placeItems: "center",
                      border: "none",
                      borderRadius: 999,
                      background: "transparent",
                      color: colors.text.tertiary,
                      cursor: "pointer",
                    }}
                  >
                    <X size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {projects !== null && (
          <CueProjectsPanel
            projects={projects.map((p) => ({ id: p.id, name: p.name, is_public: p.is_public }))}
            onChanged={reload}
          />
        )}
      </div>
    </div>
  );
}
