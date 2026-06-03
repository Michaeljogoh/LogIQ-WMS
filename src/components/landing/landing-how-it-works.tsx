import {
  LandingReveal,
  LandingStagger,
  LandingStaggerItem,
} from "@/components/landing/landing-reveal";
import { landingFadeUp } from "@/components/landing/landing-motion";

const STEPS = [
  {
    step: "1",
    title: "Connect your operation",
    description:
      "Add warehouses, invite staff, and onboard merchant clients. Connect sales channels and carrier accounts in minutes.",
  },
  {
    step: "2",
    title: "Run fulfillment",
    description:
      "Receive inventory, pick and pack orders, print labels, and track shipments. Mobile workflows for floor staff included.",
  },
  {
    step: "3",
    title: "Let LogIQ watch",
    description:
      "The intelligence layer monitors velocity, SLAs, and carrier performance. Ask questions anytime, get alerts automatically.",
  },
] as const;

export function LandingHowItWorks() {
  return (
    <section className="border-t border-[var(--landing-border)] bg-[var(--landing-surface)] px-5 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <LandingReveal className="mb-14 max-w-xl">
          <h2 className="landing-display text-balance text-[clamp(1.75rem,3.5vw,2.5rem)] font-semibold leading-[1.12] tracking-[-0.03em] text-[var(--landing-ink)]">
            Live in hours, not quarters
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-[var(--landing-ink-muted)]">
            No six-month implementation. LogIQ WMS is built for operators who
            need to ship this week.
          </p>
        </LandingReveal>

        <LandingStagger as="ol" className="grid gap-8 md:grid-cols-3">
          {STEPS.map((item, index) => (
            <LandingStaggerItem key={item.step} as="li" variants={landingFadeUp} className="relative">
              {index < STEPS.length - 1 ? (
                <span
                  aria-hidden
                  className="absolute left-6 top-12 hidden h-px w-[calc(100%+2rem)] bg-[var(--landing-border)] md:block"
                />
              ) : null}
              <span className="landing-display mb-4 inline-flex size-12 items-center justify-center rounded-full border border-[var(--landing-border)] bg-[var(--landing-bg)] text-lg font-semibold text-[var(--landing-accent)]">
                {item.step}
              </span>
              <h3 className="landing-display mb-2 text-lg font-semibold tracking-[-0.02em] text-[var(--landing-ink)]">
                {item.title}
              </h3>
              <p className="text-sm leading-relaxed text-[var(--landing-ink-muted)]">
                {item.description}
              </p>
            </LandingStaggerItem>
          ))}
        </LandingStagger>
      </div>
    </section>
  );
}
