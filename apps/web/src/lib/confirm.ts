import { createContext, useContext } from "react";

export interface ConfirmOptions {
  title: string;
  /** One short sentence on what happens. */
  description?: string;
  /** The button that does it, as a verb: "Sign out", "Delete post". */
  confirmLabel: string;
  /** "danger" colours the button red. Default "danger". */
  tone?: "danger" | "neutral";
  /** An unchecked box that widens the action, e.g. "Also delete its data". */
  option?: { label: string };
}

export type ConfirmFn = (options: ConfirmOptions) => Promise<{ checked: boolean } | null>;

export const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * Ask before something that can't be undone.
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title: "Delete post?", confirmLabel: "Delete" }))) return;
 * Resolves to null when cancelled, or { checked } when confirmed.
 */
export function useConfirm(): ConfirmFn {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error("useConfirm needs a <ConfirmProvider> above it");
  return confirm;
}
