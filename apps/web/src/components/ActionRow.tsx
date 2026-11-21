import { supabase } from "@/lib/supabase";
import { Check, Heart, MessageCircle, Share2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTokens } from "@/theme";
import { useAuth } from "@/hooks/useAuth";

export default function ActionRow({
  postId,
  likes,
  comments,
  onCommentPress,
  noborder,
}: {
  postId: string;
  likes: number;
  comments: number;
  onCommentPress?: (id: string) => void;
  noborder?: boolean;
}) {
  const { colors, spacing } = useTokens();
  // The session is read once for the whole app; asking the auth server per card was slow.
  const userId = useAuth()?.user.id ?? null;
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(likes);
  const [loading, setLoading] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!userId) return;
      const { data } = await supabase
        .from("likes")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!cancelled) setLiked(!!data);
    }
    void check();
    return () => {
      cancelled = true;
    };
  }, [postId, userId]);

  // The count from the server wins whenever the post is refetched, unless a like is
  // still on its way (then the optimistic count stays until it lands).
  const [serverLikes, setServerLikes] = useState(likes);
  if (likes !== serverLikes && !loading) {
    setServerLikes(likes);
    setLikeCount(likes);
  }

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
    };
  }, []);

  const handleLike = useCallback(
    async (e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (loading) return;
      if (!userId) return;
      setLoading(true);

      if (liked) {
        setLiked(false);
        setLikeCount((c) => Math.max(c - 1, 0));
        const { error } = await supabase
          .from("likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", userId);
        if (error) {
          setLiked(true);
          setLikeCount((c) => c + 1);
        }
      } else {
        setLiked(true);
        setLikeCount((c) => c + 1);
        const { error } = await supabase
          .from("likes")
          .insert({ post_id: postId, user_id: userId });
        if (error) {
          setLiked(false);
          setLikeCount((c) => Math.max(c - 1, 0));
        }
      }
      setLoading(false);
    },
    [liked, loading, postId, userId],
  );

  const handleShare = useCallback(
    async (e?: React.MouseEvent) => {
      e?.stopPropagation();
      const url = `${window.location.origin}/post/${postId}`;

      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(url);
        } else {
          const textarea = document.createElement("textarea");
          textarea.value = url;
          textarea.style.position = "fixed";
          textarea.style.opacity = "0";
          document.body.appendChild(textarea);
          textarea.focus();
          textarea.select();
          document.execCommand("copy");
          document.body.removeChild(textarea);
        }

        setCopied(true);
        if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
        copiedTimeoutRef.current = setTimeout(() => setCopied(false), 1800);
      } catch (err) {
        console.error("Failed to copy link:", err);
      }
    },
    [postId],
  );

  const pill = (active: boolean, key: string): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 13,
    fontWeight: active ? 600 : 400,
    border: "none",
    cursor: "pointer",
    color: active ? "#ef4444" : colors.text.tertiary,
    background:
      hover === key
        ? active
          ? "rgba(239,68,68,0.15)"
          : colors.surface.secondary
        : active
          ? "rgba(239,68,68,0.10)"
          : "transparent",
    fontFamily: "inherit",
  });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: `${spacing.sm}px ${spacing.base}px`,
        borderTop: noborder ? "none" : `1px solid ${colors.border.subtle}`,
      }}
    >
      <button
        onClick={handleLike}
        aria-pressed={liked}
        aria-label={liked ? "Unlike" : "Like"}
        onMouseEnter={() => setHover("like")}
        onMouseLeave={() => setHover(null)}
        className="ui-press"
        style={pill(liked, "like")}
      >
        {/* Re-keyed on each change so the heart pops when you like it. */}
        <Heart key={liked ? "on" : "off"} size={16} fill={liked ? "#ef4444" : "none"} className={liked ? "ui-pop" : undefined} />
        <span>{likeCount > 0 ? likeCount : "Like"}</span>
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onCommentPress?.(postId);
        }}
        onMouseEnter={() => setHover("comment")}
        onMouseLeave={() => setHover(null)}
        className="ui-press"
        style={pill(false, "comment")}
      >
        <MessageCircle size={16} />
        <span>{comments > 0 ? comments : "Comment"}</span>
      </button>

      <div style={{ flex: 1 }} />

      <div style={{ position: "relative" }}>
        <button
          onClick={handleShare}
          aria-label="Copy link"
          onMouseEnter={() => setHover("share")}
          onMouseLeave={() => setHover(null)}
          className="ui-press"
          style={{
            width: 30,
            height: 30,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
            color: copied ? "#22c55e" : colors.text.tertiary,
            background:
              hover === "share" ? colors.surface.secondary : "transparent",
            transition: "background 0.15s, color 0.15s",
          }}
        >
          {copied ? <Check size={14} /> : <Share2 size={14} />}
        </button>

        {/* Tooltip */}
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + 8px)",
            right: 0,
            padding: "6px 10px",
            borderRadius: 6,
            background: colors.surface.raised ?? "#1c1c1c",
            border: `1px solid ${colors.border.subtle}`,
            color: colors.text.primary,
            fontSize: 12,
            fontWeight: 500,
            whiteSpace: "nowrap",
            pointerEvents: "none",
            opacity: copied ? 1 : 0,
            transform: copied ? "translateY(0)" : "translateY(4px)",
            transition: "opacity 0.15s, transform 0.15s",
            zIndex: 20,
          }}
        >
          Link copied
        </div>
      </div>
    </div>
  );
}
