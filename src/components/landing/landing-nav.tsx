"use client";

import Link from "next/link";
import { MenuIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Platform", href: "#platform" },
  { label: "LogIQ", href: "#logiq" },
  { label: "Integrations", href: "#integrations" },
  { label: "FAQ", href: "#faq" },
] as const;

export function LandingNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--landing-border)] bg-[var(--landing-bg)]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link
          href="/"
          className="landing-display flex items-center gap-2.5 text-[15px] font-semibold tracking-[-0.02em] text-[var(--landing-ink)]"
        >
          <span
            aria-hidden
            className="flex size-7 items-center justify-center rounded-md bg-[var(--landing-accent)] text-xs font-bold text-white"
          >
            LQ
          </span>
          LogIQ WMS
        </Link>

        <nav
          aria-label="Main"
          className="hidden items-center gap-8 md:flex"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-[var(--landing-ink-muted)] transition-colors hover:text-[var(--landing-ink)]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/sign-in"
            className="rounded-lg px-3.5 py-2 text-sm font-medium text-[var(--landing-ink-muted)] transition-colors hover:text-[var(--landing-ink)]"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="rounded-lg bg-[var(--landing-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--landing-accent-hover)]"
          >
            Start free trial
          </Link>
        </div>

        <button
          type="button"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          className="inline-flex size-10 items-center justify-center rounded-lg text-[var(--landing-ink-muted)] hover:bg-[var(--landing-surface)] md:hidden"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <XIcon className="size-5" /> : <MenuIcon className="size-5" />}
        </button>
      </div>

      <div
        id="mobile-nav"
        className={cn(
          "border-t border-[var(--landing-border)] bg-[var(--landing-bg)] md:hidden",
          open ? "block" : "hidden",
        )}
      >
        <nav aria-label="Mobile" className="flex flex-col gap-1 px-5 py-4">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2.5 text-sm text-[var(--landing-ink-muted)] hover:bg-[var(--landing-surface)] hover:text-[var(--landing-ink)]"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <div className="mt-3 flex flex-col gap-2 border-t border-[var(--landing-border)] pt-4">
            <Link
              href="/sign-in"
              className="rounded-lg px-3 py-2.5 text-center text-sm font-medium text-[var(--landing-ink-muted)] hover:bg-[var(--landing-surface)]"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-lg bg-[var(--landing-accent)] px-3 py-2.5 text-center text-sm font-medium text-white"
            >
              Start free trial
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
