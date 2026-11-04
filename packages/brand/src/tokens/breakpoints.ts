// Breakpoint tokens
export const breakpoints = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  xxl: 1536,
} as const;

export type BreakpointToken = keyof typeof breakpoints;
export type BreakpointValue = (typeof breakpoints)[BreakpointToken];

// Media query helpers
export const mediaQuery = {
  xs: `(min-width: ${breakpoints.xs}px)`,
  sm: `(min-width: ${breakpoints.sm}px)`,
  md: `(min-width: ${breakpoints.md}px)`,
  lg: `(min-width: ${breakpoints.lg}px)`,
  xl: `(min-width: ${breakpoints.xl}px)`,
  xxl: `(min-width: ${breakpoints.xxl}px)`,
  // Max-width queries
  maxXs: `(max-width: ${breakpoints.sm - 1}px)`,
  maxSm: `(max-width: ${breakpoints.md - 1}px)`,
  maxMd: `(max-width: ${breakpoints.lg - 1}px)`,
  maxLg: `(max-width: ${breakpoints.xl - 1}px)`,
  maxXl: `(max-width: ${breakpoints.xxl - 1}px)`,
} as const;