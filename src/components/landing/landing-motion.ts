/** Shared motion tokens — Emil-style ease-out, short durations, no bounce on marketing scroll. */
export const LANDING_EASE = [0.16, 1, 0.3, 1] as const;

export const LANDING_DURATION = {
  fast: 0.35,
  base: 0.55,
  slow: 0.7,
} as const;

export const landingFadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export const landingFadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export const landingScaleIn = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1 },
};

export const landingSlideFromRight = {
  hidden: { opacity: 0, x: 28 },
  visible: { opacity: 1, x: 0 },
};

export const landingStaggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.06,
    },
  },
};

export const landingViewport = {
  once: true,
  amount: 0.2,
  margin: "0px 0px -8% 0px",
} as const;

export function landingTransition(
  duration: number = LANDING_DURATION.base,
) {
  return { duration, ease: LANDING_EASE };
}
