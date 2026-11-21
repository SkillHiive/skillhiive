import { createContext, useContext } from "react";

export type ToastTone = "neutral" | "error";
export type ToastFn = (message: string, options?: { tone?: ToastTone }) => void;

export const ToastContext = createContext<ToastFn | null>(null);

/**
 * A short note after something was saved or failed: "Saved", "Couldn't save. Try again."
 *   const toast = useToast();
 *   toast("Saved to skillhiive · 42m");
 * One at a time; a new one replaces the last.
 */
export function useToast(): ToastFn {
  const toast = useContext(ToastContext);
  if (!toast) throw new Error("useToast needs a <ToastProvider> above it");
  return toast;
}

/** How long a toast stays: errors longer, so there is time to read them. */
export function toastDuration(tone: ToastTone): number {
  return tone === "error" ? 4500 : 2400;
}
