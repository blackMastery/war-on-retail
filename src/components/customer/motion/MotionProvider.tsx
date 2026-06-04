'use client';

import { MotionConfig } from 'framer-motion';

/**
 * Wraps the customer tree so every Framer Motion component respects the user's
 * OS "Reduce motion" setting.
 *
 * This matters because Framer Motion animates via inline-style transforms,
 * which the CSS `@media (prefers-reduced-motion)` guard in globals.css does NOT
 * cover (that guard only zeroes CSS `transition`/`animation` durations).
 * `reducedMotion="user"` makes Motion drop transform/layout animations (while
 * keeping opacity) when the user asks for less motion.
 *
 * Server children pass straight through — this is just a context provider.
 */
export default function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
