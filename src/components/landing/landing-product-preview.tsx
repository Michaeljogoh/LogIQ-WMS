import {
  AlertTriangleIcon,
  BotIcon,
  LayoutDashboardIcon,
  PackageSearchIcon,
  TrendingUpIcon,
  WarehouseIcon,
} from "lucide-react";

const SIDEBAR_ITEMS = [
  { icon: LayoutDashboardIcon, label: "Dashboard", active: true as const },
  { icon: BotIcon, label: "LogIQ", active: false as const },
  { icon: PackageSearchIcon, label: "Orders", active: false as const },
  { icon: WarehouseIcon, label: "Inventory", active: false as const },
] as const;

const ORDERS = [
  { id: "#4821", merchant: "Northline Apparel", status: "Picking", sla: "2h left" },
  { id: "#4819", merchant: "Summit Gear Co.", status: "Packed", sla: "On track" },
  { id: "#4815", merchant: "Bloom Botanicals", status: "At risk", sla: "38m left" },
] as const;

export function LandingProductPreview() {
  return (
    <div
      id="platform"
      className="relative mx-auto max-w-5xl scroll-mt-24"
      aria-label="Product preview"
    >
      <div className="overflow-hidden rounded-xl border border-[var(--landing-border)] bg-[var(--landing-surface)] shadow-[0_24px_80px_-20px_oklch(0_0_0/0.55)]">
        <div className="flex items-center gap-2 border-b border-[var(--landing-border)] px-4 py-3">
          <span className="size-2.5 rounded-full bg-[oklch(0.62_0.22_25)]" aria-hidden />
          <span className="size-2.5 rounded-full bg-[oklch(0.78_0.14_85)]" aria-hidden />
          <span className="size-2.5 rounded-full bg-[oklch(0.72_0.17_155)]" aria-hidden />
          <span className="ml-3 text-xs text-[var(--landing-ink-subtle)]">
            app.logiqwms.com/dashboard
          </span>
        </div>

        <div className="flex min-h-[340px] sm:min-h-[400px]">
          <aside className="hidden w-44 shrink-0 border-r border-[var(--landing-border)] bg-[var(--landing-bg)] p-3 sm:block">
            <p className="mb-4 px-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--landing-ink-subtle)]">
              Overview
            </p>
            <ul className="space-y-0.5">
              {SIDEBAR_ITEMS.map((item) => (
                <li key={item.label}>
                  <span
                    className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs ${
                      item.active
                        ? "bg-[var(--landing-accent-muted)] text-[var(--landing-ink)]"
                        : "text-[var(--landing-ink-subtle)]"
                    }`}
                  >
                    <item.icon className="size-3.5 shrink-0" aria-hidden />
                    {item.label}
                  </span>
                </li>
              ))}
            </ul>
          </aside>

          <div className="min-w-0 flex-1 p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="landing-display text-sm font-semibold text-[var(--landing-ink)]">
                  Operations today
                </h3>
                <p className="text-xs text-[var(--landing-ink-subtle)]">
                  Meridian Fulfillment · 3 warehouses
                </p>
              </div>
              <div className="flex gap-4 text-right">
                <div>
                  <p className="landing-display text-lg font-semibold tabular-nums text-[var(--landing-ink)]">
                    847
                  </p>
                  <p className="text-[10px] text-[var(--landing-ink-subtle)]">Orders queued</p>
                </div>
                <div>
                  <p className="landing-display text-lg font-semibold tabular-nums text-[var(--landing-success)]">
                    98.2%
                  </p>
                  <p className="text-[10px] text-[var(--landing-ink-subtle)]">SLA on-time</p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
              <div className="rounded-lg border border-[var(--landing-border)] bg-[var(--landing-bg)]">
                <div className="border-b border-[var(--landing-border)] px-3 py-2">
                  <p className="text-xs font-medium text-[var(--landing-ink-muted)]">
                    Fulfillment queue
                  </p>
                </div>
                <ul className="divide-y divide-[var(--landing-border)]">
                  {ORDERS.map((order) => (
                    <li
                      key={order.id}
                      className="flex items-center justify-between gap-2 px-3 py-2.5 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-[var(--landing-ink)]">{order.id}</p>
                        <p className="truncate text-[var(--landing-ink-subtle)]">
                          {order.merchant}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p
                          className={
                            order.status === "At risk"
                              ? "font-medium text-[var(--landing-warning)]"
                              : "text-[var(--landing-ink-muted)]"
                          }
                        >
                          {order.status}
                        </p>
                        <p className="text-[var(--landing-ink-subtle)]">{order.sla}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-3">
                <div className="rounded-lg border border-[var(--landing-accent)]/30 bg-[var(--landing-accent-muted)] p-3">
                  <div className="mb-2 flex items-center gap-1.5">
                    <BotIcon className="size-3.5 text-[var(--landing-accent)]" aria-hidden />
                    <p className="text-xs font-semibold text-[var(--landing-ink)]">
                      LogIQ insight
                    </p>
                  </div>
                  <p className="text-[11px] leading-relaxed text-[var(--landing-ink-muted)]">
                    SKU WL-442 likely to stock out in 4 days at current velocity.
                    Reorder suggested for Bloom Botanicals.
                  </p>
                </div>

                <div className="rounded-lg border border-[var(--landing-border)] bg-[var(--landing-bg)] p-3">
                  <div className="mb-2 flex items-center gap-1.5">
                    <TrendingUpIcon
                      className="size-3.5 text-[var(--landing-success)]"
                      aria-hidden
                    />
                    <p className="text-xs font-medium text-[var(--landing-ink-muted)]">
                      Carrier score
                    </p>
                  </div>
                  <p className="text-[11px] text-[var(--landing-ink-subtle)]">
                    UPS Ground outperforming FedEx on Zone 4 this week. LogIQ
                    recommends switching 23% of shipments.
                  </p>
                </div>

                <div className="flex items-start gap-2 rounded-lg border border-[var(--landing-border)] bg-[var(--landing-bg)] p-3">
                  <AlertTriangleIcon
                    className="mt-0.5 size-3.5 shrink-0 text-[var(--landing-warning)]"
                    aria-hidden
                  />
                  <p className="text-[11px] leading-relaxed text-[var(--landing-ink-subtle)]">
                    2 SLA breaches flagged this morning. Both tied to inbound
                    delays at Dock B.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
