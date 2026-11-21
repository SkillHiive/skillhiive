import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { Check, Clock, Undo2, UserPlus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  acceptAllyRequest,
  fetchAllyStatus,
  removeAlly,
  sendAllyRequest,
  type AllyStatus,
} from "@/lib/allies";
import { useConfirm } from "@/lib/confirm";
import { loginUrlFor } from "@/lib/returnTo";
import { useToast } from "@/lib/toast";

const baseClass =
  "ui-press inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold disabled:opacity-60";
const primaryClass = `${baseClass} bg-[var(--color-tint-primary)] text-[var(--color-text-onTint)]`;
const quietClass = `${baseClass} border border-[var(--color-border-strong)] text-[var(--color-text-primary)]`;

/** How long Undo stays next to the button after a change. */
const UNDO_MS = 6000;

type Undo = { work: () => Promise<void>; next: AllyStatus; delta: number; done: string };

/**
 * Ally / Requested / Accept / Allied on someone's profile. Each change can be undone
 * for a few seconds; ending an alliance asks first. Signed-out visitors get a button
 * that signs them in and brings them back. Hidden on your own profile.
 */
export default function AllyButton({
  profileId,
  returnTo,
  onAlliesChanged,
}: {
  profileId: string;
  returnTo: string;
  onAlliesChanged?: (delta: number) => void;
}) {
  const session = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const myId = session?.user.id ?? null;
  const [status, setStatus] = useState<AllyStatus | "loading">("loading");
  const [busy, setBusy] = useState(false);
  const [undo, setUndo] = useState<Undo | null>(null);
  const undoTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!myId) return;
    let cancelled = false;
    fetchAllyStatus(myId, profileId).then(
      (next) => !cancelled && setStatus(next),
      () => !cancelled && setStatus("none"),
    );
    return () => {
      cancelled = true;
    };
  }, [myId, profileId]);

  useEffect(() => () => window.clearTimeout(undoTimer.current), []);

  if (session === undefined || myId === profileId) return null;

  if (!session) {
    return (
      <Link to={loginUrlFor(returnTo)} className={primaryClass}>
        <UserPlus size={16} aria-hidden="true" />
        Ally
      </Link>
    );
  }

  const me = myId!;

  function offerUndo(next: Undo | null) {
    window.clearTimeout(undoTimer.current);
    setUndo(next);
    if (next) undoTimer.current = window.setTimeout(() => setUndo(null), UNDO_MS);
  }

  async function act(
    work: () => Promise<void>,
    next: AllyStatus,
    delta: number,
    done: string,
    reverse: Undo | null,
  ) {
    setBusy(true);
    offerUndo(null);
    try {
      await work();
      setStatus(next);
      if (delta) onAlliesChanged?.(delta);
      toast(done);
      offerUndo(reverse);
    } catch {
      toast("That didn't go through. Try again.", { tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  const withdraw = () => removeAlly(me, profileId);
  const request = () => sendAllyRequest(me, profileId);

  async function endAlliance() {
    const ok = await confirm({ title: "Remove ally?", confirmLabel: "Remove", tone: "neutral" });
    if (ok) void act(withdraw, "none", -1, "Ally removed", null);
  }

  let button: React.ReactNode;
  if (status === "loading") {
    button = (
      <span className={quietClass} aria-hidden="true">
        <span className="size-4 animate-spin rounded-full border-2 border-[var(--color-border-strong)] border-t-[var(--color-text-primary)]" />
      </span>
    );
  } else if (status === "accepted") {
    button = (
      <button type="button" disabled={busy} className={quietClass} onClick={() => void endAlliance()}>
        <Check size={16} aria-hidden="true" />
        Allied
      </button>
    );
  } else if (status === "pending_sent") {
    button = (
      <button
        type="button"
        disabled={busy}
        className={quietClass}
        title="Withdraw request"
        onClick={() =>
          void act(withdraw, "none", 0, "Request withdrawn", {
            work: request,
            next: "pending_sent",
            delta: 0,
            done: "Request sent",
          })
        }
      >
        <Clock size={16} aria-hidden="true" />
        Requested
      </button>
    );
  } else if (status === "pending_received") {
    button = (
      <button
        type="button"
        disabled={busy}
        className={primaryClass}
        onClick={() =>
          void act(() => acceptAllyRequest(me, profileId), "accepted", 1, "You're allies", {
            // Undoing an accept ends the alliance; the request can't be put back.
            work: withdraw,
            next: "none",
            delta: -1,
            done: "Ally removed",
          })
        }
      >
        <Check size={16} aria-hidden="true" />
        Accept
      </button>
    );
  } else {
    button = (
      <button
        type="button"
        disabled={busy}
        className={primaryClass}
        onClick={() =>
          void act(request, "pending_sent", 0, "Request sent", {
            work: withdraw,
            next: "none",
            delta: 0,
            done: "Request withdrawn",
          })
        }
      >
        <UserPlus size={16} aria-hidden="true" />
        Ally
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      {button}
      {undo && (
        <button
          type="button"
          disabled={busy}
          aria-label="Undo"
          title="Undo"
          onClick={() => void act(undo.work, undo.next, undo.delta, undo.done, null)}
          className="ui-press ui-rise inline-flex size-10 items-center justify-center rounded-full text-[var(--color-text-secondary)] hover:bg-[var(--color-overlay-press)] hover:text-[var(--color-text-primary)] disabled:opacity-60"
        >
          <Undo2 size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
