import { BotIcon, MessageSquareIcon, SparklesIcon, TrendingUpIcon } from "lucide-react";

const CAPABILITIES = [
  {
    question: "Which merchants had SLA breaches this week, and why?",
    category: "Operations",
  },
  {
    question: "Show SKUs with fewer than 10 units in bin A-12",
    category: "Inventory",
  },
  {
    question: "Which carrier costs the most per Zone 4 shipment this month?",
    category: "Shipping",
  },
] as const;

const FEATURES = [
  {
    icon: MessageSquareIcon,
    title: "Ask in plain English",
    body: "Operators and merchants query live warehouse data without writing SQL or building reports.",
  },
  {
    icon: TrendingUpIcon,
    title: "Predictive stock alerts",
    body: "Rolling velocity, days-of-stock remaining, and tiered warnings before stockouts hit.",
  },
  {
    icon: SparklesIcon,
    title: "Carrier intelligence",
    body: "Scorecards that learn actual delivery performance and recommend the best carrier per lane.",
  },
] as const;

export function LandingLogiq() {
  return (
    <section
      id="logiq"
      className="scroll-mt-24 px-5 py-20 sm:px-8 sm:py-28"
    >
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-lg bg-[var(--landing-accent-muted)] px-3 py-1.5">
              <BotIcon className="size-4 text-[var(--landing-accent)]" aria-hidden />
              <span className="text-sm font-medium text-[var(--landing-ink)]">
                LogIQ intelligence
              </span>
            </div>

            <h2 className="landing-display text-balance text-[clamp(1.75rem,3.5vw,2.5rem)] font-semibold leading-[1.12] tracking-[-0.03em] text-[var(--landing-ink)]">
              An AI co-pilot that reads your warehouse, not a chatbot on the side
            </h2>

            <p className="mt-5 text-pretty text-lg leading-relaxed text-[var(--landing-ink-muted)]">
              Every module feeds LogIQ. It monitors inventory velocity, order
              queues, carrier performance, and billing anomalies, then surfaces
              what matters before your team goes looking for it.
            </p>

            <ul className="mt-8 space-y-5">
              {FEATURES.map((feature) => (
                <li key={feature.title} className="flex gap-4">
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--landing-surface)]">
                    <feature.icon
                      className="size-4 text-[var(--landing-accent)]"
                      aria-hidden
                    />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[var(--landing-ink)]">
                      {feature.title}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-[var(--landing-ink-muted)]">
                      {feature.body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-[var(--landing-border)] bg-[var(--landing-surface)] p-5 sm:p-6">
            <p className="mb-4 text-xs font-medium text-[var(--landing-ink-subtle)]">
              Example queries
            </p>
            <ul className="space-y-3">
              {CAPABILITIES.map((item) => (
                <li
                  key={item.question}
                  className="rounded-lg border border-[var(--landing-border)] bg-[var(--landing-bg)] p-4"
                >
                  <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-[var(--landing-accent)]">
                    {item.category}
                  </p>
                  <p className="text-sm leading-relaxed text-[var(--landing-ink)]">
                    &ldquo;{item.question}&rdquo;
                  </p>
                </li>
              ))}
            </ul>

            <div className="mt-5 rounded-lg bg-[var(--landing-accent-muted)] p-4">
              <p className="text-xs font-medium text-[var(--landing-ink-subtle)]">
                LogIQ response
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--landing-ink-muted)]">
                Bloom Botanicals had 2 SLA breaches this week, both caused by
                inbound PO #8842 arriving 18 hours late. 847 units of SKU
                BB-204 remain unallocated. Recommend prioritizing pick wave
                #112 before 2pm cutoff.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
