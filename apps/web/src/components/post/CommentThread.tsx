import { useEffect, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import { Link } from "react-router";
import { Send, Trash2 } from "lucide-react";
import { Avatar } from "@skillhiive/ui";
import { authorHref, authorName, COMMENT_MAX, shortDate, type PostComment } from "@/lib/postDetail";

/** A comment as a chat line: avatar, name, a soft bubble, a short time. */
function CommentItem({
  comment,
  mine,
  rise,
  onDelete,
}: {
  comment: PostComment;
  mine: boolean;
  rise: boolean;
  onDelete: (id: string) => void;
}) {
  const name = authorName(comment.author);
  const href = authorHref(comment.author, comment.user_id);
  const avatar = <Avatar name={name} source={comment.author?.avatar} size={32} />;

  return (
    <li
      className={`flex gap-2.5 ${rise ? "ui-rise" : ""}`}
      style={{ opacity: comment.pending ? 0.6 : 1, transition: "opacity var(--dur-hover) var(--ease-ui)" }}
      aria-busy={comment.pending || undefined}
    >
      {href ? (
        <Link to={href} className="mt-0.5 shrink-0 rounded-full" aria-label={name} tabIndex={-1}>
          {avatar}
        </Link>
      ) : (
        <span className="mt-0.5 shrink-0">{avatar}</span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          {href ? (
            <Link to={href} className="truncate text-sm font-semibold text-[var(--color-text-primary)] hover:underline">
              {name}
            </Link>
          ) : (
            <span className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{name}</span>
          )}
          <time
            dateTime={comment.created_at}
            title={new Date(comment.created_at).toLocaleString()}
            className="shrink-0 text-xs text-[var(--color-text-tertiary)]"
          >
            {shortDate(comment.created_at)}
          </time>
          {mine && !comment.pending && (
            <button
              type="button"
              onClick={() => onDelete(comment.id)}
              aria-label="Delete comment"
              title="Delete"
              className="ui-press ml-auto grid size-7 shrink-0 place-items-center rounded-full text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-tint-danger)]"
            >
              <Trash2 size={14} aria-hidden="true" />
            </button>
          )}
        </div>
        <p
          className="mt-1 inline-block max-w-full rounded-2xl rounded-tl-md border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] px-3.5 py-2 text-[15px] leading-[22px] text-[var(--color-text-primary)]"
          style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", wordBreak: "break-word" }}
        >
          {comment.body}
        </p>
      </div>
    </li>
  );
}

/** Grows with what's typed, up to a few lines, then scrolls. */
function autosize(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
}

/**
 * The conversation under a post, oldest first, with the reply box at its end (not pinned
 * to the screen). Sending is the caller's job: `onSend` resolves when the comment is
 * stored and rejects when it isn't; the box clears at once and gets the text back on failure.
 */
export function CommentThread({
  comments,
  myId,
  me,
  onSend,
  onDelete,
  inputRef,
}: {
  comments: PostComment[];
  myId: string | null;
  /** Your name and picture, for the reply box. */
  me: { name: string; avatar: string | null };
  onSend: (body: string) => Promise<void>;
  onDelete: (id: string) => void;
  /** The reply box, so the post can focus it. */
  inputRef?: RefObject<HTMLTextAreaElement | null>;
}) {
  const [text, setText] = useState("");
  const ownRef = useRef<HTMLTextAreaElement | null>(null);
  const boxRef = inputRef ?? ownRef;
  // Comments already here when the thread first showed don't animate; anything after does.
  const [initialIds] = useState(() => new Set(comments.map((c) => c.id)));

  useEffect(() => autosize(boxRef.current), [text, boxRef]);

  const canSend = text.trim().length > 0;

  function send() {
    const body = text.trim();
    if (!body) return;
    setText("");
    onSend(body).catch(() => {
      // Give the words back so nothing typed is lost, unless they've started another.
      setText((current) => (current.trim() ? current : body));
    });
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  }

  return (
    <section aria-label="Comments" className="mt-4">
      {comments.length > 0 && (
        <ul className="mb-5 flex flex-col gap-4">
          {comments.map((c) => (
            <CommentItem
              key={c.clientKey ?? c.id}
              comment={c}
              mine={!!myId && c.user_id === myId}
              rise={!!c.clientKey || !initialIds.has(c.id)}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}

      <form
        className="flex items-end gap-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <span className="mb-1 shrink-0">
          <Avatar name={me.name} source={me.avatar} size={32} />
        </span>
        <div className="flex min-w-0 flex-1 items-end gap-1 rounded-[22px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] py-1 pl-4 pr-1 transition-colors duration-[var(--dur-hover)] focus-within:border-[var(--color-border-strong)]">
          <textarea
            ref={boxRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Reply…"
            aria-label="Reply"
            maxLength={COMMENT_MAX}
            rows={1}
            className="max-h-[140px] min-w-0 flex-1 resize-none bg-transparent py-2 text-[15px] leading-[22px] text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-tertiary)]"
          />
          <button
            type="submit"
            disabled={!canSend}
            aria-label="Send"
            className={`ui-press grid size-9 shrink-0 place-items-center rounded-full ${
              canSend
                ? "bg-[var(--color-tint-primary)] text-[var(--color-text-onTint)]"
                : "text-[var(--color-text-tertiary)]"
            }`}
          >
            <Send size={16} strokeWidth={2.2} aria-hidden="true" />
          </button>
        </div>
      </form>
    </section>
  );
}
