// Shadow/elevation tokens (web)
export const shadows = {
  none: "none",
  sm: "0 2px 6px rgba(0,0,0,0.06)",
  md: "0 6px 14px rgba(0,0,0,0.10)",
  lg: "0 10px 24px rgba(0,0,0,0.16)",
} as const;

export type ShadowToken = keyof typeof shadows;
export type ShadowValue = (typeof shadows)[ShadowToken];

// Elevation tokens (native)
export const elevation = {
  none: {
    shadowOpacity: 0,
    elevation: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
  },
  sm: {
    shadowOpacity: 0.06,
    elevation: 2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  md: {
    shadowOpacity: 0.1,
    elevation: 4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  lg: {
    shadowOpacity: 0.16,
    elevation: 10,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
  },
} as const;

export type ElevationToken = keyof typeof elevation;
export type ElevationValue = (typeof elevation)[ElevationToken];