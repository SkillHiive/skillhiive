import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { FileQuestion, Folder, ImageOff, Ellipsis, Pencil, Trash2, X } from "lucide-react";
import { Avatar } from "@skillhiive/ui";
import { BackLink } from "@/components/ui/BackLink";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/States";
import ActionRow from "@/components/ActionRow";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useConfirm } from "@/lib/confirm";
import { useToast } from "@/lib/toast";
import { CAPTION_MAX } from "@/lib/posts";
import { authorHref, authorName, offerLine, shortDate, type PostDetail } from "@/lib/postDetail";
import { CommentThread } from "./CommentThread";
import { usePostDetail } from "./usePostDetail";

export type PostViewVariant = "page" | "sheet";

/** Long words and links wrap instead of pushing the column wider than a phone. */
const WRAP = { whiteSpace: "pre-wrap", overflowWrap: "anywhere", wordBreak: "break-word" } as const;

/** Back on the page, X in the sheet; the owner's ⋯ on the right of both. */
function TopRow({
  variant,
  onClose,
  menu,
}: {
  variant: PostViewVariant;
  onClose?: () => void;
  menu?: ReactNode;
}) {
  return (
    <div className="mb-3 flex h-10 items-center gap-1">
      {variant === "page" && <BackLink to="/feed" label="Feed" />}
      <div className="flex-1" />
      {menu}
      {variant === "sheet" && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          data-autofocus
          className="ui-press grid size-9 place-items-center rounded-full text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
        >
          <X size={18} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

const menuItemClass =
  "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm data-[focus]:bg-[var(--color-surface-secondary)]";

function OwnerMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <Menu>
      <MenuButton
        aria-label="More"
        className="ui-press grid size-9 place-items-center rounded-full text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)] data-[open]:bg-[var(--color-surface-secondary)]"
      >
        <Ellipsis size={18} aria-hidden="true" />
      </MenuButton>
      <MenuItems
        anchor="bottom end"
        transition
        // Above the post sheet (1150), below confirm dialogs (1200).
        className="z-[1160] w-40 origin-top-right rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] p-1.5 text-[var(--color-text-primary)] shadow-xl [--anchor-gap:6px] transition duration-[var(--dur-move)] ease-[var(--ease-ui)] focus:outline-none data-[closed]:scale-95 data-[closed]:opacity-0"
      >
        <MenuItem>
          <button type="button" className={menuItemClass} onClick={onEdit}>
            <Pencil size={15} aria-hidden="true" className="text-[var(--color-text-secondary)]" />
            Edit
          </button>
        </MenuItem>
        <MenuItem>
          <button type="button" className={`${menuItemClass} text-[var(--color-tint-danger)]`} onClick={onDelete}>
            <Trash2 size={15} aria-hidden="true" />
            Delete
          </button>
        </MenuItem>
      </MenuItems>
    </Menu>
  );
}

/** Avatar, name, short date, and the project it's filed under. Left-aligned like the feed card. */
function AuthorRow({ post }: { post: PostDetail }) {
  const name = authorName(post.author);
  const href = authorHref(post.author, post.user_id);
  const who = (
    <>
      <Avatar name={name} source={post.author?.avatar} size={36} />
      <span className="truncate text-[15px] font-semibold text-[var(--color-text-primary)]">{name}</span>
    </>
  );
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
      {href ? (
        <Link to={href} className="flex min-w-0 items-center gap-2.5 rounded-full hover:underline">
          {who}
        </Link>
      ) : (
        <span className="flex min-w-0 items-center gap-2.5">{who}</span>
      )}
      <span aria-hidden="true" className="text-sm text-[var(--color-text-tertiary)]">
        ·
      </span>
      <time
        dateTime={post.created_at}
        title={new Date(post.created_at).toLocaleString()}
        className="shrink-0 text-sm text-[var(--color-text-tertiary)]"
      >
        {shortDate(post.created_at)}
      </time>
      {post.project && (
        <span
          title={post.project.title}
          className="ml-1 inline-flex min-w-0 max-w-[14rem] items-center gap-1.5 rounded-full bg-[var(--color-surface-secondary)] px-2.5 py-1 text-xs font-medium text-[var(--color-text-secondary)]"
        >
          <Folder size={13} aria-hidden="true" className="shrink-0" />
          <span className="truncate">{post.project.title}</span>
        </span>
      )}
    </div>
  );
}

/** One picture: a placeholder while it loads, a quiet tile if it can't. */
function PostImage({ src, alt }: { src: string; alt: string }) {
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading");
  if (state === "error") {
    return (
      <div
        role="img"
        aria-label="Image unavailable"
        className="grid aspect-[16/10] w-full place-items-center rounded-2xl bg-[var(--color-surface-secondary)] text-[var(--color-text-tertiary)]"
      >
        <ImageOff size={22} aria-hidden="true" />
      </div>
    );
  }
  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl bg-[var(--color-surface-secondary)] ${
        state === "loading" ? "aspect-[16/10]" : ""
      }`}
    >
      {state === "loading" && <Skeleton className="absolute inset-0 !rounded-none" />}
      <img
        src={src}
        alt={alt}
        onLoad={() => setState("loaded")}
        onError={() => setState("error")}
        className="block max-h-[560px] w-full object-contain transition-opacity duration-[var(--dur-hover)]"
        style={{ opacity: state === "loaded" ? 1 : 0 }}
      />
    </div>
  );
}

/** A placeholder shaped like the post: author, a few lines, a picture, actions. */
function PostSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="flex flex-col gap-4">
      <div className="flex items-center gap-2.5">
        <Skeleton className="size-9 shrink-0 !rounded-full" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3.5 w-10" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <Skeleton className="aspect-[16/10] w-full !rounded-2xl" />
      <div className="flex gap-2">
        <Skeleton className="h-7 w-12" />
        <Skeleton className="h-7 w-12" />
      </div>
    </div>
  );
}

function NotFound({ variant }: { variant: PostViewVariant }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <FileQuestion size={26} aria-hidden="true" className="text-[var(--color-text-tertiary)]" />
      <p className="text-sm font-medium text-[var(--color-text-secondary)]">Post not found</p>
      {variant === "page" && <BackLink to="/feed" label="Feed" />}
    </div>
  );
}

export interface PostViewProps {
  postId: string;
  /** "page": the full page (a link or a refresh). "sheet": over the feed. */
  variant: PostViewVariant;
  /** Focus the reply box once the post has loaded. */
  focusComment?: boolean;
  /** The sheet's X. */
  onClose?: () => void;
  /** After the post is deleted: leave the page, or close the sheet. */
  onDeleted: () => void;
}

/**
 * A post and its conversation: the same content as the page (A) and the sheet over
 * the feed (B). The person's words come first, then their pictures, quiet actions,
 * and the comments ending in a reply box.
 */
export function PostView({ postId, variant, focusComment = false, onClose, onDeleted }: PostViewProps) {
  const confirm = useConfirm();
  const toast = useToast();
  const myId = useAuth()?.user.id ?? null;
  const { profile } = useProfile();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const replyRef = useRef<HTMLTextAreaElement | null>(null);
  const editRef = useRef<HTMLTextAreaElement | null>(null);

  // Polling pauses while editing, so nothing can overwrite what's being typed.
  const detail = usePostDetail(postId, { paused: editing });
  const { status, post, comments } = detail;
  const isOwner = !!myId && !!post && post.user_id === myId;

  function focusReply() {
    const el = replyRef.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    el.scrollIntoView?.({ behavior: "smooth", block: "center" });
  }

  // The feed card's comment button opens the post with the reply box ready.
  const ready = status === "ready";
  useEffect(() => {
    if (!ready || !focusComment) return;
    const t = setTimeout(focusReply, 60);
    return () => clearTimeout(t);
  }, [ready, focusComment]);

  useEffect(() => {
    if (editing) editRef.current?.focus();
  }, [editing]);

  function startEdit() {
    if (!post) return;
    setDraft(post.caption ?? "");
    setEditing(true);
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      await detail.saveCaption(draft);
      setEditing(false);
      toast("Saved");
    } catch {
      toast("Couldn't save. Try again.", { tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function removePost() {
    const ok = await confirm({ title: "Delete post?", confirmLabel: "Delete" });
    if (!ok) return;
    try {
      await detail.removePost();
    } catch {
      toast("Couldn't delete. Try again.", { tone: "error" });
      return;
    }
    toast("Post deleted");
    onDeleted();
  }

  async function removeComment(id: string) {
    const ok = await confirm({ title: "Delete comment?", confirmLabel: "Delete" });
    if (!ok) return;
    try {
      await detail.removeComment(id);
    } catch {
      toast("Couldn't delete. Try again.", { tone: "error" });
    }
  }

  async function sendComment(body: string) {
    if (!myId) {
      toast("Sign in to reply.", { tone: "error" });
      throw new Error("signed out");
    }
    const me = {
      id: myId,
      username: profile?.username ?? null,
      displayname: profile?.displayname ?? null,
      avatar: profile?.avatar ?? null,
    };
    try {
      await detail.sendComment(body, me);
    } catch (e) {
      toast("Couldn't send. Try again.", { tone: "error" });
      throw e;
    }
  }

  const menu = isOwner && !editing ? <OwnerMenu onEdit={startEdit} onDelete={() => void removePost()} /> : null;

  if (status === "notFound") {
    return (
      <>
        {variant === "sheet" && <TopRow variant={variant} onClose={onClose} />}
        <NotFound variant={variant} />
      </>
    );
  }

  const top = <TopRow variant={variant} onClose={onClose} menu={menu} />;

  if (status === "loading") {
    return (
      <>
        {top}
        <PostSkeleton />
      </>
    );
  }

  if (status === "error" || !post) {
    return (
      <>
        {top}
        <ErrorState
          message={detail.error ?? "Couldn't load this post."}
          onRetry={() => void detail.retry()}
          retrying={detail.retrying}
        />
      </>
    );
  }

  const caption = post.caption?.trim();
  // Older posts: a project's description, or an offer's details, still read as text.
  const extra = post.project?.description?.trim() || offerLine(post.offer);
  const altText = caption ? caption.slice(0, 120) : "";
  const meName = profile?.displayname?.trim() || profile?.username || "You";

  return (
    <article className="ui-page" aria-label={`Post by ${authorName(post.author)}`}>
      {top}
      <AuthorRow post={post} />

      <div className="mt-4">
        {editing ? (
          <div>
            <textarea
              ref={editRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                // Escape cancels the edit, not the sheet.
                if (e.key === "Escape") {
                  e.preventDefault();
                  e.stopPropagation();
                  setEditing(false);
                }
              }}
              aria-label="Caption"
              maxLength={CAPTION_MAX}
              rows={Math.min(10, Math.max(3, draft.split("\n").length + 1))}
              className="block w-full resize-y rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] px-4 py-3 text-[17px] leading-[26px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-tint-primary)]"
            />
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="ui-press h-9 rounded-full border border-[var(--color-border-strong)] px-4 text-sm font-medium text-[var(--color-text-primary)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving}
                className="ui-press h-9 rounded-full bg-[var(--color-tint-primary)] px-4 text-sm font-semibold text-[var(--color-text-onTint)] disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        ) : (
          caption && (
            <p className="m-0 text-[17px] leading-[26px] text-[var(--color-text-primary)]" style={WRAP}>
              {caption}
            </p>
          )
        )}

        {extra && (
          <p
            className={`m-0 text-[15px] leading-[22px] text-[var(--color-text-secondary)] ${caption || editing ? "mt-3" : ""}`}
            style={WRAP}
          >
            {extra}
          </p>
        )}
      </div>

      {post.images.length > 0 && (
        <div className="mt-4 flex flex-col gap-3">
          {post.images.map((src, i) => (
            <PostImage key={`${i}-${src}`} src={src} alt={altText} />
          ))}
        </div>
      )}

      <div className="-mx-3 mt-2">
        <ActionRow
          postId={post.id}
          likes={post.likes_count}
          comments={comments.filter((c) => !c.pending).length}
          noborder
          onCommentPress={focusReply}
        />
      </div>

      <div className="border-t border-[var(--color-border-subtle)]">
        <CommentThread
          comments={comments}
          myId={myId}
          me={{ name: meName, avatar: profile?.avatar ?? null }}
          onSend={sendComment}
          onDelete={(id) => void removeComment(id)}
          inputRef={replyRef}
        />
      </div>
    </article>
  );
}
