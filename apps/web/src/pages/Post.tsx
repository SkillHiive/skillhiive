import { useLocation, useNavigate, useParams } from "react-router";
import { PostView } from "@/components/post/PostView";

/**
 * A post on its own page (A): a shared link, a refresh, or opened from anywhere but the
 * feed. One focused column under the fixed nav. From the feed, the same content opens
 * in a sheet instead (components/post/PostSheet.tsx).
 */
export default function Post() {
  const { postId = "" } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const focusComment = !!(location.state as { focusComment?: boolean } | null)?.focusComment;

  return (
    <div
      className="min-h-screen bg-[var(--color-bg-muted)] text-[var(--color-text-primary)]"
      style={{ fontFamily: '"popreg", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' }}
    >
      <main className="mx-auto w-full max-w-[640px] px-4 pb-24 pt-[100px]">
        <PostView
          key={postId}
          postId={postId}
          variant="page"
          focusComment={focusComment}
          onDeleted={() => navigate("/feed", { replace: true })}
        />
      </main>
    </div>
  );
}
