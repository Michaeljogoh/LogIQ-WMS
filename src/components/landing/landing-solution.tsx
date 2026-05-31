import {
  ArrowRightLeftIcon,
  BotIcon,
  Building2Icon,
  PackageIcon,
  TruckIcon,
  WarehouseIcon,
} from "lucide-react";

const PILLARS = [
  {
    icon: WarehouseIcon,
    title: "Inventory you can trust",
    description:
      "Real-time stock by SKU, bin, and zone. Cycle counts, lot tracking, and full movement audit trails with strict merchant isolation.",
    tint: "oklch(0.72 0.17 155 / 0.12)",
    iconColor: "var(--landing-success)",
  },
  {
    icon: TruckIcon,
    title: "Outbound that moves",
    description:
      "Order ingestion from Shopify, Amazon, and more. Wave picking, rate shopping via EasyPost, label printing, and carrier performance tracking.",
    tint: "var(--landing-accent-muted)",
    iconColor: "var(--landing-accent)",
  },
  {
    icon: Building2Icon,
    title: "MerchantOS built in",
    description:
      "Self-serve merchant portal, contract-based billing, invoice approval workflows, and SLA monitoring with breach alerts.",
    tint: "oklch(0.78 0.14 85 / 0.12)",
    iconColor: "var(--landing-warning)",
  },
] as const;

export function LandingSolution() {
  return (
    <section className="border-t border-[var(--landing-border)] bg-[var(--landing-surface)] px-5 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <h2 className="landing-display text-balance text-[clamp(1.75rem,3.5vw,2.5rem)] font-semibold leading-[1.12] tracking-[-0.03em] text-[var(--landing-ink)]">
            One platform for warehouse ops and client relationships
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-[var(--landing-ink-muted)]">
            LogIQ WMS replaces the patchwork of inventory tools, billing
            spreadsheets, and merchant portals with a single system designed
            for multi-tenant 3PL operations.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {PILLARS.map((pillar) => (
            <article
              key={pillar.title}
              className="rounded-xl border border-[var(--landing-border)] bg-[var(--landing-bg)] p-6"
            >
              <div
                className="mb-4 inline-flex size-10 items-center justify-center rounded-lg"
                style={{ backgroundColor: pillar.tint }}
              >
                <pillar.icon
                  className="size-5"
                  style={{ color: pillar.iconColor }}
                  aria-hidden
                />
              </div>
              <h3 className="landing-display mb-2 text-lg font-semibold tracking-[-0.02em] text-[var(--landing-ink)]">
                {pillar.title}
              </h3>
              <p className="text-sm leading-relaxed text-[var(--landing-ink-muted)]">
                {pillar.description}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <div className="flex items-start gap-4 rounded-xl border border-[var(--landing-border)] bg-[var(--landing-bg)] p-5">
            <PackageIcon
              className="mt-0.5 size-5 shrink-0 text-[var(--landing-ink-subtle)]"
              aria-hidden
            />
            <div>
              <p className="text-sm font-medium text-[var(--landing-ink)]">
                Inbound and receiving
              </p>
              <p className="mt-1 text-sm leading-relaxed text-[var(--landing-ink-muted)]">
                Purchase orders, ASN matching, smart putaway, and work orders
                for kitting and assembly.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4 rounded-xl border border-[var(--landing-border)] bg-[var(--landing-bg)] p-5">
            <ArrowRightLeftIcon
              className="mt-0.5 size-5 shrink-0 text-[var(--landing-ink-subtle)]"
              aria-hidden
            />
            <div>
              <p className="text-sm font-medium text-[var(--landing-ink)]">
                Returns and transfers
              </p>
              <p className="mt-1 text-sm leading-relaxed text-[var(--landing-ink-muted)]">
                RMA workflows, inter-warehouse transfers, and routing rules
                per merchant SLA.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
