// Brand package - Design tokens as single source of truth

// Tokens
export * from "./src/tokens/spacing";
export * from "./src/tokens/radii";
export * from "./src/tokens/typography";
export * from "./src/tokens/colors";
export * from "./src/tokens/shadows";
export * from "./src/tokens/motion";
export * from "./src/tokens/breakpoints";
export * from "./src/tokens/zIndex";

// Web
export * from "./src/web/cssVariables";
export * from "./src/web/tailwind";
export { useWebTokens as useTokens } from "./src/hooks/useTokens";

// Native (separate entry point - not included in default export)
// export { useTokens as useTokensNative } from "./src/hooks/useTokens.native";