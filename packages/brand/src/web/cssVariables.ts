// CSS Variables for web
import { lightPalette, darkPalette } from "../tokens/colors";

export function generateCSSVariables(): string {
  const light = lightPalette;
  const dark = darkPalette;

  let css = ":root {\n";
  
  // Light theme (default)
  for (const [category, values] of Object.entries(light)) {
    if (typeof values === "object" && values !== null) {
      for (const [key, value] of Object.entries(values)) {
        if (typeof value === "string" || typeof value === "number") {
          css += `  --color-${category}-${key}: ${value};\n`;
        }
      }
    }
  }
  
  css += "}\n\n";
  
  // Dark theme
  css += "@media (prefers-color-scheme: dark) {\n";
  css += "  :root {\n";
  for (const [category, values] of Object.entries(dark)) {
    if (typeof values === "object" && values !== null) {
      for (const [key, value] of Object.entries(values)) {
        if (typeof value === "string" || typeof value === "number") {
          css += `    --color-${category}-${key}: ${value};\n`;
        }
      }
    }
  }
  css += "  }\n";
  css += "}\n";
  
  // Manual dark class
  css += "\n.dark {\n";
  for (const [category, values] of Object.entries(dark)) {
    if (typeof values === "object" && values !== null) {
      for (const [key, value] of Object.entries(values)) {
        if (typeof value === "string" || typeof value === "number") {
          css += `  --color-${category}-${key}: ${value};\n`;
        }
      }
    }
  }
  css += "}\n";

  // Manual light class: wins over the dark media query when someone picks Light on a dark OS.
  css += "\n.light {\n";
  for (const [category, values] of Object.entries(light)) {
    if (typeof values === "object" && values !== null) {
      for (const [key, value] of Object.entries(values)) {
        if (typeof value === "string" || typeof value === "number") {
          css += `  --color-${category}-${key}: ${value};\n`;
        }
      }
    }
  }
  css += "}\n";
  
  return css;
}

// Spacing CSS variables
import { spacing } from "../tokens/spacing";
import { radii } from "../tokens/radii";
import { typography } from "../tokens/typography";
import { shadows } from "../tokens/shadows";
import { motion } from "../tokens/motion";
import { breakpoints } from "../tokens/breakpoints";
import { zIndex } from "../tokens/zIndex";

export function generateAllCSSVariables(): string {
  let css = generateCSSVariables();
  
  css += "\n:root {\n";
  
  // Spacing
  for (const [key, value] of Object.entries(spacing)) {
    css += `  --spacing-${key}: ${value}px;\n`;
  }
  
  // Radii
  for (const [key, value] of Object.entries(radii)) {
    css += `  --radius-${key}: ${value}px;\n`;
  }
  
  // Typography
  for (const [key, value] of Object.entries(typography)) {
    css += `  --font-size-${key}: ${value.size}px;\n`;
    css += `  --line-height-${key}: ${value.lineHeight}px;\n`;
    css += `  --letter-spacing-${key}: ${value.letterSpacing}px;\n`;
    css += `  --font-weight-${key}: ${value.weight};\n`;
  }
  
  // Shadows
  for (const [key, value] of Object.entries(shadows)) {
    css += `  --shadow-${key}: ${value};\n`;
  }
  
  // Motion durations
  for (const [key, value] of Object.entries(motion.duration)) {
    css += `  --duration-${key}: ${value}ms;\n`;
  }
  
  // Z-index
  for (const [key, value] of Object.entries(zIndex)) {
    css += `  --z-${key}: ${value};\n`;
  }
  
  css += "}\n";
  
  return css;
}