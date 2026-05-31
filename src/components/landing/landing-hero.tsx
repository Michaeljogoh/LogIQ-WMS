import Link from "next/link";
import { ArrowRightIcon, PlayIcon } from "lucide-react";
import { LandingProductPreview } from "./landing-product-preview";

export function LandingHero() {
  return (
    <section className="relative overflow-hidden px-5 pb-20 pt-16 sm:px-8 sm:pb-28 sm:pt-20">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,var(--landing-glow),transparent)]"
      />

      <div className="relative mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="landing-fade-up landing-display mb-5 text-sm font-medium text-[var(--landing-accent)]">
            Warehouse OS for modern 3PLs
          </p>

          <h1 className="landing-fade-up landing-fade-up-delay-1 landing-display text-balance text-[clamp(2.25rem,5vw,3.75rem)] font-semibold leading-[1.08] tracking-[-0.03em] text-[var(--landing-ink)]">
            Run fulfillment at scale. Catch problems before they ship.
          </h1>

          <p className="landing-fade-up landing-fade-up-delay-2 mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-[var(--landing-ink-muted)] sm:text-xl">
            LogIQ WMS unifies inventory, outbound, merchant billing, and
            client portals for third-party logistics operators, with an AI
            layer that monitors your warehouse and answers questions in plain
            English.
          </p>

          <div className="landing-fade-up landing-fade-up-delay-3 mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/sign-up"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--landing-accent)] px-6 text-sm font-semibold text-white transition-colors hover:bg-[var(--landing-accent-hover)] sm:w-auto"
            >
              Start free trial
              <ArrowRightIcon className="size-4" aria-hidden />
            </Link>
            <a
              href="#platform"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-[var(--landing-border)] bg-[var(--landing-surface)] px-6 text-sm font-semibold text-[var(--landing-ink)] transition-colors hover:bg-[var(--landing-surface-raised)] sm:w-auto"
            >
              <PlayIcon className="size-4 text-[var(--landing-accent)]" aria-hidden />
              See the platform
            </a>
          </div>

          <p className="mt-5 text-sm text-[var(--landing-ink-subtle)]">
            No credit card required · Setup in under an hour · SOC 2 ready architecture
          </p>
        </div>

        <div className="landing-fade-up landing-fade-up-delay-3 mt-16 sm:mt-20">
          <LandingProductPreview />
        </div>
      </div>
    </section>
  );
}
