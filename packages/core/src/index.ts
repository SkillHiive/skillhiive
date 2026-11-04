// Core package - Platform-agnostic logic
// Platform-specific implementations go in .web.ts / .native.ts files

export * from "./rhythm";
export * from "./auth";
export * from "./room";
export * from "./timer";
export * from "./storage";

// Hooks (platform entry points - throw if not implemented)
export { usePermissions } from "./hooks/usePermissions";
export { useHaptics } from "./hooks/useHaptics";
export { useMedia } from "./hooks/useMedia";
export { useKeyboard } from "./hooks/useKeyboard";
export { useFocusMode } from "./hooks/useFocusMode";
export { useAppLifecycle } from "./hooks/useAppLifecycle";