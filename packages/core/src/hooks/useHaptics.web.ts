// Web useHaptics hook
export type HapticType = "light" | "medium" | "heavy" | "success" | "warning" | "error" | "selection";

/**
 * Web implementation of useHaptics using the Vibration API.
 * Note: Web vibration is limited compared to native.
 */
export function useHaptics() {
  const vibrate = (pattern: number | number[]) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  };

  const trigger = (type: HapticType = "light") => {
    const patterns: Record<HapticType, number | number[]> = {
      light: 10,
      medium: 20,
      heavy: 40,
      success: [10, 50, 10],
      warning: [20, 50, 20, 50, 20],
      error: [50, 50, 50],
      selection: 5,
    };
    vibrate(patterns[type]);
  };

  const impact = (style: "light" | "medium" | "heavy") => {
    const patterns = { light: 10, medium: 20, heavy: 40 };
    vibrate(patterns[style]);
  };

  const notification = (type: "success" | "warning" | "error") => {
    const patterns = {
      success: [10, 50, 10],
      warning: [20, 50, 20, 50, 20],
      error: [50, 50, 50],
    };
    vibrate(patterns[type]);
  };

  const selection = () => {
    vibrate(5);
  };

  return { trigger, impact, notification, selection };
}