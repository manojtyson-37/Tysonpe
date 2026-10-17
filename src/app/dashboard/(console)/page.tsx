import type { Metadata } from "next";
import Link from "next/link";
import { CopyLink } from "@/components/CopyLink";
import { Money, StatusBadge, TYPE_LABEL, dateFmt } from "@/components/ui";
import { requireCreator } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { nowMs } from "@/lib/time";
import { feeBreakdown, formatINR } from "@/lib/money";
import { RevenueChart, type DayData } from "@/components/dashboard/RevenueChart";
import {
  StorefrontIcon,
  PlusIcon,
  ArrowUpRightIcon,
  BanknoteIcon,
  ReceiptIcon,
  UsersIcon,
  PackageIcon,
  TrendingUpIcon,
} from "@/components/dashboard/icons";
import { UpiIcon, ShieldCheckIcon } from "@/components/gateway-icons";

export const metadata: Metadata = { title: "Overview — Dashboard" };

const istDay = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);

const formatDayLabel = (d: Date) =>
  new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" }).format(d);

const formatWeekday = (d: Date) =>
  new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", weekday: "short" }).format(d);

export default async function OverviewPage() {
  const { creator } = await requireCreator();

  // Load last 30 days of data for the analytics chart
  const since30Days = new Date(nowMs() - 29 * 864e5);

  const [
    paid,
    ledger,
    learners,
    productCount,
    publishedCount,
    couponCount,
    recent,
    last30Orders,
    productsList,
  ] = await Promise.all([
    db.order.aggregate({
      where: { creatorId: creator.id, status: "paid" },
      _sum: { totalPaise: true },
      _count: true,
    }),
    db.ledgerEntry.aggregate({
      where: { creatorId: creator.id, order: { status: "paid" } },
      _sum: { netPaise: true },
    }),
    db.enrollment.findMany({
      where: { product: { creatorId: creator.id } },
      distinct: ["userId"],
      select: { userId: true },
    }),
    db.product.count({ where: { creatorId: creator.id } }),
    db.product.count({ where: { creatorId: creator.id, status: "published" } }),
    db.coupon.count({ where: { creatorId: creator.id } }),
    db.order.findMany({
      where: { creatorId: creator.id, status: { not: "created" } },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { user: true, product: true },
    }),
    db.order.findMany({
      where: { creatorId: creator.id, status: "paid", paidAt: { gte: since30Days } },
      select: { paidAt: true, totalPaise: true },
    }),
    db.product.findMany({
      where: { creatorId: creator.id },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: {
        id: true,
        title: true,
        type: true,
        pricePaise: true,
        status: true,
        slug: true,
        _count: { select: { enrollments: true, orders: true } },
      },
    }),
  ]);

  // Compute effective net earnings
  const grossPaise = paid._sum.totalPaise ?? 0;
  const ledgerNetPaise = ledger._sum.netPaise ?? 0;
  const effectiveNetPaise =
    ledgerNetPaise > 0 ? ledgerNetPaise : feeBreakdown(grossPaise, creator.planKey).netPaise;

  const totalOrdersCount = paid._count ?? 0;
  const averageOrderPaise = totalOrdersCount > 0 ? Math.round(grossPaise / totalOrdersCount) : 0;

  // Prepare 30 days of data for the chart
  const daysData: DayData[] = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(nowMs() - (29 - i) * 864e5);
    const dateStr = istDay(d);
    return {
      date: dateStr,
      dayLabel: formatDayLabel(d),
      weekday: formatWeekday(d),
      revenuePaise: 0,
      ordersCount: 0,
    };
  });

  const dayMap = new Map<string, DayData>(daysData.map((d) => [d.date, d]));
  for (const o of last30Orders) {
    if (o.paidAt) {
      const ds = istDay(o.paidAt);
      const match = dayMap.get(ds);
      if (match) {
        match.revenuePaise += o.totalPaise;
        match.ordersCount += 1;
      }
    }
  }

  const storeUrl = `/c/${creator.handle}`;
  const allSetupStepsDone = publishedCount > 0 && couponCount > 0 && totalOrdersCount > 0;

  const setupSteps = [
    { done: publishedCount > 0, label: "Publish your first product", href: "/dashboard/products/new" },
    { done: couponCount > 0, label: "Create a launch coupon", href: "/dashboard/coupons" },
    { done: totalOrdersCount > 0, label: "Make your first sale", href: storeUrl },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Command Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line/60 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
              Overview
            </h1>
            <span className="badge badge-brand text-[10px] font-bold uppercase tracking-wider">
              {creator.planKey} plan
            </span>
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-good-soft px-2.5 py-0.5 text-[11px] font-semibold text-good">
              <span className="h-1.5 w-1.5 rounded-full bg-good animate-pulse" />
              T+1 Auto-Payouts Active
            </span>
          </div>
          <p className="mt-1 text-xs text-muted sm:text-sm">
            Welcome back, {creator.displayName}. Here is your sales and store performance today.
          </p>
        </div>

        {/* Top Header Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/dashboard/storefront"
            className="btn btn-secondary btn-sm"
          >
            <StorefrontIcon className="h-3.5 w-3.5 text-brand" />
            <span>Storefront Studio</span>
          </Link>
          <Link
            href="/dashboard/products/new"
            className="btn btn-primary btn-sm"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            <span>New product</span>
          </Link>
        </div>
      </div>

      {/* 2. Enhanced Fintech KPI Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Metric 1: Gross Revenue */}
        <div className="card p-5 transition-all duration-150 hover:border-brand/40 hover:shadow-xs">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Gross Revenue
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand">
              <TrendingUpIcon className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 font-display text-2xl font-extrabold tabular-nums tracking-tight text-ink sm:text-3xl">
            {formatINR(grossPaise)}
          </p>
          <div className="mt-2 flex items-center justify-between text-xs text-muted">
            <span>{totalOrdersCount} paid {totalOrdersCount === 1 ? "order" : "orders"}</span>
            <span className="badge badge-good text-[10px]">100% Collected</span>
          </div>
        </div>

        {/* Metric 2: Net Earnings */}
        <div className="card p-5 transition-all duration-150 hover:border-brand/40 hover:shadow-xs">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Net Earnings
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-good-soft text-good">
              <BanknoteIcon className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 font-display text-2xl font-extrabold tabular-nums tracking-tight text-ink sm:text-3xl">
            {formatINR(effectiveNetPaise)}
          </p>
          <div className="mt-2 flex items-center justify-between text-xs text-muted">
            <span>After platform & gateway fees</span>
            <span className="badge badge-brand text-[10px]">Settlement Ready</span>
          </div>
        </div>

        {/* Metric 3: Paid Orders */}
        <div className="card p-5 transition-all duration-150 hover:border-brand/40 hover:shadow-xs">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Paid Orders
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2 text-muted">
              <ReceiptIcon className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 font-display text-2xl font-extrabold tabular-nums tracking-tight text-ink sm:text-3xl">
            {totalOrdersCount}
          </p>
          <div className="mt-2 flex items-center justify-between text-xs text-muted">
            <span>Avg {formatINR(averageOrderPaise)} / order</span>
            <span className="text-good font-semibold">100% Success</span>
          </div>
        </div>

        {/* Metric 4: Total Learners */}
        <div className="card p-5 transition-all duration-150 hover:border-brand/40 hover:shadow-xs">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Active Learners
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2 text-muted">
              <UsersIcon className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 font-display text-2xl font-extrabold tabular-nums tracking-tight text-ink sm:text-3xl">
            {learners.length}
          </p>
          <div className="mt-2 flex items-center justify-between text-xs text-muted">
            <span>{productCount} {productCount === 1 ? "product" : "products"} in catalog</span>
            <span className="badge badge-muted text-[10px]">Lifetime</span>
          </div>
        </div>
      </div>

      {/* 3. Interactive Fintech Analytics Chart Card */}
      <RevenueChart daysData={daysData} />

      {/* 4. Two-Column Split: Creator Hub & Recent Orders */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Store Launch & Distribution Hub */}
        <section className="card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-ink">Creator Distribution Hub</h2>
              {allSetupStepsDone ? (
                <span className="badge badge-good text-xs">✓ Setup Complete</span>
              ) : (
                <span className="badge badge-warn text-xs">Setup in Progress</span>
              )}
            </div>

            {allSetupStepsDone ? (
              <div className="mt-3 rounded-xl bg-good-soft/60 border border-good/20 p-3.5">
                <p className="text-xs font-bold text-good">
                  🎉 Your storefront is live and ready for sales!
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  Share your link with your audience across Instagram, YouTube, Telegram & WhatsApp.
                </p>
              </div>
            ) : (
              <ul className="mt-4 space-y-3">
                {setupSteps.map((s) => (
                  <li key={s.label} className="flex items-center gap-3 text-sm">
                    <span
                      aria-hidden
                      className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                        s.done ? "bg-good text-bg" : "border border-line"
                      }`}
                    >
                      {s.done ? "✓" : ""}
                    </span>
                    <Link
                      href={s.href}
                      className={s.done ? "text-muted line-through" : "font-semibold text-brand hover:underline"}
                    >
                      {s.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {/* Store link sharing widget */}
            <div className="mt-5 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                Your Public Store URL
              </p>
              <CopyLink path={storeUrl} />
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="mt-6 border-t border-line/60 pt-4 flex flex-wrap gap-2">
            <Link
              href="/dashboard/storefront"
              className="btn btn-secondary btn-sm"
            >
              <StorefrontIcon className="h-3.5 w-3.5 text-brand" />
              <span>Customize Storefront</span>
            </Link>
            <Link
              href="/dashboard/coupons"
              className="btn btn-secondary btn-sm"
            >
              <span>+ Create Coupon</span>
            </Link>
            <Link
              href={storeUrl}
              target="_blank"
              className="btn btn-ghost btn-sm ml-auto text-brand"
            >
              <span>Open Storefront</span>
              <ArrowUpRightIcon className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>

        {/* Right: Recent Orders */}
        <section className="card flex flex-col justify-between overflow-hidden">
          <div>
            <div className="flex items-center justify-between border-b border-line/60 px-6 py-4">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-ink">Recent Orders</h2>
                <span className="badge badge-muted text-[10px]">{recent.length}</span>
              </div>
              <Link
                href="/dashboard/orders"
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
              >
                <span>View all orders</span>
                <ArrowUpRightIcon className="h-3 w-3" />
              </Link>
            </div>

            {recent.length === 0 ? (
              <div className="p-8 text-center">
                <ReceiptIcon className="mx-auto h-8 w-8 text-muted" />
                <p className="mt-2 text-sm font-semibold text-ink">No orders yet</p>
                <p className="mt-1 text-xs text-muted">
                  Share your store link on your socials to generate your first sale.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-line/60">
                {recent.map((o) => (
                  <li
                    key={o.id}
                    className="flex items-center justify-between gap-3 px-6 py-3.5 text-sm transition-colors hover:bg-surface-2/60"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft font-bold text-xs text-brand">
                        {o.user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-ink text-sm">
                          {o.product.title}
                        </p>
                        <p className="truncate text-xs text-muted">
                          {o.user.name} · {dateFmt(o.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      <StatusBadge status={o.status} />
                      <span className="font-display font-bold tabular-nums text-ink text-sm">
                        <Money paise={o.totalPaise} />
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-line/60 bg-surface-2/40 px-6 py-3 text-xs text-muted flex items-center justify-between">
            <span>Instant UPI & card payments via Razorpay / Easebuzz</span>
            <Link href="/dashboard/orders" className="text-brand font-semibold hover:underline">
              Detailed export →
            </Link>
          </div>
        </section>
      </div>

      {/* 5. Two-Column Split: Top Products & Payout Settlement Card */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Products Catalog Summary (7 cols) */}
        <section className="card p-6 lg:col-span-7">
          <div className="flex items-center justify-between border-b border-line/60 pb-3">
            <div>
              <h2 className="text-base font-bold text-ink">Products in Catalog</h2>
              <p className="text-xs text-muted">Courses, digital downloads & memberships</p>
            </div>
            <Link
              href="/dashboard/products"
              className="text-xs font-semibold text-brand hover:underline"
            >
              View all ({productCount}) →
            </Link>
          </div>

          <div className="mt-3 divide-y divide-line/60">
            {productsList.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 py-3 text-sm"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="badge badge-brand text-[10px]">
                      {TYPE_LABEL[p.type] ?? p.type}
                    </span>
                    <span className="truncate font-semibold text-ink">
                      {p.title}
                    </span>
                  </div>
                  <p className="text-xs text-muted mt-0.5">
                    {p._count.orders} {p._count.orders === 1 ? "sale" : "sales"} ·{" "}
                    {p._count.enrollments} {p._count.enrollments === 1 ? "student" : "students"}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-display font-bold tabular-nums text-sm">
                    {p.pricePaise === 0 ? "Free" : formatINR(p.pricePaise)}
                  </span>
                  <Link
                    href={`/dashboard/products/${p.id}`}
                    className="btn btn-secondary btn-sm"
                  >
                    Edit
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Payout Settlement Overview (5 cols) */}
        <section className="card p-6 lg:col-span-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-line/60 pb-3">
              <h2 className="text-base font-bold text-ink">Payout & UPI Settlement</h2>
              <span className="badge badge-good text-[10px]">T+1 Active</span>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-start gap-3 rounded-xl border border-line bg-surface-2/60 p-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white border border-line shadow-2xs">
                  <UpiIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-muted uppercase tracking-wider">
                    Settlement VPA / UPI ID
                  </p>
                  <p className="font-mono text-sm font-bold text-ink truncate mt-0.5">
                    {creator.payoutUpiId || "Setup receiving UPI ID"}
                  </p>
                  <p className="text-[11px] text-muted mt-0.5">
                    Next cycle: Tomorrow, 09:00 AM IST
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-line/70 p-3.5 text-xs space-y-1.5 text-muted">
                <div className="flex justify-between">
                  <span>Gross collected:</span>
                  <span className="font-bold text-ink tabular-nums">{formatINR(grossPaise)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Net after fees:</span>
                  <span className="font-bold text-good tabular-nums">{formatINR(effectiveNetPaise)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Platform fee rate:</span>
                  <span className="font-mono text-ink">10% (Basic)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-line/60 pt-4 flex items-center justify-between">
            <span className="inline-flex items-center gap-1 text-[11px] text-muted">
              <ShieldCheckIcon className="h-3.5 w-3.5 text-good" />
              RBI Compliant Auto-Payouts
            </span>
            <Link
              href="/dashboard/payouts"
              className="btn btn-secondary btn-sm"
            >
              Payout ledger →
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
