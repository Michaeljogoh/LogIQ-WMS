import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { LandingReveal } from "@/components/landing/landing-reveal";
import { landingScaleIn } from "@/components/landing/landing-motion";

export function LandingCta() {
  return (
    <section className="px-5 pb-20 pt-4 sm:px-8 sm:pb-28">
      <div className="mx-auto max-w-6xl">
        <LandingReveal variants={landingScaleIn}>
          <div className="rounded-2xl border border-[var(--landing-border)] bg-[var(--landing-surface)] px-6 py-14 text-center sm:px-12 sm:py-16">
            <h2 className="landing-display mx-auto max-w-2xl text-balance text-[clamp(1.75rem,3.5vw,2.5rem)] font-semibold leading-[1.12] tracking-[-0.03em] text-[var(--landing-ink)]">
              Your warehouse should run ahead of problems, not behind them
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-pretty text-lg leading-relaxed text-[var(--landing-ink-muted)]">
              Start your free trial today. Connect a warehouse, onboard your first
              merchant, and ask LogIQ a question within the hour.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/sign-up"
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--landing-accent)] px-6 text-sm font-semibold text-white transition-colors hover:bg-[var(--landing-accent-hover)] active:scale-[0.98] sm:w-auto"
              >
                Start free trial
                <ArrowRightIcon className="size-4" aria-hidden />
              </Link>
              <Link
                href="/sign-in"
                className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-[var(--landing-border)] px-6 text-sm font-semibold text-[var(--landing-ink)] transition-colors hover:bg-[var(--landing-bg)] active:scale-[0.98] sm:w-auto"
              >
                Sign in to your account
              </Link>
            </div>
          </div>
        </LandingReveal>
      </div>
    </section>
  );
}
