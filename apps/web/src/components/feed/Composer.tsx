import { useEffect, useRef, useState } from "react";
import { Folder, ImagePlus, Plus, X } from "lucide-react";
import { Avatar } from "@skillhiive/ui";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/lib/toast";
import { useConfirm } from "@/lib/confirm";
import { CAPTION_MAX, createPost } from "@/lib/posts";
import { fetchUserProjects } from "@/lib/todayData";
import { errorMessage } from "@/lib/errors";
import type { PostModel } from "./PostCards";

/** Matches --dur-hover, the exit length in the motion vocabulary. */
const CLOSE_MS = 140;

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/**
 * One field: what you shipped. A picture and a project are optional. Posts are written in
 * the shapes the feed has always used (lib/posts.ts newPostRows).
 */
export function Composer({
  onPosted,
  draft = null,
}: {
  onPosted: (post: PostModel) => void;
  /** Text handed over from elsewhere (leaving a room): the composer opens with it, you post it. */
  draft?: string | null;
}) {
  const { profile } = useProfile();
  const toast = useToast();
  const confirm = useConfirm();
  const fileRef = useRef<HTMLInputElement>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(draft !== null);
  const [closing, setClosing] = useState(false);
  const [caption, setCaption] = useState(draft ?? "");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [projects, setProjects] = useState<string[] | null>(null);
  const [project, setProject] = useState("");
  const [posting, setPosting] = useState(false);

  // Your own projects that others can already see; a private one's name never goes in a post.
  useEffect(() => {
    if (!open || projects !== null || !profile?.id) return;
    let cancelled = false;
    void fetchUserProjects(profile.id).then((list) => {
      if (cancelled) return;
      setProjects(list.filter((p) => p.is_public !== false).map((p) => p.name).filter(Boolean));
    });
    return () => {
      cancelled = true;
    };
  }, [open, projects, profile?.id]);

  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  function clear() {
    setCaption("");
    setImage(null);
    setPreview(null);
    setProject("");
  }

  /** Fades and sinks out (the reverse of ui-rise), then goes back to the one-line button. */
  function close() {
    const done = () => {
      setOpen(false);
      setClosing(false);
      clear();
    };
    const el = panelRef.current;
    if (!el || typeof el.animate !== "function") return done();
    setClosing(true);
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const exit = el.animate(
      still
        ? [{ opacity: 1 }, { opacity: 0 }]
        : [
            { opacity: 1, transform: "none" },
            { opacity: 0, transform: "translateY(8px)" },
          ],
      { duration: CLOSE_MS, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)", fill: "forwards" },
    );
    exit.onfinish = done;
    exit.oncancel = done;
  }

  async function cancel() {
    if (posting) return;
    if (caption.trim() || image) {
      const ok = await confirm({ title: "Discard draft?", confirmLabel: "Discard" });
      if (!ok) return;
    }
    close();
  }

  function pickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast("That isn't an image.", { tone: "error" });
      return;
    }
    setImage(file);
    setPreview(URL.createObjectURL(file));
  }

  const canPost = caption.trim().length > 0 && !posting;

  async function submit() {
    if (!canPost) return;
    if (!profile?.id) {
      toast("You're signed out. Sign in again to post.", { tone: "error" });
      return;
    }
    setPosting(true);
    try {
      const post = await createPost({ userId: profile.id, caption, projectName: project || null, image });
      onPosted(post);
      toast("Posted");
      close();
    } catch (e) {
      const detail = errorMessage(e);
      toast(detail ? `Couldn't post: ${detail}` : "Couldn't post. Try again.", { tone: "error" });
    } finally {
      setPosting(false);
    }
  }

  const name = profile?.username ?? profile?.displayname ?? "Me";

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ui-lift mb-4 flex w-full items-center gap-3 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-primary)] px-4 py-3 text-left"
      >
        <Avatar name={name} source={profile?.avatar ?? null} size={32} />
        <span className="flex-1 text-[15px] text-[var(--color-text-tertiary)]">What did you ship?</span>
        <span
          aria-hidden="true"
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#fffd01] text-black"
        >
          <Plus size={16} strokeWidth={2.5} />
        </span>
      </button>
    );
  }

  return (
    <div
      ref={panelRef}
      className="ui-rise mb-4 flex flex-col gap-3 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-primary)] p-4 transition-colors focus-within:border-[var(--color-border-strong)]"
      style={{ pointerEvents: closing ? "none" : undefined }}
    >
      <div className="flex items-start gap-3">
        <Avatar name={name} source={profile?.avatar ?? null} size={32} />
        <textarea
          autoFocus
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void submit();
            } else if (e.key === "Escape") {
              e.preventDefault();
              void cancel();
            }
          }}
          placeholder="What did you ship?"
          aria-label="What did you ship?"
          maxLength={CAPTION_MAX}
          rows={3}
          disabled={posting}
          className="min-w-0 flex-1 resize-none bg-transparent pt-1 text-[17px] leading-6 text-[var(--color-text-primary)] !outline-none placeholder:text-[var(--color-text-tertiary)]"
        />
      </div>

      {preview && (
        <div className="relative overflow-hidden rounded-xl">
          <img src={preview} alt="" className="block aspect-[16/10] w-full max-w-full object-cover" />
          <button
            type="button"
            onClick={() => {
              setImage(null);
              setPreview(null);
            }}
            aria-label="Remove image"
            className="ui-press absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-black/60 text-white"
          >
            <X size={14} strokeWidth={2.5} />
          </button>
        </div>
      )}

      <div className="flex min-w-0 items-center gap-1.5">
        <input ref={fileRef} type="file" accept="image/*" onChange={pickImage} className="hidden" />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={posting}
          aria-label={image ? "Change image" : "Add image"}
          title="Image"
          className="ui-press flex size-9 shrink-0 items-center justify-center rounded-full text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]"
        >
          <ImagePlus size={18} />
        </button>

        {projects && projects.length > 0 && (
          <label
            className={`ui-press relative inline-flex h-9 min-w-0 max-w-[55%] items-center gap-1.5 rounded-full border px-3 text-xs font-semibold ${
              project
                ? "border-[var(--color-border-strong)] text-[var(--color-text-primary)]"
                : "border-[var(--color-border-subtle)] text-[var(--color-text-secondary)]"
            }`}
            title="Project"
          >
            <Folder size={14} aria-hidden="true" className="shrink-0" />
            <span className="truncate">{project || "Project"}</span>
            {/* The real control, invisible over the chip, so phones get their native picker. */}
            <select
              value={project}
              onChange={(e) => setProject(e.target.value)}
              disabled={posting}
              aria-label="Project"
              className="absolute inset-0 cursor-pointer opacity-0"
            >
              <option value="">No project</option>
              {projects.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="flex-1" />

        {caption.length > CAPTION_MAX - 100 && (
          <span className="shrink-0 text-xs tabular-nums text-[var(--color-tint-warning)]" aria-live="polite">
            {CAPTION_MAX - caption.length}
          </span>
        )}

        <button
          type="button"
          onClick={() => void cancel()}
          disabled={posting}
          aria-label="Cancel"
          title="Cancel"
          className="ui-press flex size-9 shrink-0 items-center justify-center rounded-full text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-secondary)]"
        >
          <X size={18} />
        </button>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={!canPost}
          title={`${isMac ? "⌘" : "Ctrl"}+Enter`}
          className="ui-press inline-flex h-9 shrink-0 items-center rounded-full bg-[#fffd01] px-4 text-sm font-bold text-black disabled:cursor-not-allowed disabled:opacity-40"
        >
          {posting ? "Posting…" : "Post"}
        </button>
      </div>
    </div>
  );
}
