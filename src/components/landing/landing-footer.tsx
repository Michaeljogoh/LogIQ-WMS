import Link from "next/link";

const FOOTER_LINKS = {
  Product: [
    { label: "Platform", href: "#platform" },
    { label: "LogIQ AI", href: "#logiq" },
    { label: "Integrations", href: "#integrations" },
  ],
  Company: [
    { label: "Sign up", href: "/sign-up" },
    { label: "Sign in", href: "/sign-in" },
    { label: "Merchant portal", href: "/merchant/sign-in" },
  ],
  Resources: [
    { label: "FAQ", href: "#faq" },
    { label: "Documentation", href: "#" },
    { label: "API reference", href: "#" },
  ],
} as const;

export function LandingFooter() {
  return (
    <footer className="border-t border-[var(--landing-border)] px-5 py-12 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <Link
              href="/"
              className="landing-display inline-flex items-center gap-2.5 text-[15px] font-semibold tracking-[-0.02em] text-[var(--landing-ink)]"
            >
              <span
                aria-hidden
                className="flex size-7 items-center justify-center rounded-md bg-[var(--landing-accent)] text-xs font-bold text-white"
              >
                LQ
              </span>
              LogIQ WMS
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-[var(--landing-ink-subtle)]">
              The intelligent warehouse operating system for modern 3PLs.
            </p>
          </div>

          {Object.entries(FOOTER_LINKS).map(([group, links]) => (
            <div key={group}>
              <p className="mb-3 text-sm font-semibold text-[var(--landing-ink)]">
                {group}
              </p>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-[var(--landing-ink-subtle)] transition-colors hover:text-[var(--landing-ink-muted)]"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-[var(--landing-border)] pt-8 sm:flex-row sm:items-center">
          <p className="text-sm text-[var(--landing-ink-subtle)]">
            © {new Date().getFullYear()} LogIQ WMS. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-[var(--landing-ink-subtle)]">
            <a href="#" className="hover:text-[var(--landing-ink-muted)]">
              Privacy
            </a>
            <a href="#" className="hover:text-[var(--landing-ink-muted)]">
              Terms
            </a>
            <a href="#" className="hover:text-[var(--landing-ink-muted)]">
              Security
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
