// Brand colors
export const brand = {
  primary: "#fffd01",
  coral: "#fffd01",
  coralStrong: "#fffd01",
  coralSoft: "#FB7185",
  magenta: "#fffd01",
  peach: "#FB923C",
  sky: "#1B7CE8",
  skySoft: "#60A5FA",
  warning: "#F59E0B",
  danger: "#DC2626",
  success: "#10B981",
} as const;

export type BrandColorToken = keyof typeof brand;
export type BrandColorValue = (typeof brand)[BrandColorToken];

// Story ring gradient
export const storyRingGradient = [brand.peach, brand.coral, brand.magenta] as const;

// Color palette interface (common structure for light/dark)
export interface ColorPalette {
  navbar: { text: string; activeText: string };
  bg: {
    canvas: string;
    elevated: string;
    muted: string;
    primary: string;
    accentDim: string;
    transparency: string;
  };
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
  overlay: {
    scrim: string;
    glassTint: string;
    press: string;
  };
  brand: typeof brand;
  chat: {
    incomingBg: string;
    incomingText: string;
    outgoingBg: string;
    outgoingText: string;
    timestamp: string;
  };
}

// Light palette
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
    focus: brand.coral,
    primary: "#e9a422",
    default: "#e0e0e0",
  },
  tint: {
    primary: brand.coral,
    primaryStrong: brand.coralStrong,
    primarySoft: brand.coralSoft,
    accent: brand.sky,
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
    outgoingBg: brand.coral,
    outgoingText: "#0F0F12",
    timestamp: "#94949F",
  },
} as const;

// Dark palette
export const darkPalette: ColorPalette = {
  navbar: { text: "#ffffff", activeText: "#000000" },
  bg: {
    canvas: "#1f1f1f",
    elevated: "#0e0e12",
    muted: "#15151B",
    primary: "#0A0A0A",
    accentDim: "#24280B",
    transparency: "#0e0e12",
  },
  surface: {
    primary: "#0E0E12",
    skillhive: "#FFFD01",
    secondary: "#15151B",
    raised: "#1B1B22",
    sunken: "#08080B",
  },
  text: {
    primary: "#F5F5F8",
    secondary: "#B6B6C0",
    tertiary: "#76767F",
    inverse: "#0F0F12",
    onTint: "#0F0F12",
    black: "#000000",
    white: "#ffffff",
    skillhive: "#fffd01",
  },
  border: {
    subtle: "rgba(255,255,255,0.08)",
    strong: "rgba(255,255,255,0.18)",
    focus: brand.coralSoft,
    primary: "#fffd01",
    default: "#343434",
  },
  tint: {
    primary: brand.coral,
    primaryStrong: brand.coralStrong,
    primarySoft: brand.coralSoft,
    accent: brand.skySoft,
    success: brand.success,
    warning: brand.warning,
    danger: brand.danger,
  },
  overlay: {
    scrim: "rgba(0,0,0,0.7)",
    glassTint: "rgba(20,20,26,0.6)",
    press: "rgba(255,255,255,0.06)",
  },
  brand,
  chat: {
    incomingBg: "#1B1B22",
    incomingText: "#F5F5F8",
    outgoingBg: brand.coral,
    outgoingText: "#0F0F12",
    timestamp: "#76767F",
  },
} as const;

export const colorPalette = {
  light: lightPalette,
  dark: darkPalette,
} as const;

export type ColorMode = keyof typeof colorPalette;