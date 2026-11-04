// Tailwind config for brand tokens
import type { Config } from "tailwindcss";
import { spacing } from "../tokens/spacing";
import { radii } from "../tokens/radii";
import { typography } from "../tokens/typography";
import { lightPalette, darkPalette } from "../tokens/colors";
import { shadows } from "../tokens/shadows";
import { motion } from "../tokens/motion";
import { breakpoints } from "../tokens/breakpoints";
import { zIndex } from "../tokens/zIndex";

const tailwindConfig: Config = {
  theme: {
    extend: {
      colors: {
        // Light theme colors
        light: lightPalette,
        // Dark theme colors  
        dark: darkPalette,
        // Semantic aliases
        primary: {
          DEFAULT: lightPalette.tint.primary,
          strong: lightPalette.tint.primaryStrong,
          soft: lightPalette.tint.primarySoft,
        },
        skillhive: lightPalette.text.skillhive,
        surface: {
          primary: lightPalette.surface.primary,
          secondary: lightPalette.surface.secondary,
          raised: lightPalette.surface.raised,
          sunken: lightPalette.surface.sunken,
        },
        bg: {
          canvas: lightPalette.bg.canvas,
          elevated: lightPalette.bg.elevated,
          muted: lightPalette.bg.muted,
        },
        text: {
          primary: lightPalette.text.primary,
          secondary: lightPalette.text.secondary,
          tertiary: lightPalette.text.tertiary,
          inverse: lightPalette.text.inverse,
        },
        border: {
          subtle: lightPalette.border.subtle,
          strong: lightPalette.border.strong,
          focus: lightPalette.border.focus,
        },
      },
      spacing: spacing,
      borderRadius: radii,
      fontSize: {
        display: [typography.display.size, { lineHeight: typography.display.lineHeight, letterSpacing: typography.display.letterSpacing, fontWeight: typography.display.weight }],
        headline: [typography.headline.size, { lineHeight: typography.headline.lineHeight, letterSpacing: typography.headline.letterSpacing, fontWeight: typography.headline.weight }],
        title: [typography.title.size, { lineHeight: typography.title.lineHeight, letterSpacing: typography.title.letterSpacing, fontWeight: typography.title.weight }],
        subtitle: [typography.subtitle.size, { lineHeight: typography.subtitle.lineHeight, letterSpacing: typography.subtitle.letterSpacing, fontWeight: typography.subtitle.weight }],
        bodyLg: [typography.bodyLg.size, { lineHeight: typography.bodyLg.lineHeight, letterSpacing: typography.bodyLg.letterSpacing, fontWeight: typography.bodyLg.weight }],
        body: [typography.body.size, { lineHeight: typography.body.lineHeight, letterSpacing: typography.body.letterSpacing, fontWeight: typography.body.weight }],
        bodySm: [typography.bodySm.size, { lineHeight: typography.bodySm.lineHeight, letterSpacing: typography.bodySm.letterSpacing, fontWeight: typography.bodySm.weight }],
        label: [typography.label.size, { lineHeight: typography.label.lineHeight, letterSpacing: typography.label.letterSpacing, fontWeight: typography.label.weight }],
        caption: [typography.caption.size, { lineHeight: typography.caption.lineHeight, letterSpacing: typography.caption.letterSpacing, fontWeight: typography.caption.weight }],
      },
      boxShadow: shadows,
      transitionDuration: motion.duration,
      transitionTimingFunction: motion.easing,
      screens: {
        xs: `${breakpoints.xs}px`,
        sm: `${breakpoints.sm}px`,
        md: `${breakpoints.md}px`,
        lg: `${breakpoints.lg}px`,
        xl: `${breakpoints.xl}px`,
        xxl: `${breakpoints.xxl}px`,
      },
      zIndex: zIndex,
    },
  },
  darkMode: "class",
};

export default tailwindConfig;