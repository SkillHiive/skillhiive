import React from "react";
import { Link, useNavigate } from "react-router";
import { Briefcase, Handshake } from "lucide-react";
import { Avatar, Text } from "@skillhiive/ui";
import ActionRow from "@/components/ActionRow";
import { timeAgo } from "@/lib/timeAgo";
import { useTokens } from "@/theme";


export type ProjectStatus = "active" | "completed" | "paused";

export interface PostModel {
  id: string;
  user_id?: string;
  post_type: "project" | "media" | "offer";
  caption: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  profiles: {
    id?: string;
    username: string | null;
    avatar: string | null;
  } | null;
  project_posts: {
    title: string;
    description: string | null;
    started_at: string | null;
    ended_at: string | null;
    status: ProjectStatus;
  } | null;
  offer_posts: {
    company: string | null;
    role: string | null;
    salary_range: string | null;
    location: string | null;
    offer_type: string | null;
  } | null;
  post_images: { url: string; sort_order: number }[] | null;
}

const STATUS_DOT: Record<ProjectStatus, { label: string; color: string }> = {
  active: { label: "Active", color: "#22c55e" },
  completed: { label: "Done", color: "#3b82f6" },
  paused: { label: "Paused", color: "#f59e0b" },
};

const OFFER_LABELS: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  internship: "Internship",
  contract: "Contract",
};

/** Long words and links wrap instead of pushing the card wider than a phone. */
const WRAP: React.CSSProperties = { whiteSpace: "pre-wrap", overflowWrap: "anywhere", wordBreak: "break-word" };

function firstImage(post: PostModel): string | undefined {
  return [...(post.post_images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0]?.url;
}

/** Where an author's name goes: their public page by username, else by id. */
function authorHref(post: PostModel): string | null {
  const username = post.profiles?.username;
  if (username) return `/p/${encodeURIComponent(username)}`;
  const id = post.profiles?.id ?? post.user_id;
  return id ? `/profile/${id}` : null;
}


export function FeedCard({
  children,
  onPress,
}: {
  children: React.ReactNode;
  onPress?: () => void;
}) {
  const { colors, radii, spacing } = useTokens();
  return (
    <div
      onClick={onPress}
      // The card opens the post; it's reachable by keyboard like a link.
      tabIndex={onPress ? 0 : undefined}
      onKeyDown={
        onPress
          ? (e) => {
              if (e.key === "Enter" && e.target === e.currentTarget) onPress();
            }
          : undefined
      }
      className={`overflow-hidden border border-[var(--color-border-subtle)] ${onPress ? "ui-lift" : ""}`}
      style={{
        background: colors.surface.primary,
        borderRadius: radii.xl,
        marginBottom: spacing.md,
        cursor: onPress ? "pointer" : "default",
        maxWidth: "100%",
      }}
    >
      {children}
    </div>
  );
}

/** The kind of post, as a small quiet icon. Plain updates have none. */
function KindIcon({ post }: { post: PostModel }) {
  const { colors } = useTokens();
  const kind =
    post.post_type === "project"
      ? { Icon: Briefcase, label: "Project" }
      : post.post_type === "offer"
        ? { Icon: Handshake, label: "Offer" }
        : null;
  if (!kind) return null;
  return (
    <span title={kind.label} aria-label={kind.label} role="img" style={{ color: colors.text.tertiary, display: "inline-flex", flexShrink: 0 }}>
      <kind.Icon size={14} aria-hidden="true" />
    </span>
  );
}

function AuthorRow({ post, hideAuthor }: { post: PostModel; hideAuthor?: boolean }) {
  const { spacing } = useTokens();
  const name = post.profiles?.username ?? "unknown";
  const href = authorHref(post);
  const when = (
    <Text variant="bodySm" tone="tertiary" style={{ flexShrink: 0 }}>
      <time dateTime={post.created_at} title={new Date(post.created_at).toLocaleString()}>
        {timeAgo(post.created_at)}
      </time>
    </Text>
  );
  const who = (
    <>
      <Avatar name={name} source={post.profiles?.avatar} size={30} />
      <Text variant="bodySm" weight={700} numberOfLines={1}>
        {name}
      </Text>
    </>
  );

  return (
    <div style={{ display: "flex", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm, minWidth: 0 }}>
      {hideAuthor ? (
        <div style={{ flex: 1 }}>{when}</div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: spacing.sm, flex: 1, minWidth: 0 }}>
          {href ? (
            <Link
              to={href}
              onClick={(e) => e.stopPropagation()}
              className="flex min-w-0 items-center gap-2 rounded-full hover:underline"
            >
              {who}
            </Link>
          ) : (
            <span className="flex min-w-0 items-center gap-2">{who}</span>
          )}
          <Text variant="bodySm" tone="tertiary" aria-hidden="true">
            ·
          </Text>
          {when}
        </div>
      )}
      <KindIcon post={post} />
    </div>
  );
}

/** The person's own words: the loudest thing on the card. */
function Caption({ text }: { text: string }) {
  return (
    <Text as="p" variant="bodyLg" numberOfLines={8} style={{ ...WRAP, margin: 0 }}>
      {text}
    </Text>
  );
}

function PostImage({ src, alt }: { src: string; alt: string }) {
  const { colors, radii, spacing } = useTokens();
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      style={{
        display: "block",
        width: "100%",
        maxWidth: "100%",
        aspectRatio: "16 / 10",
        objectFit: "cover",
        marginTop: spacing.md,
        borderRadius: radii.lg,
        background: colors.surface.secondary,
      }}
    />
  );
}

interface CardProps {
  post: PostModel;
  myId?: string | null;
  hideAuthor?: boolean;
  onOpen?: (id: string) => void;
}

function useOpen(post: PostModel, onOpen?: (id: string) => void) {
  const navigate = useNavigate();
  return {
    open: () => (onOpen ? onOpen(post.id) : navigate(`/post/${post.id}`)),
    comment: () => navigate(`/post/${post.id}`, { state: { focusComment: true } }),
  };
}

function Actions({ post, onComment }: { post: PostModel; onComment: () => void }) {
  return <ActionRow postId={post.id} likes={post.likes_count} comments={post.comments_count} onCommentPress={onComment} />;
}


export function ProjectCard({ post, hideAuthor, onOpen }: CardProps) {
  const { spacing } = useTokens();
  const { open, comment } = useOpen(post, onOpen);
  const pp = post.project_posts!;
  const status = STATUS_DOT[pp.status] ?? STATUS_DOT.active;
  const img = firstImage(post);
  const caption = post.caption?.trim();

  return (
    <FeedCard onPress={open}>
      <div style={{ padding: spacing.base }}>
        <AuthorRow post={post} hideAuthor={hideAuthor} />

        {caption ? (
          <Caption text={caption} />
        ) : (
          <Text as="p" variant="subtitle" numberOfLines={2} style={{ ...WRAP, margin: 0 }}>
            {pp.title}
          </Text>
        )}

        {/* The project it's filed under, quiet: a status dot and its name. */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: spacing.sm, minWidth: 0 }}>
          <span
            title={status.label}
            aria-label={status.label}
            role="img"
            style={{ width: 6, height: 6, borderRadius: "50%", background: status.color, flexShrink: 0 }}
          />
          {caption && (
            <Text variant="bodySm" tone="tertiary" weight={600} numberOfLines={1}>
              {pp.title}
            </Text>
          )}
        </div>

        {img && <PostImage src={img} alt={pp.title} />}

        {pp.description && (
          <Text as="p" variant="bodySm" tone="secondary" numberOfLines={3} style={{ ...WRAP, margin: `${spacing.md}px 0 0` }}>
            {pp.description}
          </Text>
        )}
      </div>

      <Actions post={post} onComment={comment} />
    </FeedCard>
  );
}


export function OfferCard({ post, hideAuthor, onOpen }: CardProps) {
  const { colors, spacing, radii } = useTokens();
  const { open, comment } = useOpen(post, onOpen);
  const op = post.offer_posts!;
  const typeLabel = op.offer_type ? OFFER_LABELS[op.offer_type] ?? op.offer_type : null;
  const caption = post.caption?.trim();
  const details = [op.company, typeLabel, op.location, op.salary_range].filter(Boolean);

  return (
    <FeedCard onPress={open}>
      <div style={{ padding: spacing.base }}>
        <AuthorRow post={post} hideAuthor={hideAuthor} />

        {caption && <Caption text={caption} />}

        <div
          style={{
            border: `1px solid ${colors.border.subtle}`,
            borderRadius: radii.lg,
            padding: spacing.md,
            marginTop: caption ? spacing.md : 0,
          }}
        >
          <Text variant="subtitle" style={WRAP}>
            {op.role ?? "Role"}
          </Text>
          {details.length > 0 && (
            <Text as="p" variant="bodySm" tone="tertiary" style={{ ...WRAP, margin: `${spacing.xs}px 0 0` }}>
              {details.join(" · ")}
            </Text>
          )}
        </div>
      </div>

      <Actions post={post} onComment={comment} />
    </FeedCard>
  );
}


export function MediaCard({ post, hideAuthor, onOpen }: CardProps) {
  const { spacing } = useTokens();
  const { open, comment } = useOpen(post, onOpen);
  const img = firstImage(post);
  const caption = post.caption?.trim();

  return (
    <FeedCard onPress={open}>
      <div style={{ padding: spacing.base }}>
        <AuthorRow post={post} hideAuthor={hideAuthor} />
        {caption && <Caption text={caption} />}
        {img && <PostImage src={img} alt={caption ? caption.slice(0, 120) : ""} />}
      </div>

      <Actions post={post} onComment={comment} />
    </FeedCard>
  );
}

export function PostCard({ post, myId = null, hideAuthor, onOpen }: CardProps) {
  if (post.post_type === "project" && post.project_posts) return <ProjectCard post={post} myId={myId} hideAuthor={hideAuthor} onOpen={onOpen} />;
  if (post.post_type === "offer" && post.offer_posts) return <OfferCard post={post} myId={myId} hideAuthor={hideAuthor} onOpen={onOpen} />;
  // A plain update, or a post whose detail row is missing: still show what they wrote.
  return <MediaCard post={post} myId={myId} hideAuthor={hideAuthor} onOpen={onOpen} />;
}
