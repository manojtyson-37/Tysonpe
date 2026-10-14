import type { Metadata } from "next";
import Link from "next/link";
import { CopyLink } from "@/components/CopyLink";
import { Money, PageHeader, Stat, StatusBadge, dateFmt } from "@/components/ui";
import { requireCreator } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Dashboard" };

const istDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);

export default async function Overview() {
  const { creator } = await requireCreator();
  const since = new Date(Date.now() - 13 * 864e5);

  const [paid, ledger, learners, productCount, publishedCount, couponCount, recent, last14] = await Promise.all([
    db.order.aggregate({ where: { creatorId: creator.id, status: "paid" }, _sum: { totalPaise: true }, _count: true }),
    db.ledgerEntry.aggregate({ where: { creatorId: creator.id, order: { status: "paid" } }, _sum: { netPaise: true } }),
    db.enrollment.findMany({ where: { product: { creatorId: creator.id } }, distinct: ["userId"], select: { userId: true } }),
    db.product.count({ where: { creatorId: creator.id } }),
    db.product.count({ where: { creatorId: creator.id, status: "published" } }),
    db.coupon.count({ where: { creatorId: creator.id } }),
    db.order.findMany({
      where: { creatorId: creator.id, status: { not: "created" } },
      orderBy: { createdAt: "desc" }, take: 6, include: { user: true, product: true },
    }),
    db.order.findMany({ where: { creatorId: creator.id, status: "paid", paidAt: { gte: since } }, select: { paidAt: true, totalPaise: true } }),
  ]);

  const days = Array.from({ length: 14 }, (_, i) => istDay(new Date(Date.now() - (13 - i) * 864e5)));
  const byDay = new Map(days.map((d) => [d, 0]));
  for (const o of last14) if (o.paidAt) byDay.set(istDay(o.paidAt), (byDay.get(istDay(o.paidAt)) ?? 0) + o.totalPaise);
  const series = days.map((d) => ({ d, v: byDay.get(d) ?? 0 }));
  const max = Math.max(1, ...series.map((s) => s.v));
  const storeUrl = `/c/${creator.handle}`;

  const steps = [
    { done: publishedCount > 0, label: "Publish your first product", href: "/dashboard/products/new" },
    { done: couponCount > 0, label: "Create a launch coupon", href: "/dashboard/coupons" },
    { done: (paid._count ?? 0) > 0, label: "Make your first sale", href: storeUrl },
  ];

  return (
    <>
      <PageHeader title="Overview" sub={`Welcome back, ${creator.displayName}.`} action={<Link href="/dashboard/products/new" className="btn btn-primary">New product</Link>} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Revenue" value={<Money paise={paid._sum.totalPaise ?? 0} />} sub="Gross, paid orders" />
        <Stat label="Net earnings" value={<Money paise={ledger._sum.netPaise ?? 0} />} sub="After platform & gateway fees" />
        <Stat label="Orders" value={paid._count} sub="Paid" />
        <Stat label="Learners" value={learners.length} sub={`${productCount} ${productCount === 1 ? "product" : "products"}`} />
      </div>

      <section className="card mt-6 p-6" aria-label="Revenue, last 14 days">
        <h2 className="font-semibold">Revenue · last 14 days</h2>
        <div className="mt-5 flex h-36 items-end gap-1.5" role="img" aria-label={`Daily revenue for the last 14 days, peak ${(max / 100).toFixed(0)} rupees`}>
          {series.map((s) => (
            <div key={s.d} className="group relative flex h-full flex-1 items-end" title={`${s.d}: ₹${(s.v / 100).toLocaleString("en-IN")}`}>
              <div className={`w-full rounded-t-md ${s.v ? "bg-brand" : "bg-surface-2"}`} style={{ height: `${Math.max(s.v ? 6 : 3, (s.v / max) * 100)}%` }} />
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-xs text-muted"><span>{series[0].d}</span><span>{series[13].d}</span></div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <h2 className="font-semibold">Get set up</h2>
          <ul className="mt-4 space-y-3">
            {steps.map((s) => (
              <li key={s.label} className="flex items-center gap-3 text-sm">
                <span aria-hidden className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${s.done ? "bg-good text-bg" : "border border-line"}`}>{s.done ? "✓" : ""}</span>
                <Link href={s.href} className={s.done ? "text-muted line-through" : "font-medium hover:text-brand"}>{s.label}</Link>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted">Your store link</p>
          <CopyLink path={storeUrl} />
        </section>

        <section className="card overflow-hidden">
          <div className="flex items-center justify-between px-6 pt-6">
            <h2 className="font-semibold">Recent orders</h2>
            <Link href="/dashboard/orders" className="text-sm font-medium text-brand hover:underline">View all</Link>
          </div>
          {recent.length === 0 ? (
            <p className="px-6 pb-8 pt-4 text-sm text-muted">No orders yet. Share your store link to get started.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {recent.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 px-6 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{o.product.title}</p>
                    <p className="truncate text-xs text-muted">{o.user.name} · {dateFmt(o.createdAt)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3"><StatusBadge status={o.status} /><span className="tabular-nums font-semibold"><Money paise={o.totalPaise} /></span></div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
