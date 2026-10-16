import Link from "next/link";
import { DEMO_HANDLE } from "@/lib/demo";
import { Logo } from "./Logo";
import { footerGroups } from "./site-nav-links";

/** The close of every public page: what Tysonpe is, real links, the test-mode line, and the wordmark at page width. */
export function SiteFooter({ storefrontHandle = DEMO_HANDLE }: { storefrontHandle?: string }) {
  const groups = footerGroups({ storefrontHandle });
  return (
    <footer className="mt-auto overflow-hidden border-t border-line bg-surface-2/60 text-[13px] text-muted">
      <div className="mx-auto max-w-6xl px-4 pt-12 sm:px-6 sm:pt-16">
        <div className="grid gap-10 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <Link href="/" aria-label="Tysonpe home">
              <Logo className="!text-base text-ink" />
            </Link>
            <p className="mt-4 max-w-xs text-[15px]">
              Storefront, UPI checkout, GST invoices and a learner library for creators in India.
            </p>
          </div>
          {groups.map((group) => (
            <nav key={group.label} aria-label={group.label}>
              <h2 className="text-sm font-semibold text-ink">{group.label}</h2>
              <ul className="mt-3 space-y-1">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="inline-flex min-h-8 items-center pointer-coarse:min-h-11 rounded-control text-sm transition-colors duration-(--dur-fast) hover:text-ink"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <p className="mt-12 border-t border-line pt-4">
          © {new Date().getFullYear()} Tysonpe. Payments run in test mode; no real money moves.
        </p>
        {/* The wordmark, once, at the width of the page. Decorative: the real name is the logo link above. */}
        <svg viewBox="0 0 1000 250" className="mt-6 block w-full select-none text-line-strong" aria-hidden="true" focusable="false">
          <text
            x="0"
            y="172"
            textLength="1000"
            lengthAdjust="spacingAndGlyphs"
            fill="currentColor"
            fontSize="240"
            fontWeight="800"
            letterSpacing="-6"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Tysonpe
          </text>
        </svg>
      </div>
    </footer>
  );
}
