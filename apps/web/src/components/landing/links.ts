import type { MouseEvent } from "react";

export const GITHUB_ORG_URL = "https://github.com/SkillHiive";
export const PLATFORM_REPO_URL = "https://github.com/SkillHiive/skillhiive";
export const LIVEKIT_REPO_URL = "https://github.com/SkillHiive/livekitSDK";
export const MIGRATIONS_URL = "https://github.com/SkillHiive/skillhiive/tree/main/apps/web/supabase/migrations";
export const STATUS_URL = "https://status.skillhiive.com";

/** In-page links scroll to their section, smoothly unless reduced motion is asked for. */
export function scrollToSection(id: string) {
  return (e: MouseEvent<HTMLAnchorElement>) => {
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
  };
}
