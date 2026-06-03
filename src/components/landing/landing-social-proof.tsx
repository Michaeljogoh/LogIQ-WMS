"use client";

import { LANDING_X_PADDING } from "@/components/landing/landing-layout";
import { IntegrationLogo } from "@/components/landing/integration-logo";
import { SOCIAL_PROOF_BRAND_IDS } from "@/components/landing/integration-brands";
import {
  LandingReveal,
  LandingStagger,
  LandingStaggerItem,
} from "@/components/landing/landing-reveal";
import { landingScaleIn } from "@/components/landing/landing-motion";
import { cn } from "@/lib/utils";

export function LandingSocialProof() {
  return (
    <section
      aria-label="Integrations and partners"
      className={cn(
        "border-y border-[var(--landing-border)] bg-[var(--landing-surface)] py-10",
        LANDING_X_PADDING,
      )}
    >
      <div className="mx-auto max-w-6xl">
        <LandingReveal>
          <p className="mb-8 text-center text-sm text-[var(--landing-ink-subtle)]">
            Connects to the channels, carriers, and tools your operation already
            runs on
          </p>
        </LandingReveal>
        <LandingStagger
          as="ul"
          className="flex flex-wrap items-center justify-center gap-x-12 gap-y-8 sm:gap-x-14"
          stagger={0.06}
        >
          {SOCIAL_PROOF_BRAND_IDS.map((brandId) => (
            <li key={brandId}>
              <LandingStaggerItem variants={landingScaleIn}>
                <IntegrationLogo brand={brandId} />
              </LandingStaggerItem>
            </li>
          ))}
        </LandingStagger>
      </div>
    </section>
  );
}
