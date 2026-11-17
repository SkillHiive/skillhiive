import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { Eye, EyeOff } from "lucide-react";
import PageFallback from "@/components/PageFallback";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { errorMessage } from "@/lib/errors";

const MIN_LENGTH = 8;

const fieldClass =
  "h-11 w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-bg-canvas)] px-3.5 text-[15px] text-[var(--color-text-primary)]";

/**
 * Where the "reset your password" email lands. Supabase signs the visitor in from the
 * link, so a session here means the link worked and they can choose a new password.
 */
export default function ResetPassword() {
  const session = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (session === undefined) return <PageFallback />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < MIN_LENGTH) {
      setError(`Use at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }
    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) {
      setError(errorMessage(updateError) ?? "Couldn't save the new password. Try again.");
      return;
    }
    setDone(true);
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--color-bg-muted)] px-4 py-24 text-[var(--color-text-primary)]">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-primary)] p-6 shadow-xl">
        {!session ? (
          <div className="flex flex-col gap-3">
            <h1 className="text-xl font-semibold">This link has expired</h1>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Reset links work once and only for a short time. Ask for a new one from the sign-in page.
            </p>
            <Link
              to="/login?forgot=1"
              className="mt-2 inline-flex h-11 items-center justify-center rounded-xl bg-[var(--color-tint-primary)] text-sm font-semibold text-[var(--color-text-onTint)]"
            >
              Send a new link
            </Link>
          </div>
        ) : done ? (
          <div className="flex flex-col gap-3">
            <h1 className="text-xl font-semibold">Password changed</h1>
            <p className="text-sm text-[var(--color-text-secondary)]">
              You're signed in. Use the new password next time.
            </p>
            <button
              type="button"
              onClick={() => navigate("/home", { replace: true })}
              className="mt-2 inline-flex h-11 items-center justify-center rounded-xl bg-[var(--color-tint-primary)] text-sm font-semibold text-[var(--color-text-onTint)]"
            >
              Go to Today
            </button>
          </div>
        ) : (
          <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-semibold">Choose a new password</h1>
              <p className="text-sm text-[var(--color-text-secondary)]">
                For {session.user.email ?? "your account"}.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="new-password" className="text-sm font-medium">
                New password
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  type={show ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${fieldClass} pr-11`}
                  aria-describedby="password-hint"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  aria-label={show ? "Hide password" : "Show password"}
                  className="absolute right-1 top-1 grid size-9 place-items-center rounded-lg text-[var(--color-text-secondary)]"
                >
                  {show ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                </button>
              </div>
              <p id="password-hint" className="text-xs text-[var(--color-text-secondary)]">
                At least {MIN_LENGTH} characters.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirm-password" className="text-sm font-medium">
                Type it again
              </label>
              <input
                id="confirm-password"
                type={show ? "text" : "password"}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={fieldClass}
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-[var(--color-tint-danger)]">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--color-tint-primary)] text-sm font-semibold text-[var(--color-text-onTint)] disabled:opacity-60"
            >
              {busy ? "Saving…" : "Save new password"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
