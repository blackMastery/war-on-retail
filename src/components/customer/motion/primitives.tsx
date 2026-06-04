'use client';

import { motion, type Variants } from 'framer-motion';
import type { ElementType, ReactNode } from 'react';

/**
 * Shared motion vocabulary for the storefront. Keeping the timing/easing in one
 * place is what makes the polish feel "subtle & refined" rather than a grab-bag
 * of one-off animations.
 *
 * EASE is a soft ease-out (fast start, gentle settle, no overshoot). DUR is the
 * default ~250ms. Reduced-motion is handled globally by <MotionProvider>'s
 * MotionConfig, so these can be used freely.
 */
export const EASE = [0.22, 1, 0.36, 1] as const;
export const DUR = 0.25;

/** Fade + small rise, used by <Reveal> and the stagger children. */
const riseVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: DUR, ease: EASE } },
};

/**
 * Reveal-on-scroll wrapper. Fades + lifts its children into view once, just
 * before they enter the viewport. Accepts server children (it's only a
 * boundary). Use to give long pages a calm, sectioned cadence.
 */
export function Reveal({
  children,
  className,
  as = 'div',
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  delay?: number;
}) {
  const MotionTag = motion(as as ElementType);
  return (
    <MotionTag
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      variants={{
        hidden: { opacity: 0, y: 12 },
        show: { opacity: 1, y: 0, transition: { duration: DUR, ease: EASE, delay } },
      }}
    >
      {children}
    </MotionTag>
  );
}

const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.02 } },
};

/**
 * Staggered entrance container. Renders as the given element (so it can BE the
 * grid) and animates each direct child in with a small delay between them.
 *
 * Each child is wrapped in a `motion.div` carrying the rise variant — callers
 * just pass their (server-rendered) cards as children.
 */
export function StaggerIn({
  children,
  className,
  as = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: ElementType;
}) {
  const MotionTag = motion(as as ElementType);
  return (
    <MotionTag
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '0px 0px -8% 0px' }}
      variants={staggerContainer}
    >
      {children}
    </MotionTag>
  );
}

/** A single staggered child — wrap each grid item in this inside a <StaggerIn>. */
export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div className={className} variants={riseVariants}>
      {children}
    </motion.div>
  );
}
