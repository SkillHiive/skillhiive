// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { canAutoEnterPip, closePipWindow, isDocumentPipSupported, openPipWindow } from "./documentPip";

interface FakeApi {
  window: Window | null;
  requestWindow: ReturnType<typeof vi.fn>;
}

function fakePipWindow(): Window {
  const doc = document.implementation.createHTMLDocument("");
  const events = new EventTarget();
  const win = {
    document: doc,
    closed: false,
    close() {
      win.closed = true;
      events.dispatchEvent(new Event("pagehide"));
    },
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
    dispatchEvent: events.dispatchEvent.bind(events),
  };
  return win as unknown as Window;
}

function installPip(request?: () => Promise<Window>): FakeApi {
  const api: FakeApi = {
    window: null,
    requestWindow: vi.fn(
      request ??
        (async () => {
          const win = fakePipWindow();
          api.window = win;
          win.addEventListener("pagehide", () => {
            api.window = null;
          });
          return win;
        }),
    ),
  };
  Object.defineProperty(window, "documentPictureInPicture", { configurable: true, value: api });
  return api;
}

function installMediaSession(setActionHandler: (action: string, handler: unknown) => void) {
  Object.defineProperty(navigator, "mediaSession", { configurable: true, value: { setActionHandler } });
}

afterEach(() => {
  closePipWindow();
  delete (window as { documentPictureInPicture?: unknown }).documentPictureInPicture;
  delete (navigator as { mediaSession?: unknown }).mediaSession;
  document.head.innerHTML = "";
  document.documentElement.className = "";
  document.documentElement.removeAttribute("style");
  document.documentElement.removeAttribute("data-theme");
  document.title = "";
});

describe("openPipWindow", () => {
  it("returns null where Document Picture-in-Picture is missing", async () => {
    expect(isDocumentPipSupported()).toBe(false);
    expect(await openPipWindow()).toBeNull();
  });

  it("copies styles, the html class and theme attributes into the new window", async () => {
    const api = installPip();
    document.head.innerHTML =
      '<style data-vite-dev-id="x">.a{color:red}</style><link rel="stylesheet" href="/assets/index.css"><link rel="icon" href="/icon.png">';
    document.documentElement.className = "dark";
    document.documentElement.setAttribute("data-theme", "dark");
    document.documentElement.setAttribute("style", "--accent: #22c55e");
    document.title = "Room";

    const win = await openPipWindow();
    expect(win).not.toBeNull();
    expect(api.requestWindow).toHaveBeenCalledWith({ width: 360, height: 240 });

    const doc = win!.document;
    expect(doc.head.querySelector("style")?.textContent).toBe(".a{color:red}");
    const links = Array.from(doc.head.querySelectorAll("link"), (l) => [l.getAttribute("rel"), l.getAttribute("href")]);
    expect(links).toEqual([["stylesheet", new URL("/assets/index.css", location.href).href]]);
    expect(doc.documentElement.className).toBe("dark");
    expect(doc.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(doc.documentElement.getAttribute("style")).toBe("--accent: #22c55e");
    expect(doc.body.style.margin).toBe("0px");
    expect(doc.body.style.height).toBe("100%");
    expect(doc.title).toBe("Room");
  });

  it("returns the open window instead of asking for a second one", async () => {
    const api = installPip();
    const first = await openPipWindow({ width: 400, height: 300 });
    const second = await openPipWindow();
    expect(second).toBe(first);
    expect(api.requestWindow).toHaveBeenCalledTimes(1);
    expect(api.requestWindow).toHaveBeenCalledWith({ width: 400, height: 300 });
  });

  it("returns null when the browser refuses", async () => {
    installPip(() => Promise.reject(new DOMException("No user activation", "NotAllowedError")));
    expect(await openPipWindow()).toBeNull();
  });
});

describe("canAutoEnterPip", () => {
  it("is false without a media session", () => {
    expect(canAutoEnterPip()).toBe(false);
  });

  it("is false when the action is unknown", () => {
    installMediaSession(() => {
      throw new TypeError("not a valid enum value");
    });
    expect(canAutoEnterPip()).toBe(false);
  });

  it("is true when the action is accepted", () => {
    const setActionHandler = vi.fn();
    installMediaSession(setActionHandler);
    expect(canAutoEnterPip()).toBe(true);
    expect(setActionHandler).toHaveBeenCalledWith("enterpictureinpicture", null);
  });
});
