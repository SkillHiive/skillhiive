import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Bell } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import NotificationList from "@/components/NotificationList";
import { useNotifications } from "@/hooks/useNotifications";
import { useTokens } from "@/theme";

/** The bell in the top bar: a badge for requests waiting, and a short list to answer them. */
export default function NotificationBell() {
  const { colors } = useTokens();
  const navigate = useNavigate();
  const {
    pending,
    accepted,
    loading,
    error,
    actionError,
    acting,
    accept,
    decline,
    refresh,
    pendingCount,
    isAuthed,
  } = useNotifications();

  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!isAuthed) return null;

  const label =
    pendingCount > 0
      ? `Notifications, ${pendingCount} ${pendingCount === 1 ? "request" : "requests"} waiting`
      : "Notifications";

  return (
    <div ref={wrapRef} style={{ position: "relative" }} className="nav-block">
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls="notifications-panel"
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className="transition-ui hover:scale-[1.025] active:scale-[1]"
        style={{
          position: "relative",
          width: 44,
          height: 44,
          borderRadius: 16,
          border: "none",
          background: open || hover ? "rgba(255,253,1,0.12)" : "transparent",
          color: open ? "#fffd01" : colors.text.primary,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.2s cubic-bezier(0.2,0.8,0.2,1)",
          transform: hover ? "scale(1.05)" : "scale(1)",
        }}
      >
        <Bell
          size={20}
          strokeWidth={2}
          aria-hidden="true"
          fill={pendingCount > 0 ? "#fffd01" : "none"}
          color={pendingCount > 0 ? "#fffd01" : "currentColor"}
        />
        {pendingCount > 0 && (
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              top: 6,
              right: 6,
              minWidth: 16,
              height: 16,
              padding: pendingCount > 9 ? "0 4px" : 0,
              borderRadius: 8,
              background: "#fffd01",
              color: "#0f0f12",
              fontSize: 9,
              fontWeight: 800,
              lineHeight: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: `2px solid ${colors.bg.muted}`,
            }}
          >
            {pendingCount > 99 ? "99+" : pendingCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id="notifications-panel"
            role="dialog"
            aria-label="Notifications"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.2, 0.8, 0.2, 1] }}
            className="absolute right-0 top-[calc(100%+10px)] z-[1100] max-h-[70vh] w-[340px] max-w-[calc(100vw-16px)] overflow-y-auto rounded-3xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-muted)] text-[var(--color-text-primary)] shadow-2xl"
          >
            <div className="sticky top-0 flex items-center justify-between border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-muted)] px-4 py-3">
              <h2 className="text-base font-semibold">Notifications</h2>
              {pendingCount > 0 && (
                <span className="rounded-full bg-[var(--color-tint-primary)] px-2 py-0.5 text-xs font-semibold text-[var(--color-text-onTint)]">
                  {pendingCount} new
                </span>
              )}
            </div>

            <div className="p-3">
              <NotificationList
                pending={pending}
                accepted={accepted}
                loading={loading}
                error={error}
                actionError={actionError}
                acting={acting}
                accept={accept}
                decline={decline}
                onRetry={() => void refresh()}
                compact
                onNavigate={() => setOpen(false)}
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                navigate("/notifications");
              }}
              className="sticky bottom-0 w-full border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-muted)] py-3 text-sm font-semibold text-[var(--color-text-primary)]"
            >
              See all
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
