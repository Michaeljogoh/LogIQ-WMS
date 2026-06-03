import {
  BarChart3Icon,
  CreditCardIcon,
  PlugIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
  UsersIcon,
} from "lucide-react";
import {
  LandingReveal,
  LandingStagger,
  LandingStaggerItem,
} from "@/components/landing/landing-reveal";
import { landingScaleIn } from "@/components/landing/landing-motion";

const BENEFITS = [
  {
    icon: UsersIcon,
    title: "Multi-merchant by design",
    body: "Strict data isolation, per-merchant contracts, and role-based access for operators, staff, and clients.",
  },
  {
    icon: CreditCardIcon,
    title: "Billing that audits itself",
    body: "Storage, pick, pack, and label fees calculated automatically. LogIQ flags invoice anomalies before they go out.",
  },
  {
    icon: BarChart3Icon,
    title: "Analytics without exports",
    body: "Operations dashboards, inventory health, carrier cost analysis, and custom reports to CSV or PDF.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Security built in",
    body: "Two-factor authentication, audit logs, and platform support access controls with merchant approval.",
  },
  {
    icon: SmartphoneIcon,
    title: "Floor-ready mobile",
    body: "Barcode scanning, pick confirmation, and cycle counts from any device. Built for warehouse gloves and glare.",
  },
  {
    icon: PlugIcon,
    title: "Developer-friendly",
    body: "REST API, API keys, outbound webhooks, and integration sync logs for custom workflows.",
  },
] as const;

export function LandingBenefits() {
  return (
    <section className="px-5 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <LandingReveal className="mb-14 text-center">
          <h2 className="landing-display text-balance text-[clamp(1.75rem,3.5vw,2.5rem)] font-semibold leading-[1.12] tracking-[-0.03em] text-[var(--landing-ink)]">
            Built for operators who run the floor and the business
          </h2>
        </LandingReveal>

        <LandingStagger
          as="ul"
          className="grid gap-px overflow-hidden rounded-xl border border-[var(--landing-border)] bg-[var(--landing-border)] sm:grid-cols-2 lg:grid-cols-3"
          stagger={0.05}
        >
          {BENEFITS.map((item) => (
            <LandingStaggerItem
              key={item.title}
              as="li"
              variants={landingScaleIn}
              className="bg-[var(--landing-surface)] p-6 sm:p-7"
            >
              <item.icon
                className="mb-4 size-5 text-[var(--landing-accent)]"
                aria-hidden
              />
              <h3 className="landing-display mb-2 text-base font-semibold tracking-[-0.02em] text-[var(--landing-ink)]">
                {item.title}
              </h3>
              <p className="text-sm leading-relaxed text-[var(--landing-ink-muted)]">
                {item.body}
              </p>
            </LandingStaggerItem>
          ))}
        </LandingStagger>
      </div>
    </section>
  );
}
