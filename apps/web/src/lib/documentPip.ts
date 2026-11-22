// Document Picture-in-Picture: a separate always-on-top window holding live DOM
// (Chrome and Edge 116+). Pure helpers, no React.

export interface DocumentPipRequestOptions {
  width: number;
  height: number;
  /** Hides the "back to tab" button in the PiP window. */
  disallowReturnToOpener?: boolean;
  /** Opens at the default position and size instead of the last ones the user chose. */
  preferInitialWindowPlacement?: boolean;
}

export interface DocumentPipEnterEvent extends Event {
  readonly window: Window;
}

export interface DocumentPictureInPicture extends EventTarget {
  requestWindow(options: DocumentPipRequestOptions): Promise<Window>;
  /** The open PiP window, or null. */
  readonly window: Window | null;
  addEventListener(
    type: "enter",
    listener: (event: DocumentPipEnterEvent) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ): void;
}

type WindowWithPip = Window & { documentPictureInPicture?: DocumentPictureInPicture };

/** The media session, with the action name the DOM lib does not list yet. */
interface PipMediaSession {
  setActionHandler(action: "enterpictureinpicture", handler: (() => void) | null): void;
}

export const DEFAULT_PIP_WIDTH = 360;
export const DEFAULT_PIP_HEIGHT = 240;

function pipApi(): DocumentPictureInPicture | null {
  if (typeof window === "undefined") return null;
  return (window as WindowWithPip).documentPictureInPicture ?? null;
}

export function isDocumentPipSupported(): boolean {
  return pipApi() !== null;
}

/** The open PiP window, if any. */
export function getPipWindow(): Window | null {
  return pipApi()?.window ?? null;
}

/**
 * Copies the opener's styles into the PiP document: every <style> and
 * <link rel="stylesheet"> (Vite's dev styles and the built CSS), plus the <html>
 * class, data-* attributes and inline style that carry the theme.
 */
export function copyStyles(from: Document, to: Document): void {
  from.querySelectorAll<HTMLStyleElement | HTMLLinkElement>('style, link[rel="stylesheet"]').forEach((node) => {
    const copy = to.importNode(node, true);
    // The PiP document is about:blank, so resolve relative hrefs against the opener.
    // Tag names, not instanceof: the copy belongs to the other window's realm.
    if (node.tagName === "LINK" && (node as HTMLLinkElement).href) {
      copy.setAttribute("href", (node as HTMLLinkElement).href);
    }
    to.head.appendChild(copy);
  });

  const src = from.documentElement;
  const dst = to.documentElement;
  dst.className = src.className;
  for (const attr of Array.from(src.attributes)) {
    if (attr.name.startsWith("data-")) dst.setAttribute(attr.name, attr.value);
  }
  const style = src.getAttribute("style");
  if (style) dst.setAttribute("style", style);

  to.body.style.margin = "0";
  to.body.style.height = "100%";
}

let pending: Promise<Window | null> | null = null;

/**
 * Opens the PiP window, or returns the one already open. Needs a user gesture,
 * or the media session's enterpictureinpicture action. Null when unsupported or
 * when the browser refuses.
 */
export function openPipWindow(opts: { width?: number; height?: number } = {}): Promise<Window | null> {
  const api = pipApi();
  if (!api) return Promise.resolve(null);
  if (api.window) return Promise.resolve(api.window);
  if (pending) return pending;

  pending = api
    .requestWindow({
      width: opts.width ?? DEFAULT_PIP_WIDTH,
      height: opts.height ?? DEFAULT_PIP_HEIGHT,
    })
    .then((win) => {
      copyStyles(document, win.document);
      win.document.title = document.title;
      return win;
    })
    .catch(() => null)
    .finally(() => {
      pending = null;
    });
  return pending;
}

export function closePipWindow(): void {
  pipApi()?.window?.close();
}

function pipMediaSession(): PipMediaSession | null {
  if (typeof navigator === "undefined" || !("mediaSession" in navigator) || !navigator.mediaSession) return null;
  return navigator.mediaSession as unknown as PipMediaSession;
}

/**
 * Sets or clears the media session's enterpictureinpicture handler. Chrome calls
 * it when the user switches away from a tab that is using the camera or mic.
 * Returns false where the action is not supported.
 */
export function setAutoEnterPipHandler(handler: (() => void) | null): boolean {
  const session = pipMediaSession();
  if (!session) return false;
  try {
    session.setActionHandler("enterpictureinpicture", handler);
    return true;
  } catch {
    // TypeError where the browser does not know the action.
    return false;
  }
}

/**
 * Whether the browser accepts the enterpictureinpicture action. Probing clears
 * any handler already set, so call it before registering one.
 */
export function canAutoEnterPip(): boolean {
  return setAutoEnterPipHandler(null);
}
