const LOGOS = [
  "Shopify",
  "WooCommerce",
  "Amazon",
  "EasyPost",
  "QuickBooks",
  "Slack",
] as const;

export function LandingSocialProof() {
  return (
    <section
      aria-label="Integrations and partners"
      className="border-y border-[var(--landing-border)] bg-[var(--landing-surface)] px-5 py-10 sm:px-8"
    >
      <div className="mx-auto max-w-6xl">
        <p className="mb-6 text-center text-sm text-[var(--landing-ink-subtle)]">
          Connects to the channels, carriers, and tools your operation already runs on
        </p>
        <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {LOGOS.map((name) => (
            <li
              key={name}
              className="landing-display text-sm font-medium tracking-[-0.01em] text-[var(--landing-ink-subtle)]"
            >
              {name}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
