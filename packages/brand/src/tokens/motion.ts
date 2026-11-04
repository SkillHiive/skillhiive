// Motion/animation tokens
export const motion = {
  duration: {
    instant: 80,
    fast: 140,
    base: 200,
    slow: 300,
    deliberate: 460,
  },
  easing: {
    linear: "linear",
    easeIn: "cubic-bezier(0.4, 0, 1, 1)",
    easeOut: "cubic-bezier(0, 0, 0.2, 1)",
    easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
    snappy: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  },
  spring: {
    snappy: { damping: 16, stiffness: 360, mass: 0.5 },
    gentle: { damping: 22, stiffness: 220, mass: 0.9 },
    bouncy: { damping: 10, stiffness: 200, mass: 0.7 },
  },
} as const;

export type MotionDurationToken = keyof typeof motion.duration;
export type MotionEasingToken = keyof typeof motion.easing;
export type MotionSpringToken = keyof typeof motion.spring;