// Web useTokens hook
import { useEffect, useState } from "react";
import { lightPalette, darkPalette, type ColorPalette } from "../tokens/colors";
import { spacing } from "../tokens/spacing";
import { radii } from "../tokens/radii";
import { typography } from "../tokens/typography";
import { elevation } from "../tokens/shadows";
import { shadows } from "../tokens/shadows";

export type ResolvedMode = "light" | "dark";

export interface WebTokens {
  mode: ResolvedMode;
  colors: ColorPalette;
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typography;
  elevation: typeof elevation;
  shadows: typeof shadows;
}

function systemPrefersDark(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return true;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** The theme the app chose, from the "light"/"dark" class it puts on <html>, if any. */
function documentTheme(): ResolvedMode | null {
  if (typeof document === "undefined") return null;
  const classes = document.documentElement.classList;
  if (classes.contains("dark")) return "dark";
  if (classes.contains("light")) return "light";
  return null;
}

export function useWebTokens(theme: "light" | "dark" | "system" = "system"): WebTokens {
  const [systemDark, setSystemDark] = useState<boolean>(systemPrefersDark);
  const [chosen, setChosen] = useState<ResolvedMode | null>(documentTheme);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mql.addEventListener?.("change", handler);
    return () => mql.removeEventListener?.("change", handler);
  }, []);

  // Follow the app's theme switch, so shared components match the page they sit on.
  useEffect(() => {
    if (typeof document === "undefined" || typeof MutationObserver === "undefined") return;
    const observer = new MutationObserver(() => setChosen(documentTheme()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const mode: ResolvedMode =
    theme !== "system" ? theme : (chosen ?? (systemDark ? "dark" : "light"));

  return {
    mode,
    colors: mode === "dark" ? darkPalette : lightPalette,
    spacing,
    radii,
    typography,
    elevation,
    shadows,
  };
}