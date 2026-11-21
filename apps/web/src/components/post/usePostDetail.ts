import { useCallback, useEffect, useRef, useState } from "react";
import {
  addComment,
  announcePostChange,
  deleteComment,
  deletePost,
  fetchComments,
  fetchPostDetail,
  updateCaption,
  type PostAuthor,
  type PostComment,
  type PostDetail,
} from "@/lib/postDetail";
import { loadErrorMessage } from "@/lib/load";

/** How often to look for new comments while the post is open and visible. */
export const COMMENT_POLL_MS = 8000;

type Status = "loading" | "ready" | "notFound" | "error";

interface State {
  status: Status;
  post: PostDetail | null;
  comments: PostComment[];
  error: string | null;
}

/**
 * One post and its comments, kept fresh by a quiet poll that never flashes the page.
 * Writes are optimistic: the change shows at once and is undone if the server says no.
 * Each write bumps `version`, so a poll that started before it can't put old data back.
 * Remount (key by post id) to show another post.
 */
export function usePostDetail(postId: string, { paused = false }: { paused?: boolean } = {}) {
  const [state, setState] = useState<State>({ status: "loading", post: null, comments: [], error: null });
  const [retrying, setRetrying] = useState(false);
  const version = useRef(0);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  /** Fetches both. `quiet` loads (polls) keep what's on screen when they fail. */
  const load = useCallback(
    async (quiet: boolean) => {
      const v = version.current;
      try {
        const [post, comments] = await Promise.all([fetchPostDetail(postId), fetchComments(postId)]);
        if (!alive.current || v !== version.current) return;
        setState((s) => {
          if (!post) return { status: "notFound", post: null, comments: [], error: null };
          // Comments you just sent keep their row (and don't animate again).
          const keys = new Map(s.comments.filter((c) => c.clientKey).map((c) => [c.id, c.clientKey]));
          return {
            status: "ready",
            post,
            comments: comments.map((c) => (keys.has(c.id) ? { ...c, clientKey: keys.get(c.id) } : c)),
            error: null,
          };
        });
      } catch (e) {
        if (!alive.current || quiet) return;
        setState((s) => ({ ...s, status: "error", error: loadErrorMessage(e, "this post") }));
      }
    },
    [postId],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  const ready = state.status === "ready";
  useEffect(() => {
    if (!ready || paused) return;
    const timer = setInterval(() => {
      if (typeof document === "undefined" || document.visibilityState === "visible") void load(true);
    }, COMMENT_POLL_MS);
    return () => clearInterval(timer);
  }, [ready, paused, load]);

  const retry = useCallback(async () => {
    setRetrying(true);
    await load(false);
    if (alive.current) setRetrying(false);
  }, [load]);

  // The feed underneath (when this is a sheet) keeps its comment count in step.
  const confirmedCount = state.comments.filter((c) => !c.pending).length;
  useEffect(() => {
    if (ready) announcePostChange({ id: postId, patch: { comments_count: confirmedCount } });
  }, [ready, confirmedCount, postId]);

  // Read by removeComment to put a comment back exactly where it was.
  const commentsRef = useRef(state.comments);
  useEffect(() => {
    commentsRef.current = state.comments;
  }, [state.comments]);

  /** Shows the comment at once; resolves when the server has it, rejects (after undoing it) when not. */
  const sendComment = useCallback(
    async (body: string, me: PostAuthor) => {
      const tempId = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const temp: PostComment = {
        id: tempId,
        body,
        created_at: new Date().toISOString(),
        user_id: me.id,
        author: me,
        pending: true,
        clientKey: tempId,
      };
      version.current += 1;
      setState((s) => ({ ...s, comments: [...s.comments, temp] }));
      try {
        const saved = await addComment(postId, me.id, body);
        version.current += 1;
        if (!alive.current) return;
        setState((s) => ({
          ...s,
          comments: s.comments.map((c) =>
            c.id === tempId ? { ...saved, author: saved.author ?? me, clientKey: tempId } : c,
          ),
        }));
      } catch (e) {
        version.current += 1;
        if (alive.current) setState((s) => ({ ...s, comments: s.comments.filter((c) => c.id !== tempId) }));
        throw e;
      }
    },
    [postId],
  );

  /** Removes it at once; puts it back where it was (and rejects) if the delete fails. */
  const removeComment = useCallback(async (id: string) => {
    const index = commentsRef.current.findIndex((c) => c.id === id);
    const comment = commentsRef.current[index];
    if (!comment) return;
    version.current += 1;
    setState((s) => ({ ...s, comments: s.comments.filter((c) => c.id !== id) }));
    try {
      await deleteComment(id);
      version.current += 1;
    } catch (e) {
      version.current += 1;
      if (alive.current) {
        setState((s) => {
          const comments = [...s.comments];
          comments.splice(Math.min(index, comments.length), 0, comment);
          return { ...s, comments };
        });
      }
      throw e;
    }
  }, []);

  /** Saves the caption; the page shows it only once the server has it. Rejects on failure. */
  const saveCaption = useCallback(
    async (caption: string) => {
      const stored = await updateCaption(postId, caption);
      version.current += 1;
      if (alive.current) setState((s) => (s.post ? { ...s, post: { ...s.post, caption: stored } } : s));
      announcePostChange({ id: postId, patch: { caption: stored } });
    },
    [postId],
  );

  /** Deletes the post. Rejects on failure. */
  const removePost = useCallback(async () => {
    await deletePost(postId);
    version.current += 1;
    announcePostChange({ id: postId, deleted: true });
  }, [postId]);

  return { ...state, retrying, retry, sendComment, removeComment, saveCaption, removePost };
}
