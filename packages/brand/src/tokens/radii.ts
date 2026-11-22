// Radius tokens
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

export type RadiusToken = keyof typeof radii;
export type RadiusValue = (typeof radii)[RadiusToken];