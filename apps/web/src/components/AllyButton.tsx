import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Check, UserPlus, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  acceptAllyRequest,
  fetchAllyStatus,
  removeAlly,
  sendAllyRequest,
  type AllyStatus,
} from "@/lib/allies";
import { loginUrlFor } from "@/lib/returnTo";
import { errorMessage } from "@/lib/errors";

const baseClass =
  "inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold disabled:opacity-60";
const primaryClass = `${baseClass} bg-[var(--color-tint-primary)] text-[var(--color-text-onTint)]`;
const quietClass = `${baseClass} border border-[var(--color-border-strong)] text-[var(--color-text-primary)]`;

/**
 * Ally / Requested / Accept on someone's profile. Signed-out visitors get a button that
 * signs them in and brings them back. Hidden on your own profile.
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
  const myId = session?.user.id ?? null;
  const [status, setStatus] = useState<AllyStatus | "loading">("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  if (session === undefined || myId === profileId) return null;

  if (!session) {
    return (
      <Link to={loginUrlFor(returnTo)} className={primaryClass}>
        <UserPlus size={16} aria-hidden="true" />
        Ally
      </Link>
    );
  }

  async function act(work: () => Promise<void>, next: AllyStatus, delta = 0) {
    setBusy(true);
    setError(null);
    try {
      await work();
      setStatus(next);
      if (delta) onAlliesChanged?.(delta);
    } catch (e) {
      setError(errorMessage(e) ?? "That didn't work. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const me = myId!;
  let button: React.ReactNode;
  if (status === "loading") {
    button = (
      <span className={quietClass} aria-hidden="true">
        <span className="size-4 animate-spin rounded-full border-2 border-[var(--color-border-strong)] border-t-[var(--color-text-primary)]" />
      </span>
    );
  } else if (status === "accepted") {
    button = (
      <span className={quietClass}>
        <Check size={16} aria-hidden="true" />
        Allies
      </span>
    );
  } else if (status === "pending_sent") {
    button = (
      <button
        type="button"
        disabled={busy}
        className={quietClass}
        onClick={() => void act(() => removeAlly(me, profileId), "none")}
        title="Withdraw your request"
      >
        <X size={16} aria-hidden="true" />
        Requested
      </button>
    );
  } else if (status === "pending_received") {
    button = (
      <button
        type="button"
        disabled={busy}
        className={primaryClass}
        onClick={() => void act(() => acceptAllyRequest(me, profileId), "accepted", 1)}
      >
        <Check size={16} aria-hidden="true" />
        Accept ally request
      </button>
    );
  } else {
    button = (
      <button
        type="button"
        disabled={busy}
        className={primaryClass}
        onClick={() => void act(() => sendAllyRequest(me, profileId), "pending_sent")}
      >
        <UserPlus size={16} aria-hidden="true" />
        Ally
      </button>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      {button}
      {error && (
        <p role="alert" className="text-xs text-[var(--color-tint-danger)]">
          {error}
        </p>
      )}
    </div>
  );
}
