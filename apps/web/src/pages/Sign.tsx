import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { Eye, EyeOff } from "lucide-react";
import still from "@/assets/sign-still.webp";
import { safeNext } from "@/lib/returnTo";
import { supabase } from "@/lib/supabase";
import { authErrorMessage } from "@/lib/authMessages";

const fieldClass =
  "h-12 w-full rounded-xl border border-white/25 bg-black/40 px-4 text-[15px] text-white placeholder:text-white/50 backdrop-blur-sm transition-colors hover:border-white/40";

export default function Sign() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();

  const [mode, setMode] = useState<"signin" | "forgot">(
    params.get("forgot") === "1" ? "forgot" : "signin",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setLoading(true);
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (signInError) {
      setError(authErrorMessage(signInError, "Couldn't sign in. Try again."));
      return;
    }
    if (data.session) navigate(safeNext(location.search) ?? "/home", { replace: true });
  }

  async function handleReset(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError("Enter the email you signed up with.");
      return;
    }
    setLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (resetError) {
      setError(authErrorMessage(resetError, "Couldn't send the email. Try again."));
      return;
    }
    // Same message whether or not the account exists, so the form can't be used to look up emails.
    setResetSent(true);
  }

  function switchMode(next: "signin" | "forgot") {
    setMode(next);
    setError(null);
    setResetSent(false);
  }

  return (
    <main className="relative flex min-h-dvh items-end justify-center overflow-hidden bg-black px-4 pb-12 pt-24 text-white sm:items-center sm:justify-start sm:px-12 lg:px-24">
      <img
        src={still}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 size-full object-cover"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/10 sm:bg-gradient-to-r sm:from-black/85 sm:via-black/45 sm:to-transparent"
      />

      <div className="relative w-full max-w-sm">
        {mode === "signin" ? (
          <>
            <h1 className="font-mono text-2xl font-semibold tracking-tight">Welcome back</h1>
            <p className="mt-1 text-sm text-white/75">Sign in to pick up where you left off.</p>

            <form onSubmit={(e) => void handleLogin(e)} className="mt-6 flex flex-col gap-4" noValidate>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-sm font-medium text-white/90">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="you@example.com"
                  value={email}
                  disabled={loading}
                  onChange={(e) => setEmail(e.target.value)}
                  className={fieldClass}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between">
                  <label htmlFor="password" className="text-sm font-medium text-white/90">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => switchMode("forgot")}
                    className="text-sm text-white/75 underline-offset-4 hover:text-white hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    disabled={loading}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`${fieldClass} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-1.5 top-1.5 grid size-9 place-items-center rounded-lg text-white/75 hover:text-white"
                  >
                    {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                  </button>
                </div>
              </div>

              {error && (
                <p role="alert" className="rounded-xl border border-red-400/50 bg-red-950/60 px-4 py-2.5 text-sm text-red-100">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-1 inline-flex h-12 items-center justify-center rounded-xl bg-[var(--color-tint-primary)] text-[15px] font-semibold text-[var(--color-text-onTint)] disabled:opacity-60"
              >
                {loading ? "Signing in…" : "Log in"}
              </button>
            </form>

            <p className="mt-5 text-sm text-white/75">
              New here?{" "}
              <Link to="/register" className="font-semibold text-white underline-offset-4 hover:underline">
                Create an account
              </Link>
            </p>
          </>
        ) : (
          <>
            <h1 className="font-mono text-2xl font-semibold tracking-tight">Reset your password</h1>
            {resetSent ? (
              <div role="status" className="mt-4 flex flex-col gap-4">
                <p className="text-sm text-white/85">
                  If there's an account for <strong className="text-white">{email.trim()}</strong>, a link to
                  choose a new password is on its way. It works once, for a short time.
                </p>
                <button
                  type="button"
                  onClick={() => switchMode("signin")}
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-white/40 text-[15px] font-semibold text-white"
                >
                  Back to log in
                </button>
              </div>
            ) : (
              <>
                <p className="mt-1 text-sm text-white/75">We'll email you a link to choose a new one.</p>
                <form onSubmit={(e) => void handleReset(e)} className="mt-6 flex flex-col gap-4" noValidate>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="reset-email" className="text-sm font-medium text-white/90">
                      Email
                    </label>
                    <input
                      id="reset-email"
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      placeholder="you@example.com"
                      value={email}
                      disabled={loading}
                      onChange={(e) => setEmail(e.target.value)}
                      className={fieldClass}
                    />
                  </div>
                  {error && (
                    <p role="alert" className="rounded-xl border border-red-400/50 bg-red-950/60 px-4 py-2.5 text-sm text-red-100">
                      {error}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex h-12 items-center justify-center rounded-xl bg-[var(--color-tint-primary)] text-[15px] font-semibold text-[var(--color-text-onTint)] disabled:opacity-60"
                  >
                    {loading ? "Sending…" : "Email me a link"}
                  </button>
                  <button
                    type="button"
                    onClick={() => switchMode("signin")}
                    className="text-sm text-white/75 hover:text-white"
                  >
                    Back to log in
                  </button>
                </form>
              </>
            )}
          </>
        )}

        <p className="mt-8 text-xs text-white/60">
          By continuing you agree to our{" "}
          <Link to="/terms" className="underline underline-offset-2">
            Terms
          </Link>{" "}
          and{" "}
          <Link to="/privacy" className="underline underline-offset-2">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
