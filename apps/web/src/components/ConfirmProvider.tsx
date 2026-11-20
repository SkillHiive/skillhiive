import { useCallback, useRef, useState, type ReactNode } from "react";
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import { ConfirmContext, type ConfirmFn, type ConfirmOptions } from "@/lib/confirm";

type Pending = { options: ConfirmOptions; resolve: (r: { checked: boolean } | null) => void };

/**
 * One confirmation dialog for the whole app. Escape, the backdrop and Cancel all say no;
 * focus starts on Cancel so a stray Enter never destroys anything.
 */
export default function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback<ConfirmFn>(
    (options) =>
      new Promise((resolve) => {
        setChecked(false);
        setPending({ options, resolve });
        setOpen(true);
      }),
    [],
  );

  const close = (result: { checked: boolean } | null) => {
    // Keep `pending` so the text stays put while the dialog fades out.
    pending?.resolve(result);
    setOpen(false);
  };

  const options = pending?.options;
  const danger = (options?.tone ?? "danger") === "danger";

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={open} onClose={() => close(null)} initialFocus={cancelRef} className="relative z-[1200]">
        <DialogBackdrop transition className="fixed inset-0 bg-black/60 transition-opacity duration-150 data-[closed]:opacity-0" />
        <div className="fixed inset-0 grid place-items-center p-4">
          <DialogPanel
            transition
            className="w-full max-w-sm rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] p-5 text-[var(--color-text-primary)] shadow-2xl transition duration-150 data-[closed]:scale-95 data-[closed]:opacity-0"
          >
            <DialogTitle className="text-base font-semibold">{options?.title}</DialogTitle>
            {options?.description && (
              <p className="mt-1.5 text-sm text-[var(--color-text-secondary)]">{options.description}</p>
            )}
            {options?.option && (
              <label className="mt-4 flex cursor-pointer items-center gap-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => setChecked(e.target.checked)}
                  className="size-4 accent-[var(--color-tint-danger)]"
                />
                {options.option.label}
              </label>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                ref={cancelRef}
                type="button"
                onClick={() => close(null)}
                className="h-9 rounded-full border border-[var(--color-border-strong)] px-4 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => close({ checked })}
                className={`h-9 rounded-full px-4 text-sm font-semibold ${
                  danger
                    ? "bg-[var(--color-tint-danger)] text-white"
                    : "bg-[var(--color-tint-primary)] text-[var(--color-text-onTint)]"
                }`}
              >
                {options?.confirmLabel}
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </ConfirmContext.Provider>
  );
}
