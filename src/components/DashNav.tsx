"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DashboardIcon,
  StorefrontIcon,
  PackageIcon,
  ReceiptIcon,
  UsersIcon,
  MessageIcon,
  TicketIcon,
  BanknoteIcon,
  SettingsIcon,
  WhatsAppIcon,
  IntegrationsIcon,
  AffiliateIcon,
} from "./dashboard/icons";

interface NavLinkItem {
  href: string;
  label: string;
  exact?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  liveDot?: boolean;
}

interface NavSection {
  title: string;
  items: NavLinkItem[];
}

const navSections: NavSection[] = [
  {
    title: "Commerce",
    items: [
      { href: "/dashboard", label: "Overview", exact: true, icon: DashboardIcon },
      { href: "/dashboard/products", label: "Products", icon: PackageIcon },
      { href: "/dashboard/orders", label: "Orders", icon: ReceiptIcon },
      { href: "/dashboard/payouts", label: "Payouts & Bank", icon: BanknoteIcon },
    ],
  },
  {
    title: "Audience & Growth",
    items: [
      {
        href: "/dashboard/crm",
        label: "WhatsApp CRM",
        icon: WhatsAppIcon,
        badge: "AI Agent",
        liveDot: true,
      },
      {
        href: "/dashboard/affiliates",
        label: "Affiliate Network",
        icon: AffiliateIcon,
        badge: "New",
      },
      { href: "/dashboard/learners", label: "Learners", icon: UsersIcon },
      { href: "/dashboard/community", label: "Community", icon: MessageIcon },
    ],
  },
  {
    title: "Store & Settings",
    items: [
      {
        href: "/dashboard/storefront",
        label: "Storefront Design",
        icon: StorefrontIcon,
        badge: "Editor",
      },
      {
        href: "/dashboard/integrations",
        label: "Integrations & APIs",
        icon: IntegrationsIcon,
        badge: "8 Apps",
      },
      { href: "/dashboard/coupons", label: "Coupons", icon: TicketIcon },
      { href: "/dashboard/settings", label: "Settings", icon: SettingsIcon },
    ],
  },
];

export function DashNav() {
  const path = usePathname();

  return (
    <nav aria-label="Dashboard navigation" className="flex flex-col gap-5">
      {navSections.map((sec) => (
        <div key={sec.title} className="space-y-1">
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted/70">
            {sec.title}
          </p>

          <div className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
            {sec.items.map((l) => {
              const active = l.exact ? path === l.href : path.startsWith(l.href);
              const Icon = l.icon;

              return (
                <Link
                  key={l.href}
                  href={l.href}
                  prefetch={true}
                  aria-current={active ? "page" : undefined}
                  className={`group relative flex items-center justify-between whitespace-nowrap rounded-xl px-3 py-2 text-xs font-medium transition-all duration-150 ease-out active:scale-[0.98] ${
                    active
                      ? "bg-surface-2 text-ink font-semibold border border-line/80 shadow-2xs"
                      : "text-muted hover:bg-surface-2/60 hover:text-ink"
                  }`}
                >
                  {/* Subtle active left accent line */}
                  {active && (
                    <span className="absolute left-1.5 top-2 bottom-2 w-1 rounded-full bg-brand" />
                  )}

                  <div className="flex items-center gap-2.5 pl-1.5">
                    <Icon
                      className={`h-4 w-4 shrink-0 transition-colors ${
                        active
                          ? "text-brand"
                          : "text-muted group-hover:text-ink"
                      }`}
                    />
                    <span className={active ? "font-semibold text-ink" : ""}>
                      {l.label}
                    </span>
                  </div>

                  {/* Badges / Live indicators */}
                  {l.liveDot ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live AI
                    </span>
                  ) : l.badge ? (
                    <span
                      className={`hidden rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider lg:inline-block ${
                        active
                          ? "bg-brand/10 text-brand"
                          : "bg-surface-2 text-muted border border-line/40"
                      }`}
                    >
                      {l.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
