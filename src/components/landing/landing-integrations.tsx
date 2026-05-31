const CHANNELS = [
  { name: "Shopify", detail: "Orders, inventory sync, fulfillment" },
  { name: "WooCommerce", detail: "Product catalog and order ingestion" },
  { name: "Amazon", detail: "Marketplace order routing" },
  { name: "TikTok Shop", detail: "Social commerce fulfillment" },
] as const;

const INFRA = [
  { name: "EasyPost", detail: "USPS, FedEx, UPS, DHL rate shopping" },
  { name: "QuickBooks", detail: "Invoice and accounting sync" },
  { name: "Xero", detail: "Financial reconciliation" },
  { name: "Slack", detail: "Ops alerts and notifications" },
] as const;

export function LandingIntegrations() {
  return (
    <section
      id="integrations"
      className="scroll-mt-24 border-t border-[var(--landing-border)] bg-[var(--landing-surface)] px-5 py-20 sm:px-8 sm:py-28"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 max-w-xl">
          <h2 className="landing-display text-balance text-[clamp(1.75rem,3.5vw,2.5rem)] font-semibold leading-[1.12] tracking-[-0.03em] text-[var(--landing-ink)]">
            Plugs into your stack
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-[var(--landing-ink-muted)]">
            Connect sales channels, carriers, and back-office tools. LogIQ WMS
            is the hub, not another silo.
          </p>
        </div>

        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <h3 className="mb-4 text-sm font-semibold text-[var(--landing-ink)]">
              Sales channels
            </h3>
            <ul className="divide-y divide-[var(--landing-border)] rounded-xl border border-[var(--landing-border)] bg-[var(--landing-bg)]">
              {CHANNELS.map((item) => (
                <li
                  key={item.name}
                  className="flex items-center justify-between gap-4 px-5 py-4"
                >
                  <span className="text-sm font-medium text-[var(--landing-ink)]">
                    {item.name}
                  </span>
                  <span className="text-right text-xs text-[var(--landing-ink-subtle)]">
                    {item.detail}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold text-[var(--landing-ink)]">
              Carriers and back office
            </h3>
            <ul className="divide-y divide-[var(--landing-border)] rounded-xl border border-[var(--landing-border)] bg-[var(--landing-bg)]">
              {INFRA.map((item) => (
                <li
                  key={item.name}
                  className="flex items-center justify-between gap-4 px-5 py-4"
                >
                  <span className="text-sm font-medium text-[var(--landing-ink)]">
                    {item.name}
                  </span>
                  <span className="text-right text-xs text-[var(--landing-ink-subtle)]">
                    {item.detail}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
