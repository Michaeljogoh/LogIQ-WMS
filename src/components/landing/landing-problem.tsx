export function LandingProblem() {
  return (
    <section className="px-5 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
        <div>
          <h2 className="landing-display text-balance text-[clamp(1.75rem,3.5vw,2.5rem)] font-semibold leading-[1.12] tracking-[-0.03em] text-[var(--landing-ink)]">
            Your WMS captures data. It does not tell you what to do with it.
          </h2>
        </div>

        <div className="space-y-6 text-[var(--landing-ink-muted)]">
          <p className="text-pretty text-lg leading-relaxed">
            Most warehouse software was built to record transactions: receive,
            pick, pack, ship. When a stockout hits, an SLA slips, or a carrier
            invoice does not match reality, your team is the one connecting the
            dots across spreadsheets, dashboards, and Slack threads.
          </p>
          <p className="text-pretty leading-relaxed">
            For 3PLs running dozens of merchant accounts, that reactive model
            does not scale. Every missed signal is a support ticket, a billing
            dispute, or a client you lose to a competitor who ships faster.
          </p>
        </div>
      </div>
    </section>
  );
}
