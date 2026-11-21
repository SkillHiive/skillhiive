import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Camera } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { uploadProfileImage } from "@/lib/profiles";
import { useToast } from "@/lib/toast";
import type { ProfileImageKind } from "@/lib/imageCrop";
import { ImageCropDialog } from "./ImageCropDialog";

/**
 * Your avatar or banner, changeable in place: hover or focus shows a camera, a
 * picked image opens the crop dialog, and Save uploads it. For anyone else it is
 * just the picture.
 */
export function EditableImage({
  kind,
  editable,
  radius,
  onSaved,
  className = "",
  style,
  children,
}: {
  kind: ProfileImageKind;
  editable: boolean;
  /** The picture's corner radius, so the hover shade matches its shape. */
  radius: CSSProperties["borderRadius"];
  onSaved: (url: string) => void;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const { profile, updateField } = useProfile();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  if (!editable || !profile) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }

  const what = kind === "avatar" ? "avatar" : "banner";
  const userId = profile.id;

  function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast("Pick an image file.", { tone: "error" });
      return;
    }
    setPicked(file);
  }

  async function save(blob: Blob) {
    setUploading(true);
    try {
      const url = await uploadProfileImage(userId, kind, blob);
      const result = await updateField(kind, url);
      if (!result.ok) {
        toast(result.error, { tone: "error" });
        return;
      }
      onSaved(url);
      setPicked(null);
      toast(kind === "avatar" ? "Avatar updated" : "Banner updated");
    } catch {
      toast(`Couldn't upload your ${what}. Try again.`, { tone: "error" });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={className} style={style}>
      <button
        type="button"
        aria-label={`Change ${what}`}
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="group relative block size-full cursor-pointer border-0 bg-transparent p-0 text-left"
        style={{ borderRadius: radius }}
      >
        {children}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity duration-[var(--dur-hover)] ease-[var(--ease-ui)] group-hover:opacity-100 group-focus-visible:opacity-100"
          style={{ borderRadius: radius }}
        >
          <span className="inline-flex size-9 items-center justify-center rounded-full bg-black/55 text-white">
            <Camera size={16} />
          </span>
        </span>
        {/* No hover on touch screens: a small badge says the picture can change. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute hidden size-7 items-center justify-center rounded-full border-2 border-[var(--color-bg-muted)] bg-black/65 text-white [@media(hover:none)]:inline-flex"
          style={kind === "avatar" ? { right: -2, bottom: -2 } : { right: 8, bottom: 8 }}
        >
          <Camera size={13} />
        </span>
        {uploading && (
          <span
            role="status"
            aria-label="Uploading"
            className="absolute inset-0 flex items-center justify-center bg-black/50"
            style={{ borderRadius: radius }}
          >
            <span className="size-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          </span>
        )}
      </button>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={onPick} />
      {picked && (
        <ImageCropDialog
          kind={kind}
          file={picked}
          onClose={() => !uploading && setPicked(null)}
          onConfirm={save}
          onError={() => toast(`Couldn't read that image. Try another.`, { tone: "error" })}
        />
      )}
    </div>
  );
}
