'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ChatBubbleLeftRightIcon,
  FireIcon,
  ShieldCheckIcon,
  TruckIcon,
} from '@heroicons/react/24/outline';
import { EASE, DUR } from '@/components/customer/motion/primitives';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: DUR + 0.15, ease: EASE, delay } },
});

const TRUST_SIGNALS = [
  { icon: TruckIcon, label: 'Nationwide delivery' },
  { icon: ShieldCheckIcon, label: 'Manufacturer warranties' },
  { icon: ChatBubbleLeftRightIcon, label: 'Real human support' },
] as const;

export default function HomeHeroBanner() {
  return (
    <section
      aria-labelledby="home-hero-heading"
      className="relative isolate overflow-hidden bg-header text-header-foreground"
    >
      {/* Ambient brand glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: [
            'radial-gradient(ellipse 90% 70% at 75% 45%, rgba(201,25,25,0.45) 0%, transparent 55%)',
            'radial-gradient(ellipse 60% 50% at 15% 85%, rgba(240,200,0,0.18) 0%, transparent 50%)',
            'radial-gradient(ellipse 40% 30% at 50% 0%, rgba(255,212,0,0.12) 0%, transparent 45%)',
          ].join(', '),
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(135deg, #fff 0.5px, transparent 0.5px), linear-gradient(45deg, #fff 0.5px, transparent 0.5px)',
          backgroundSize: '28px 28px',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 top-1/2 h-[28rem] w-[28rem] -translate-y-1/2 rounded-full bg-primary/25 blur-3xl motion-safe:animate-pulse"
      />

      <div className="container relative grid items-center gap-10 py-12 md:grid-cols-[1fr_minmax(18rem,32rem)] md:gap-12 md:py-16 lg:py-20">
        <div className="max-w-xl">
          <motion.p
            {...fadeUp(0)}
            className="inline-flex items-center gap-2 rounded-full border border-secondary/30 bg-secondary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-secondary"
          >
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-secondary" />
            War on high prices
          </motion.p>

          <motion.h1
            id="home-hero-heading"
            {...fadeUp(0.08)}
            className="mt-5 text-balance text-3xl font-extrabold leading-[1.1] tracking-tight sm:text-4xl md:text-5xl lg:text-[3.25rem]"
          >
            Electronics &amp; Home Appliances,{' '}
            <span className="bg-gradient-to-r from-secondary via-chart-1 to-secondary bg-clip-text text-transparent">
              Delivered Across Guyana.
            </span>
          </motion.h1>

          <motion.p
            {...fadeUp(0.16)}
            className="mt-5 max-w-lg text-pretty text-base leading-relaxed text-header-foreground/85 md:text-lg"
          >
            Authentic products, manufacturer warranties, and real human support — every order.
          </motion.p>

          <motion.div {...fadeUp(0.24)} className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/categories"
              className="inline-flex min-h-11 items-center rounded-md bg-secondary px-6 py-3 text-sm font-bold text-accent-foreground shadow-lg shadow-secondary/25 transition-[transform,box-shadow,opacity] hover:-translate-y-0.5 hover:shadow-xl hover:shadow-secondary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-header"
            >
              Shop Categories
            </Link>
            <Link
              href="/deals"
              className="inline-flex min-h-11 items-center gap-2 rounded-md border-2 border-header-foreground/25 bg-header-foreground/5 px-6 py-3 text-sm font-semibold backdrop-blur-sm transition-[transform,background-color,border-color] hover:-translate-y-0.5 hover:border-primary hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-header-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-header"
            >
              <FireIcon className="h-5 w-5 text-secondary" aria-hidden="true" />
              Today&apos;s Deals
            </Link>
          </motion.div>

          <motion.ul
            {...fadeUp(0.32)}
            className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-header-foreground/75"
          >
            {TRUST_SIGNALS.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2">
                <Icon className="h-4 w-4 shrink-0 text-secondary" aria-hidden="true" />
                {label}
              </li>
            ))}
          </motion.ul>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1, transition: { duration: 0.55, ease: EASE, delay: 0.1 } }}
          className="relative mx-auto w-full max-w-md shrink-0 md:mx-0 md:max-w-lg"
        >
          <div
            aria-hidden="true"
            className="absolute -inset-6 rounded-3xl bg-gradient-to-br from-primary/50 via-secondary/25 to-transparent blur-3xl"
          />
          <div className="relative rounded-2xl bg-gradient-to-br from-white/[0.06] to-transparent p-4 ring-1 ring-white/10">
            <Image
              src="/logo.png"
              alt="War on Retail — electronics and home appliances in Guyana"
              width={875}
              height={426}
              priority
              sizes="(max-width: 768px) 90vw, 32rem"
              className="h-auto w-full drop-shadow-[0_24px_48px_rgba(201,25,25,0.55)]"
            />
          </div>
        </motion.div>
      </div>

      <div
        aria-hidden="true"
        className="h-1 w-full bg-gradient-to-r from-transparent via-primary to-transparent"
      />
    </section>
  );
}
