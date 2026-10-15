"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Overview", exact: true },
  { href: "/dashboard/products", label: "Products" },
  { href: "/dashboard/orders", label: "Orders" },
  { href: "/dashboard/learners", label: "Learners" },
  { href: "/dashboard/community", label: "Community" },
  { href: "/dashboard/coupons", label: "Coupons" },
  { href: "/dashboard/payouts", label: "Payouts" },
  { href: "/dashboard/settings", label: "Settings" },
];

export function DashNav() {
  const path = usePathname();
  return (
    <nav aria-label="Dashboard" className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
      {links.map((l) => {
        const active = l.exact ? path === l.href : path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-medium transition ${active ? "bg-brand-soft text-brand" : "text-muted hover:bg-surface-2 hover:text-ink"}`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
