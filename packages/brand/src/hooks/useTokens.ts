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

export function useWebTokens(theme: "light" | "dark" | "system" = "system"): WebTokens {
  const [systemDark, setSystemDark] = useState<boolean>(systemPrefersDark);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mql.addEventListener?.("change", handler);
    return () => mql.removeEventListener?.("change", handler);
  }, []);

  const mode: ResolvedMode = theme === "system" ? (systemDark ? "dark" : "light") : theme;

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