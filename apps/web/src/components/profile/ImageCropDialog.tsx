import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Check, X } from "lucide-react";
import {
  PROFILE_IMAGE_ASPECT,
  PROFILE_IMAGE_WIDTH,
  initialCropBox,
  moveCropBox,
  resizeCropBox,
  toSourcePixels,
  type CropBox,
  type CropCorner,
  type ProfileImageKind,
} from "@/lib/imageCrop";

type Drag = { mode: "move" | "resize"; corner?: CropCorner; startX: number; startY: number; startBox: CropBox };

const CORNERS: { key: CropCorner; className: string }[] = [
  { key: "tl", className: "-left-2 -top-2 cursor-nwse-resize" },
  { key: "tr", className: "-right-2 -top-2 cursor-nesw-resize" },
  { key: "bl", className: "-bottom-2 -left-2 cursor-nesw-resize" },
  { key: "br", className: "-bottom-2 -right-2 cursor-nwse-resize" },
];

/** Crop a picked image to the avatar's or banner's shape, then hand back a JPEG. */
export function ImageCropDialog({
  kind,
  file,
  onClose,
  onConfirm,
  onError,
}: {
  kind: ProfileImageKind;
  file: File;
  onClose: () => void;
  /** Uploads the crop. The dialog stays open, showing progress, until it settles. */
  onConfirm: (blob: Blob) => Promise<void>;
  /** The crop itself failed (the image couldn't be drawn). */
  onError: (error: unknown) => void;
}) {
  const aspect = PROFILE_IMAGE_ASPECT[kind];
  const [src, setSrc] = useState<string | null>(null);
  const [shown, setShown] = useState({ w: 0, h: 0 });
  const [box, setBox] = useState<CropBox | null>(null);
  const [saving, setSaving] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const saveRef = useRef<HTMLButtonElement>(null);
  const drag = useRef<Drag | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    // The object URL exists only once the effect runs, so it is set from here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Fit the crop box to the image as shown, and again if the window resizes it.
  const fit = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    const { width, height } = img.getBoundingClientRect();
    if (!width || !height) return;
    setShown({ w: width, h: height });
    setBox(initialCropBox(width, height, aspect));
  }, [aspect]);

  useEffect(() => {
    const img = imgRef.current;
    if (!img || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => fit());
    observer.observe(img);
    return () => observer.disconnect();
  }, [fit, src]);

  useEffect(() => {
    if (box) saveRef.current?.focus();
  }, [box]);

  function onDialogKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape" && !saving) {
      event.stopPropagation();
      onClose();
    }
  }

  function onBoxKeyDown(event: KeyboardEvent) {
    if (!box) return;
    const step = event.shiftKey ? 20 : 5;
    const dx = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
    const dy = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
    if (!dx && !dy) return;
    event.preventDefault();
    setBox(moveCropBox(box, dx, dy, shown.w, shown.h));
  }

  function startDrag(event: PointerEvent, mode: Drag["mode"], corner?: CropCorner) {
    if (!box || saving) return;
    event.stopPropagation();
    (event.target as Element).setPointerCapture?.(event.pointerId);
    drag.current = { mode, corner, startX: event.clientX, startY: event.clientY, startBox: box };
  }

  function onPointerMove(event: PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const dx = event.clientX - d.startX;
    const dy = event.clientY - d.startY;
    setBox(
      d.mode === "move"
        ? moveCropBox(d.startBox, dx, dy, shown.w, shown.h)
        : resizeCropBox(d.startBox, d.corner ?? "br", dx, aspect, shown.w, shown.h),
    );
  }

  async function save() {
    const img = imgRef.current;
    if (!box || !img) return;
    setSaving(true);
    try {
      const outW = PROFILE_IMAGE_WIDTH[kind];
      const outH = Math.round(outW / aspect);
      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unavailable");
      const s = toSourcePixels(box, shown, { w: img.naturalWidth, h: img.naturalHeight });
      ctx.drawImage(img, s.x, s.y, s.w, s.h, 0, 0, outW, outH);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
      if (!blob) throw new Error("Couldn't read the image");
      await onConfirm(blob);
    } catch (error) {
      onError(error);
    } finally {
      setSaving(false);
    }
  }

  const title = kind === "avatar" ? "Avatar" : "Banner";

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/65 p-4"
      onClick={() => !saving && onClose()}
      onKeyDown={onDialogKeyDown}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="ui-rise w-full max-w-[520px] rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-muted)] p-4 sm:p-5"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-extrabold text-[var(--color-text-primary)]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            className="ui-press inline-flex size-9 items-center justify-center rounded-full text-[var(--color-text-tertiary)] hover:bg-[var(--color-overlay-press)] disabled:opacity-50"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div
          className="flex items-center justify-center overflow-hidden rounded-xl bg-black"
          style={{ height: "min(340px, 55vh)", touchAction: "none" }}
        >
          {src && (
            <div
              className="relative overflow-hidden"
              style={{ lineHeight: 0, maxWidth: "100%", maxHeight: "100%" }}
              onPointerMove={onPointerMove}
              onPointerUp={() => (drag.current = null)}
              onPointerCancel={() => (drag.current = null)}
            >
              <img
                ref={imgRef}
                src={src}
                alt=""
                onLoad={fit}
                draggable={false}
                className="block select-none"
                style={{ maxWidth: "100%", maxHeight: "min(340px, 55vh)" }}
              />
              {box && (
                <div
                  role="group"
                  tabIndex={0}
                  aria-label="Crop area"
                  onKeyDown={onBoxKeyDown}
                  onPointerDown={(e) => startDrag(e, "move")}
                  className="absolute cursor-grab border-2 border-[#fffd01] active:cursor-grabbing"
                  style={{
                    left: box.x,
                    top: box.y,
                    width: box.w,
                    height: box.h,
                    borderRadius: kind === "avatar" ? "50%" : 4,
                    boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
                  }}
                >
                  {CORNERS.map((c) => (
                    <span
                      key={c.key}
                      aria-hidden="true"
                      onPointerDown={(e) => startDrag(e, "resize", c.key)}
                      className={`absolute size-4 rounded-full border-2 border-black bg-[#fffd01] ${c.className}`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="ui-press inline-flex h-10 items-center rounded-full border border-[var(--color-border-strong)] px-4 text-sm font-semibold text-[var(--color-text-primary)] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            ref={saveRef}
            type="button"
            onClick={() => void save()}
            disabled={!box || saving}
            className="ui-press inline-flex h-10 items-center gap-2 rounded-full bg-[var(--color-tint-primary)] px-4 text-sm font-semibold text-[var(--color-text-onTint)] disabled:opacity-60"
          >
            {saving ? (
              <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Check size={16} aria-hidden="true" />
            )}
            {saving ? "Saving" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
