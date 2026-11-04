// Typography tokens
export const typography = {
  display: { size: 44, lineHeight: 50, letterSpacing: -1.4, weight: 800 },
  headline: { size: 30, lineHeight: 36, letterSpacing: -0.7, weight: 800 },
  title: { size: 22, lineHeight: 28, letterSpacing: -0.4, weight: 700 },
  subtitle: { size: 17, lineHeight: 22, letterSpacing: -0.1, weight: 700 },
  bodyLg: { size: 17, lineHeight: 24, letterSpacing: 0, weight: 400 },
  body: { size: 15, lineHeight: 22, letterSpacing: 0, weight: 400 },
  bodySm: { size: 13, lineHeight: 18, letterSpacing: 0.1, weight: 400 },
  label: { size: 13, lineHeight: 16, letterSpacing: 0.2, weight: 700 },
  caption: { size: 11, lineHeight: 14, letterSpacing: 0.3, weight: 600 },
} as const;

export type TypographyToken = keyof typeof typography;
export type TypographyValue = (typeof typography)[TypographyToken];

// Native typography (weight as string)
export const typographyNative = {
  display: { fontSize: 44, lineHeight: 50, letterSpacing: -1.4, fontWeight: "800" as const },
  headline: { fontSize: 30, lineHeight: 36, letterSpacing: -0.7, fontWeight: "800" as const },
  title: { fontSize: 22, lineHeight: 28, letterSpacing: -0.4, fontWeight: "700" as const },
  subtitle: { fontSize: 17, lineHeight: 22, letterSpacing: -0.1, fontWeight: "700" as const },
  bodyLg: { fontSize: 17, lineHeight: 24, letterSpacing: 0, fontWeight: "400" as const },
  body: { fontSize: 15, lineHeight: 22, letterSpacing: 0, fontWeight: "400" as const },
  bodySm: { fontSize: 13, lineHeight: 18, letterSpacing: 0.1, fontWeight: "400" as const },
  label: { fontSize: 13, lineHeight: 16, letterSpacing: 0.2, fontWeight: "700" as const },
  caption: { fontSize: 11, lineHeight: 14, letterSpacing: 0.3, fontWeight: "600" as const },
} as const;

export type TypographyNativeToken = keyof typeof typographyNative;
export type TypographyNativeValue = (typeof typographyNative)[TypographyNativeToken];