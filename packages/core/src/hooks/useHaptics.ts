// Haptics hook - MUST be implemented by platform
export type HapticType = "light" | "medium" | "heavy" | "success" | "warning" | "error" | "selection";

/**
 * Platform haptics hook.
 * MUST be implemented by platform-specific file (.web.ts or .native.ts)
 * This base implementation throws to enforce platform implementation.
 */
export function useHaptics() {
  const trigger = (type: HapticType = "light") => {
    throw new Error(
      `useHaptics.trigger("${type}") not implemented. ` +
      `Create useHaptics.web.ts or useHaptics.native.ts in your app.`
    );
  };
  
  const impact = (style: "light" | "medium" | "heavy") => {
    throw new Error(
      `useHaptics.impact("${style}") not implemented. ` +
      `Create useHaptics.web.ts or useHaptics.native.ts in your app.`
    );
  };
  
  const notification = (type: "success" | "warning" | "error") => {
    throw new Error(
      `useHaptics.notification("${type}") not implemented. ` +
      `Create useHaptics.web.ts or useHaptics.native.ts in your app.`
    );
  };
  
  const selection = () => {
    throw new Error(
      `useHaptics.selection() not implemented. ` +
      `Create useHaptics.web.ts or useHaptics.native.ts in your app.`
    );
  };
  
  return { trigger, impact, notification, selection };
}