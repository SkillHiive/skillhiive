// Radius tokens
export const radii = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  base: 14,
  lg: 18,
  xl: 22,
  xxl: 28,
  pill: 999,
} as const;

export type RadiusToken = keyof typeof radii;
export type RadiusValue = (typeof radii)[RadiusToken];