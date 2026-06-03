import type { IntegrationBrandId } from "@/components/landing/integration-brands";
import { INTEGRATION_BRANDS } from "@/components/landing/integration-brands";
import { IntegrationLogo } from "@/components/landing/integration-logo";
import { LANDING_X_PADDING } from "@/components/landing/landing-layout";
import {
  LandingReveal,
  LandingStagger,
  LandingStaggerItem,
} from "@/components/landing/landing-reveal";
import { cn } from "@/lib/utils";

const CHANNELS: ReadonlyArray<{
  brand: IntegrationBrandId;
  detail: string;
}> = [
  { brand: "shopify", detail: "Orders, inventory sync, fulfillment" },
  { brand: "woocommerce", detail: "Product catalog and order ingestion" },
  { brand: "amazon", detail: "Marketplace order routing" },
  { brand: "tiktok", detail: "Social commerce fulfillment" },
];

const INFRA: ReadonlyArray<{
  brand: IntegrationBrandId;
  detail: string;
}> = [
  { brand: "easypost", detail: "USPS, FedEx, UPS, DHL rate shopping" },
  { brand: "quickbooks", detail: "Invoice and accounting sync" },
  { brand: "xero", detail: "Financial reconciliation" },
  { brand: "slack", detail: "Ops alerts and notifications" },
];

function IntegrationListItem({
  brand,
  detail,
}: Readonly<{
  brand: IntegrationBrandId;
  detail: string;
}>) {
  return (
    <LandingStaggerItem
      as="li"
      className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-[var(--landing-surface-raised)]/40"
    >
      <IntegrationLogo brand={brand} size="sm" />
      <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
        <span className="text-sm font-medium text-[var(--landing-ink)]">
          {INTEGRATION_BRANDS[brand].name}
        </span>
        <span className="text-right text-xs text-[var(--landing-ink-subtle)]">
          {detail}
        </span>
      </div>
    </LandingStaggerItem>
  );
}

export function LandingIntegrations() {
  return (
    <section
      id="integrations"
      className={cn(
        "scroll-mt-24 border-t border-[var(--landing-border)] bg-[var(--landing-surface)] py-20 sm:py-28",
        LANDING_X_PADDING,
      )}
    >
      <div className="mx-auto max-w-6xl">
        <LandingReveal className="mb-12 max-w-xl">
          <h2 className="landing-display text-balance text-[clamp(1.75rem,3.5vw,2.5rem)] font-semibold leading-[1.12] tracking-[-0.03em] text-[var(--landing-ink)]">
            Plugs into your stack
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-[var(--landing-ink-muted)]">
            Connect sales channels, carriers, and back-office tools. LogIQ WMS
            is the hub, not another silo.
          </p>
        </LandingReveal>

        <div className="grid gap-10 lg:grid-cols-2">
          <LandingReveal delay={0.05}>
            <h3 className="mb-4 text-sm font-semibold text-[var(--landing-ink)]">
              Sales channels
            </h3>
            <LandingStagger
              as="ul"
              className="divide-y divide-[var(--landing-border)] rounded-xl border border-[var(--landing-border)] bg-[var(--landing-bg)]"
            >
              {CHANNELS.map((item) => (
                <IntegrationListItem
                  key={item.brand}
                  brand={item.brand}
                  detail={item.detail}
                />
              ))}
            </LandingStagger>
          </LandingReveal>

          <LandingReveal delay={0.1}>
            <h3 className="mb-4 text-sm font-semibold text-[var(--landing-ink)]">
              Carriers and back office
            </h3>
            <LandingStagger
              as="ul"
              className="divide-y divide-[var(--landing-border)] rounded-xl border border-[var(--landing-border)] bg-[var(--landing-bg)]"
            >
              {INFRA.map((item) => (
                <IntegrationListItem
                  key={item.brand}
                  brand={item.brand}
                  detail={item.detail}
                />
              ))}
            </LandingStagger>
          </LandingReveal>
        </div>
      </div>
    </section>
  );
}
