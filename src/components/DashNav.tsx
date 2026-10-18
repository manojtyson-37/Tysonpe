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

} from "./dashboard/icons";

interface NavLinkItem {
  href: string;
  label: string;
  exact?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const links: NavLinkItem[] = [
  { href: "/dashboard", label: "Overview", exact: true, icon: DashboardIcon },
  { href: "/dashboard/storefront", label: "Storefront", icon: StorefrontIcon, badge: "Customizer" },
  { href: "/dashboard/products", label: "Products", icon: PackageIcon },
  { href: "/dashboard/orders", label: "Orders", icon: ReceiptIcon },
  { href: "/dashboard/crm", label: "WhatsApp CRM", icon: WhatsAppIcon, badge: "AI Agent" },
  { href: "/dashboard/learners", label: "Learners", icon: UsersIcon },
  { href: "/dashboard/community", label: "Community", icon: MessageIcon },
  { href: "/dashboard/coupons", label: "Coupons", icon: TicketIcon },
  { href: "/dashboard/payouts", label: "Payouts", icon: BanknoteIcon },
  { href: "/dashboard/settings", label: "Settings", icon: SettingsIcon },
];


export function DashNav() {
  const path = usePathname();

  return (
    <nav aria-label="Dashboard navigation" className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
      {links.map((l) => {
        const active = l.exact ? path === l.href : path.startsWith(l.href);
        const Icon = l.icon;

        return (
          <Link
            key={l.href}
            href={l.href}
            prefetch={true}
            aria-current={active ? "page" : undefined}
            className={`group flex items-center justify-between whitespace-nowrap rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all duration-150 ease-out active:scale-[0.98] ${
              active
                ? "bg-brand text-brand-ink shadow-xs"
                : "text-muted hover:bg-surface-2 hover:text-ink"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Icon
                className={`h-4 w-4 shrink-0 transition-colors ${
                  active ? "text-brand-ink" : "text-muted group-hover:text-ink"
                }`}
              />
              <span>{l.label}</span>
            </div>

            {l.badge && (
              <span
                className={`hidden rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider lg:inline-block ${
                  active
                    ? "bg-white/20 text-brand-ink"
                    : "bg-brand-soft text-brand"
                }`}
              >
                {l.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
