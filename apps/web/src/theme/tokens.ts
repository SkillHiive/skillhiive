export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 56,
  giant: 72,
  screen: 100,
} as const;

export type SpacingToken = keyof typeof spacing;

export const radii = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  base: 14,
  lg: 14,
  xl: 16,
  xxl: 20,
  pill: 999,
} as const;

export const typography = {
  display: { size: 36, lineHeight: 40, letterSpacing: -1.3, weight: 800 },
  headline: { size: 24, lineHeight: 30, letterSpacing: -0.6, weight: 800 },
  title: { size: 22, lineHeight: 28, letterSpacing: -0.4, weight: 700 },
  subtitle: { size: 17, lineHeight: 22, letterSpacing: -0.1, weight: 700 },
  bodyLg: { size: 17, lineHeight: 24, letterSpacing: 0, weight: 400 },
  body: { size: 15, lineHeight: 22, letterSpacing: 0, weight: 400 },
  bodySm: { size: 13, lineHeight: 18, letterSpacing: 0.1, weight: 400 },
  label: { size: 13, lineHeight: 16, letterSpacing: 0.2, weight: 700 },
  caption: { size: 11, lineHeight: 14, letterSpacing: 0.3, weight: 600 },
} as const;

export type TypographyToken = keyof typeof typography;

const brand = {
  /** The one accent. Everything else here is a state, never decoration (G7). */
  primary: "#fffd01",
  primaryStrong: "#f2f000",
  primarySoft: "#fff8a3",
  info: "#1B7CE8",
  infoSoft: "#60A5FA",
  warning: "#F59E0B",
  danger: "#DC2626",
  success: "#22c55e",
} as const;

export const storyRingGradient = [brand.primarySoft, brand.primary, brand.primaryStrong] as const;

export interface ColorPalette {
  bg: {
    canvas: string;
    elevated: string;
    muted: string;
    primary: string;
    accentDim: string;
    transparency: string;
  };
  navbar: { text: string; activeText: string };
  surface: {
    primary: string;
    skillhive: string;
    secondary: string;
    raised: string;
    sunken: string;
  };
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    inverse: string;
    onTint: string;
    black: string;
    white: string;
    skillhive: string;
  };
  border: {
    subtle: string;
    strong: string;
    focus: string;
    primary: string;
    default: string;
  };
  tint: {
    primary: string;
    primaryStrong: string;
    primarySoft: string;
    accent: string;
    success: string;
    warning: string;
    danger: string;
  };
  overlay: { scrim: string; glassTint: string; press: string };
  brand: typeof brand;
  chat: {
    incomingBg: string;
    incomingText: string;
    outgoingBg: string;
    outgoingText: string;
    timestamp: string;
  };
}

export const lightPalette: ColorPalette = {
  navbar: { text: "#000000", activeText: "#000000" },
  bg: {
    canvas: "#FFFFFF",
    elevated: "#FFFFFF",
    muted: "#F4F4F6",
    primary: "#ffffff",
    accentDim: "#fdf8e7",
    transparency: "#FFFFFF",
  },
  surface: {
    primary: "#FFFFFF",
    skillhive: "#e9a422",
    secondary: "#F6F6F8",
    raised: "#FFFFFF",
    sunken: "#EFEFF3",
  },
  text: {
    primary: "#0F0F12",
    secondary: "#5A5A66",
    tertiary: "#94949F",
    inverse: "#FFFFFF",
    onTint: "#0F0F12",
    black: "#000000",
    white: "#ffffff",
    skillhive: "#e9a422",
  },
  border: {
    subtle: "rgba(15,15,18,0.07)",
    strong: "rgba(15,15,18,0.14)",
    focus: brand.primary,
    primary: "#e9a422",
    default: "#e0e0e0",
  },
  tint: {
    primary: brand.primary,
    primaryStrong: brand.primaryStrong,
    primarySoft: brand.primarySoft,
    accent: brand.info,
    success: brand.success,
    warning: brand.warning,
    danger: brand.danger,
  },
  overlay: {
    scrim: "rgba(10,10,14,0.45)",
    glassTint: "rgba(255,255,255,0.72)",
    press: "rgba(15,15,18,0.06)",
  },
  brand,
  chat: {
    incomingBg: "#F1F1F5",
    incomingText: "#0F0F12",
    outgoingBg: brand.primary,
    outgoingText: "#0F0F12",
    timestamp: "#94949F",
  },
};

export const darkPalette: ColorPalette = {
  navbar: { text: "#ffffff", activeText: "#000000" },
  bg: {
    canvas: "#0a0a0a",
    elevated: "#121212",
    muted: "#0a0a0a",
    primary: "#0a0a0a",
    accentDim: "#24280B",
    transparency: "#121212",
  },
  surface: {
    primary: "#121212",
    skillhive: "#FFFD01",
    secondary: "#171717",
    raised: "#1c1c1c",
    sunken: "#050505",
  },
  text: {
    primary: "#f5f5f5",
    secondary: "#a3a3a3",
    tertiary: "#737373",
    inverse: "#0a0a0a",
    onTint: "#0a0a0a",
    black: "#000000",
    white: "#ffffff",
    skillhive: "#fffd01",
  },
  border: {
    subtle: "#262626",
    strong: "#3f3f3f",
    focus: brand.primary,
    primary: "#fffd01",
    default: "#262626",
  },
  tint: {
    primary: brand.primary,
    primaryStrong: brand.primaryStrong,
    primarySoft: brand.primarySoft,
    accent: brand.infoSoft,
    success: brand.success,
    warning: brand.warning,
    danger: brand.danger,
  },
  overlay: {
    scrim: "rgba(0,0,0,0.72)",
    glassTint: "rgba(18,18,18,0.72)",
    press: "rgba(255,255,255,0.06)",
  },
  brand,
  chat: {
    incomingBg: "#1c1c1c",
    incomingText: "#f5f5f5",
    outgoingBg: brand.primary,
    outgoingText: "#0a0a0a",
    timestamp: "#737373",
  },
};

export const elevation = {
  none: "none",
  sm: "0 2px 6px rgba(0,0,0,0.06)",
  md: "0 6px 14px rgba(0,0,0,0.10)",
  lg: "0 10px 24px rgba(0,0,0,0.16)",
} as const;

export type ElevationToken = keyof typeof elevation;
