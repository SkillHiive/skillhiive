// Native useTokens hook
import { useColorScheme } from "react-native";
import { lightPalette, darkPalette, type ColorPalette } from "@skillhiive/brand";
import { spacing } from "@skillhiive/brand";
import { radii } from "@skillhiive/brand";
import { typographyNative } from "@skillhiive/brand";
import { elevation } from "@skillhiive/brand";

export interface NativeTokens {
  mode: "light" | "dark";
  colors: ColorPalette;
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typographyNative;
  elevation: typeof elevation;
}

export function useTokens(): NativeTokens {
  const colorScheme = useColorScheme();
  const mode = colorScheme === "light" ? "light" : "dark";
  const palette = mode === "dark" ? darkPalette : lightPalette;

  return {
    mode,
    colors: palette,
    spacing,
    radii,
    typography: typographyNative,
    elevation,
  };
}