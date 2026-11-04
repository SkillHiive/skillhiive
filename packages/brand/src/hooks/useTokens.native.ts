// Native useTokens hook (re-export from colorScheme)
import { useColorSchemePalette, useTokens as useNativeTokens } from "../native/colorScheme";
import { spacing } from "../tokens/spacing";
import { radii } from "../tokens/radii";
import { typographyNative } from "../tokens/typography";
import { elevation } from "../tokens/shadows";

export interface NativeTokens {
  mode: "light" | "dark";
  colors: ReturnType<typeof useNativeTokens>["colors"];
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typographyNative;
  elevation: typeof elevation;
}

export function useTokens(): NativeTokens {
  const { colorScheme, palette } = useColorSchemePalette();
  
  return {
    mode: colorScheme,
    colors: palette,
    spacing,
    radii,
    typography: typographyNative,
    elevation,
  };
}