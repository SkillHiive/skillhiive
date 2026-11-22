import type { ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Renders children into the Picture-in-Picture window's body. React listens for
 * events on a portal's container, so handlers work inside the other document.
 */
export function PipPortal({ pipWindow, children }: { pipWindow: Window; children: ReactNode }) {
  return createPortal(children, pipWindow.document.body);
}
