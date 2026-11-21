import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from "@headlessui/react";
import { PostView } from "./PostView";

/** How long the sheet takes to leave before going back, if the transition never reports. */
const LEAVE_FALLBACK_MS = 400;

/**
 * A post opened from the feed, in a sheet over it (B). The feed stays mounted underneath,
 * so closing returns to the same scroll position with nothing refetched. Escape, the
 * backdrop and X close it; closing goes back in history, to the feed it came from.
 * Full height from the bottom on phones; a centred panel on wider screens.
 */
export function PostSheet() {
  const { postId = "" } = useParams<{ postId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const focusComment = !!(location.state as { focusComment?: boolean } | null)?.focusComment;

  const [open, setOpen] = useState(true);
  const left = useRef(false);
  const fallback = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goBack = useCallback(() => {
    if (left.current) return;
    left.current = true;
    if (fallback.current) clearTimeout(fallback.current);
    navigate(-1);
  }, [navigate]);

  const close = useCallback(() => {
    setOpen(false);
    if (fallback.current) clearTimeout(fallback.current);
    fallback.current = setTimeout(goBack, LEAVE_FALLBACK_MS);
  }, [goBack]);

  useEffect(
    () => () => {
      if (fallback.current) clearTimeout(fallback.current);
    },
    [],
  );

  return (
    <Transition show={open} appear afterLeave={goBack}>
      {/* Above the nav (1000); confirm dialogs (1200) still open on top. */}
      <Dialog onClose={close} className="relative z-[1150]">
        <TransitionChild>
          <div
            aria-hidden="true"
            className="fixed inset-0 bg-black/50 transition-opacity duration-[var(--dur-sheet)] ease-[var(--ease-ui)] data-[closed]:opacity-0 data-[leave]:duration-[var(--dur-hover)]"
          />
        </TransitionChild>
        <div className="fixed inset-0 flex items-end justify-center sm:items-center sm:p-4">
          <TransitionChild>
            <DialogPanel
              className="flex h-[100dvh] w-full flex-col overflow-y-auto overscroll-contain bg-[var(--color-bg-muted)] text-[var(--color-text-primary)] shadow-2xl transition duration-[var(--dur-sheet)] ease-[var(--ease-ui)] data-[closed]:translate-y-full data-[leave]:duration-[var(--dur-hover)] motion-reduce:data-[closed]:translate-y-0 motion-reduce:data-[closed]:opacity-0 sm:h-auto sm:max-h-[90vh] sm:max-w-[680px] sm:rounded-3xl sm:border sm:border-[var(--color-border-subtle)] sm:data-[closed]:translate-y-4 sm:data-[closed]:opacity-0"
              style={{ fontFamily: '"popreg", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' }}
            >
              <DialogTitle className="sr-only">Post</DialogTitle>
              <div className="px-4 pb-10 pt-[max(12px,env(safe-area-inset-top))] sm:px-6 sm:pt-4">
                <PostView key={postId} postId={postId} variant="sheet" focusComment={focusComment} onClose={close} onDeleted={close} />
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}
