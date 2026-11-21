import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { CircleAlert, Check } from "lucide-react";
import { ToastContext, toastDuration, type ToastFn, type ToastTone } from "@/lib/toast";

type Shown = { id: number; message: string; tone: ToastTone };

/** One toast at a time, bottom centre, above the phone tab bar. */
export default function ToastProvider({ children }: { children: ReactNode }) {
  const [shown, setShown] = useState<Shown | null>(null);
  const [leaving, setLeaving] = useState(false);
  const counter = useRef(0);
  const timers = useRef<number[]>([]);

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  const toast = useCallback<ToastFn>((message, options) => {
    const tone = options?.tone ?? "neutral";
    clearTimers();
    counter.current += 1;
    setLeaving(false);
    setShown({ id: counter.current, message, tone });
    const duration = toastDuration(tone);
    timers.current.push(window.setTimeout(() => setLeaving(true), duration));
    timers.current.push(window.setTimeout(() => setShown(null), duration + 160));
  }, []);

  useEffect(() => clearTimers, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[1300] flex justify-center px-4 sm:bottom-8">
        <div role="status" aria-live="polite">
          {shown && (
            <div
              key={shown.id}
              className="ui-rise pointer-events-auto flex items-center gap-2 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] px-4 py-2.5 text-sm font-medium text-[var(--color-text-primary)] shadow-lg"
              style={{ opacity: leaving ? 0 : undefined, transition: "opacity 160ms var(--ease-ui)" }}
            >
              {shown.tone === "error" ? (
                <CircleAlert size={16} aria-hidden="true" className="text-[var(--color-tint-danger)]" />
              ) : (
                <Check size={16} aria-hidden="true" className="text-[var(--color-tint-success)]" />
              )}
              {shown.message}
            </div>
          )}
        </div>
      </div>
    </ToastContext.Provider>
  );
}
