"use client";

import Link from "next/link";
import { ArrowRightIcon, PlayIcon } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import {
  landingFadeUp,
  landingSlideFromRight,
  landingStaggerContainer,
  landingTransition,
  LANDING_DURATION,
} from "@/components/landing/landing-motion";
import { LandingReveal } from "@/components/landing/landing-reveal";
import { LandingProductPreview } from "@/components/landing/landing-product-preview";
import { cn } from "@/lib/utils";

const HERO_IMAGE = "/images/landing/hero-warehouse.jpg";

const copyStagger = {
  ...landingStaggerContainer,
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.12,
    },
  },
};

export function LandingHero() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden px-5 pb-20 pt-12 sm:px-8 sm:pb-28 sm:pt-16">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[min(75vh,600px)] bg-[radial-gradient(ellipse_55%_50%_at_78%_35%,var(--landing-glow),transparent_72%)] opacity-70"
        initial={reduceMotion ? { opacity: 0.7 } : { opacity: 0 }}
        animate={{ opacity: 0.7 }}
        transition={landingTransition(LANDING_DURATION.slow)}
      />

      <div className="relative z-10 mx-auto max-w-6xl">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.05fr] lg:gap-12 xl:gap-14">
          <motion.div
            className="max-w-xl lg:max-w-none"
            initial={reduceMotion ? "visible" : "hidden"}
            animate="visible"
            variants={copyStagger}
          >
            <motion.p
              className="landing-display mb-5 text-sm font-medium text-[var(--landing-accent)]"
              variants={landingFadeUp}
              transition={landingTransition(LANDING_DURATION.fast)}
            >
              Warehouse OS for modern 3PLs
            </motion.p>

            <motion.h1
              className="landing-display text-balance text-[clamp(2rem,4.2vw,3.25rem)] font-semibold leading-[1.08] tracking-[-0.03em] text-[var(--landing-ink)]"
              variants={landingFadeUp}
              transition={landingTransition(LANDING_DURATION.base)}
            >
              Run fulfillment at scale. Catch problems before they ship.
            </motion.h1>

            <motion.p
              className="mt-6 text-pretty text-lg leading-relaxed text-[var(--landing-ink-muted)] sm:text-xl"
              variants={landingFadeUp}
              transition={landingTransition(LANDING_DURATION.base)}
            >
              LogIQ WMS unifies inventory, outbound, merchant billing, and
              client portals for third-party logistics operators, with an AI
              layer that monitors your warehouse and answers questions in plain
              English.
            </motion.p>

            <motion.div
              className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap"
              variants={landingFadeUp}
              transition={landingTransition(LANDING_DURATION.base)}
            >
              <Link
                href="/sign-up"
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--landing-accent)] px-6 text-sm font-semibold text-white transition-colors hover:bg-[var(--landing-accent-hover)] active:scale-[0.98] sm:w-auto"
              >
                Start free trial
                <ArrowRightIcon className="size-4" aria-hidden />
              </Link>
              <a
                href="#platform"
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-[var(--landing-border)] bg-[var(--landing-surface)] px-6 text-sm font-semibold text-[var(--landing-ink)] transition-colors hover:bg-[var(--landing-surface-raised)] active:scale-[0.98] sm:w-auto"
              >
                <PlayIcon
                  className="size-4 text-[var(--landing-accent)]"
                  aria-hidden
                />
                See the platform
              </a>
            </motion.div>

            <motion.p
              className="mt-5 text-sm text-[var(--landing-ink-subtle)]"
              variants={landingFadeUp}
              transition={landingTransition(LANDING_DURATION.fast)}
            >
              No credit card required · Setup in under an hour · SOC 2 ready
              architecture
            </motion.p>
          </motion.div>

          <motion.div
            className="relative w-full"
            initial={reduceMotion ? "visible" : "hidden"}
            animate="visible"
            variants={landingSlideFromRight}
            transition={{
              ...landingTransition(LANDING_DURATION.slow),
              delay: reduceMotion ? 0 : 0.2,
            }}
          >
            <div className="relative min-h-[280px] overflow-hidden rounded-2xl border border-[var(--landing-border)]/80 bg-[var(--landing-surface)] shadow-[0_28px_90px_-28px_var(--landing-glow)] sm:min-h-[340px] lg:min-h-[460px]">
              <Image
                alt="Automated warehouse with forklift and storage racks"
                className="scale-[1.03] object-cover object-[52%_58%] brightness-[1.12] contrast-[1.08] sm:object-[48%_55%]"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 52vw"
                src={HERO_IMAGE}
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-[var(--landing-bg)]/10" />
            </div>
          </motion.div>
        </div>

        <LandingReveal className={cn("mt-16 sm:mt-20")} delay={0.15}>
          <LandingProductPreview />
        </LandingReveal>
      </div>
    </section>
  );
}
