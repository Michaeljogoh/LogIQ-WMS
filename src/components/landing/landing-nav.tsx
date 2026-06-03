"use client";

import Link from "next/link";
import { ArrowRightIcon, MenuIcon, XIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { landingTransition, LANDING_DURATION } from "@/components/landing/landing-motion";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Platform", href: "#platform" },
  { label: "LogIQ", href: "#logiq" },
  { label: "Integrations", href: "#integrations" },
  { label: "FAQ", href: "#faq" },
] as const;

const navLinkClass =
  "rounded-full px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-white/10 hover:text-white";

export function LandingNav() {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  return (
    <motion.header
      className="sticky top-0 z-50 border-b border-[var(--landing-border)] bg-[var(--landing-bg)]/90 backdrop-blur-md"
      initial={reduceMotion ? false : { y: -12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={landingTransition(LANDING_DURATION.fast)}
    >
      <div className="relative flex h-16 w-full items-center px-3 sm:h-[4.25rem] sm:px-4">
        <Link
          href="/"
          className="landing-display relative z-10 flex shrink-0 items-center gap-2.5 text-[15px] font-bold tracking-[-0.02em] text-[var(--landing-ink)]"
        >
          <span
            aria-hidden
            className="flex size-7 items-center justify-center rounded-full bg-[var(--landing-accent)] text-xs font-bold text-white"
          >
            LQ
          </span>
          LogIQ WMS
        </Link>

        <nav
          aria-label="Main"
          className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 md:flex"
        >
          <div className="flex items-center gap-0.5 rounded-full border-2 border-[#0088f2] bg-[var(--landing-surface)] p-1">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className={navLinkClass}>
                {link.label}
              </a>
            ))}
            <Link href="/sign-in" className={navLinkClass}>
              Sign in
            </Link>
          </div>
        </nav>

        <div className="relative z-10 ml-auto hidden items-center md:flex">
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--landing-accent)] py-2.5 pl-2.5 pr-5 text-sm font-bold text-white transition-colors hover:bg-[var(--landing-accent-hover)]"
          >
            <span
              aria-hidden
              className="flex size-7 items-center justify-center rounded-full bg-white/95 text-[var(--landing-accent)]"
            >
              <ArrowRightIcon className="size-3.5 stroke-[2.5]" />
            </span>
            Start free trial
          </Link>
        </div>

        <button
          type="button"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          className="relative z-10 ml-auto inline-flex size-10 items-center justify-center rounded-full text-[var(--landing-ink-muted)] hover:bg-[var(--landing-surface)] md:ml-0 md:hidden"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <XIcon className="size-5" /> : <MenuIcon className="size-5" />}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id="mobile-nav"
            className="overflow-hidden border-t border-[var(--landing-border)] bg-[var(--landing-bg)] md:hidden"
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={landingTransition(LANDING_DURATION.fast)}
          >
        <nav aria-label="Mobile" className="flex flex-col gap-2 px-3 py-4">
          <div className="flex flex-col gap-0.5 rounded-2xl border-2 border-[#0088f2] bg-[var(--landing-surface)] p-1.5">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={cn(navLinkClass, "py-2.5")}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <Link
              href="/sign-in"
              className={cn(navLinkClass, "py-2.5")}
              onClick={() => setOpen(false)}
            >
              Sign in
            </Link>
          </div>
          <Link
            href="/sign-up"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--landing-accent)] py-3 text-sm font-bold text-white"
            onClick={() => setOpen(false)}
          >
            <span
              aria-hidden
              className="flex size-7 items-center justify-center rounded-full bg-white/95 text-[var(--landing-accent)]"
            >
              <ArrowRightIcon className="size-3.5 stroke-[2.5]" />
            </span>
            Start free trial
          </Link>
        </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.header>
  );
}
