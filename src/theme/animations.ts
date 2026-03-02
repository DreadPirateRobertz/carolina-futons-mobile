/**
 * Spring animation configurations for interactive elements.
 * Used with react-native-reanimated withSpring().
 */
import type { WithSpringConfig } from 'react-native-reanimated';

/** Snappy press feedback — subtle scale-down on press, spring back on release */
export const PRESS_SPRING: WithSpringConfig = {
  damping: 15,
  stiffness: 300,
};

/** Bouncy pop — used for wishlist toggle, add-to-cart confirmations */
export const POP_SPRING: WithSpringConfig = {
  damping: 12,
  stiffness: 250,
};

/** Smooth settle — used for cards returning to rest after press */
export const SETTLE_SPRING: WithSpringConfig = {
  damping: 20,
  stiffness: 200,
};

/** Scale values for press interactions */
export const PRESS_SCALE = {
  /** Button press: subtle squeeze */
  button: 0.97,
  /** Card press: lighter squeeze */
  card: 0.98,
  /** Icon press: more dramatic for small targets */
  icon: 0.85,
  /** Rest state */
  rest: 1,
} as const;
