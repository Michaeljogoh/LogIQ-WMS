"use client";

import { ChevronDownIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { LandingReveal } from "@/components/landing/landing-reveal";
import { landingTransition, LANDING_DURATION } from "@/components/landing/landing-motion";

const FAQ_ITEMS = [
  {
    question: "Who is LogIQ WMS built for?",
    answer:
      "Third-party logistics providers (3PLs) and fulfillment operators managing inventory for multiple merchant clients. E-commerce brands storing inventory at a 3PL also get a self-serve merchant portal with order visibility, billing, and LogIQ chat.",
  },
  {
    question: "How is LogIQ different from a chatbot add-on?",
    answer:
      "LogIQ is embedded in the architecture, not bolted on. Every operational module feeds the intelligence engine: inventory movements, order queues, carrier logs, and billing data. It runs predictive jobs, surfaces proactive insights, and answers natural language queries against your live PostgreSQL data with tenant-scoped access.",
  },
  {
    question: "How long does implementation take?",
    answer:
      "Most operators are running inbound and outbound workflows within the first day. Warehouse setup, merchant onboarding, and channel connections typically complete in under a week without a dedicated implementation team.",
  },
  {
    question: "Can merchants access their own data?",
    answer:
      "Yes. MerchantOS includes a branded portal where clients view inventory, track orders, approve invoices, manage team access, and chat with LogIQ. Permissions are granular: read, write, and billing roles.",
  },
  {
    question: "What security controls are included?",
    answer:
      "Two-factor authentication for operators, full audit event logging, role-based access across warehouses and merchants, and a platform support access model that requires explicit merchant approval before any support session.",
  },
  {
    question: "How does pricing work?",
    answer:
      "Plans scale by order volume, warehouse count, and merchant accounts. The Starter tier includes LogIQ AI capabilities. Visit the billing page after sign-up or contact us for enterprise volume pricing.",
  },
] as const;

export function LandingFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const reduceMotion = useReducedMotion();

  return (
    <section id="faq" className="scroll-mt-24 px-5 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-3xl">
        <LandingReveal>
          <h2 className="landing-display mb-10 text-center text-[clamp(1.75rem,3.5vw,2.5rem)] font-semibold leading-[1.12] tracking-[-0.03em] text-[var(--landing-ink)]">
            Questions operators ask before switching
          </h2>
        </LandingReveal>

        <LandingReveal delay={0.08}>
          <div className="divide-y divide-[var(--landing-border)] rounded-xl border border-[var(--landing-border)] bg-[var(--landing-surface)]">
            {FAQ_ITEMS.map((item, index) => {
              const isOpen = openIndex === index;
              const panelId = `faq-panel-${index}`;
              const buttonId = `faq-button-${index}`;

              return (
                <div key={item.question}>
                  <h3>
                    <button
                      id={buttonId}
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-medium text-[var(--landing-ink)] hover:bg-[var(--landing-bg)] sm:px-6 sm:py-5 sm:text-base"
                      onClick={() => setOpenIndex(isOpen ? null : index)}
                    >
                      {item.question}
                      <motion.span
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        transition={landingTransition(LANDING_DURATION.fast)}
                      >
                        <ChevronDownIcon
                          className="size-5 shrink-0 text-[var(--landing-ink-subtle)]"
                          aria-hidden
                        />
                      </motion.span>
                    </button>
                  </h3>
                  <AnimatePresence initial={false}>
                    {isOpen ? (
                      <motion.div
                        id={panelId}
                        role="region"
                        aria-labelledby={buttonId}
                        initial={
                          reduceMotion
                            ? false
                            : { height: 0, opacity: 0 }
                        }
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={landingTransition(LANDING_DURATION.fast)}
                        className="overflow-hidden"
                      >
                        <p className="px-5 pb-5 text-sm leading-relaxed text-[var(--landing-ink-muted)] sm:px-6 sm:pb-6 sm:text-[15px]">
                          {item.answer}
                        </p>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </LandingReveal>
      </div>
    </section>
  );
}
