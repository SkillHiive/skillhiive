import type { MouseEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import { backTarget } from "@/lib/backNav";

/**
 * The one back control. Inside the app it goes back through history and reads
 * "← Back"; on a shared link or a new tab, where history would leave the site,
 * it goes to the parent page and names it ("← Feed"), so the label is always
 * where the click goes. It renders a real link, so middle-click and "open in
 * new tab" go to the parent page.
 */
export function BackLink({
  to,
  label,
  className = "",
  onImage = false,
}: {
  to: string;
  label: string;
  className?: string;
  /** Over a banner or photo: white text on a dark glass pill. */
  onImage?: boolean;
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const target = backTarget(location.key, to);

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    if (target.kind === "history") {
      event.preventDefault();
      navigate(-1);
    }
  }

  return (
    <Link
      to={to}
      replace
      onClick={onClick}
      className={`group inline-flex h-9 items-center gap-1.5 rounded-full text-sm font-medium transition-colors duration-[var(--dur-hover)] ${
        onImage
          ? "bg-black/45 px-3 text-white/90 backdrop-blur-sm hover:text-white"
          : "pr-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
      } ${className}`}
    >
      <ArrowLeft
        size={16}
        aria-hidden="true"
        className="transition-transform duration-[var(--dur-hover)] ease-[var(--ease-ui)] group-hover:-translate-x-0.5"
      />
      {target.kind === "history" ? "Back" : label}
    </Link>
  );
}
