import type { Metadata } from "next";
import Link from "next/link";
import { CopyLink } from "@/components/CopyLink";
import { IconCheck } from "@/components/icons";
import {
  BarChart,
  ButtonLink,
  DateCell,
  EmptyRow,
  Money,
  MoneyCell,
  PageHeader,
  StatStrip,
  StatusBadge,
  Table,
  Td,
  Th,
  Tr,
} from "@/components/ui";
import { requireCreator } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/format";
import { nowMs } from "@/lib/time";
import { SERIES_DAYS, buildRevenueSeries, seriesStart } from "./overview-series";

export const metadata: Metadata = { title: "Dashboard" };

export default async function Overview() {
  const { creator } = await requireCreator();
  const now = nowMs();

  const [paid, ledger, learners, productCount, publishedCount, couponCount, recent, lastDays] = await Promise.all([
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
    // From the start of the oldest bar's IST day, so the first bar counts the whole day.
    db.order.findMany({
      where: { creatorId: creator.id, status: "paid", paidAt: { gte: seriesStart(now) } },
      select: { paidAt: true, totalPaise: true },
    }),
  ]);

  const series = buildRevenueSeries(now, lastDays);
  const total = series.reduce((sum, p) => sum + p.value, 0);
  const chartLabel = `Gross revenue, last ${SERIES_DAYS} days (${series[0].label} to ${series[SERIES_DAYS - 1].label}): ${formatINR(total)} in total`;
  const storeUrl = `/c/${creator.handle}`;

  const steps = [
    { done: publishedCount > 0, label: "Publish your first product", href: "/dashboard/products/new" },
    { done: couponCount > 0, label: "Create a launch coupon", href: "/dashboard/coupons" },
    { done: (paid._count ?? 0) > 0, label: "Make your first sale", href: storeUrl },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const setupIncomplete = doneCount < steps.length;

  return (
    <>
      <PageHeader
        title="Overview"
        sub={`Welcome back, ${creator.displayName}.`}
        actions={<ButtonLink href="/dashboard/products/new">New product</ButtonLink>}
      />

      <div className="-mt-2 mb-6 max-w-md">
        <p className="t-label">Your store link</p>
        <div className="mt-2">
          <CopyLink path={storeUrl} />
        </div>
      </div>

      <StatStrip
        items={[
          { label: "Revenue", value: <Money paise={paid._sum.totalPaise ?? 0} />, sub: "Gross, paid orders" },
          { label: "Net earnings", value: <Money paise={ledger._sum.netPaise ?? 0} />, sub: "After platform & gateway fees" },
          { label: "Orders", value: paid._count, sub: "Paid" },
          { label: "Learners", value: learners.length, sub: `${productCount} ${productCount === 1 ? "product" : "products"}` },
        ]}
      />

      <section className="mt-8" aria-labelledby="overview-revenue">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="overview-revenue" className="text-base font-semibold">Revenue, last {SERIES_DAYS} days</h2>
          <p className="text-sm text-muted tabular-nums"><Money paise={total} /> gross</p>
        </div>
        <BarChart className="mt-4" data={series} label={chartLabel} positiveMoney />
      </section>

      {setupIncomplete && (
        <section aria-labelledby="overview-setup" className="mt-10 min-w-0">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="overview-setup" className="text-base font-semibold">Get set up</h2>
            <p className="text-sm text-muted tabular-nums">{doneCount} of {steps.length} done</p>
          </div>
          <ol className="mt-2 divide-y divide-line border-y border-line">
            {steps.map((s) => (
              <li key={s.label} className="flex items-center gap-3 py-3 text-sm">
                <span
                  aria-hidden="true"
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${s.done ? "bg-good text-surface" : "border border-line-strong"}`}
                >
                  {s.done && <IconCheck size={12} />}
                </span>
                <Link href={s.href} className={s.done ? "text-muted hover:text-ink" : "font-medium hover:underline"}>
                  <span className="sr-only">{s.done ? "Done: " : "To do: "}</span>
                  {s.label}
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section aria-labelledby="overview-recent" className="mt-10 min-w-0">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="overview-recent" className="text-base font-semibold">Recent orders</h2>
          <Link href="/dashboard/orders" className="text-sm font-medium underline-offset-4 hover:underline">View all</Link>
        </div>
        <Table caption="Recent orders" stack className="mt-2">
          <thead>
            <tr>
              <Th>Product</Th>
              <Th>Learner</Th>
              <Th>Status</Th>
              <Th align="right">Amount</Th>
              <Th>Date</Th>
            </tr>
          </thead>
          <tbody>
            {recent.length === 0 ? (
              <EmptyRow
                colSpan={5}
                title="No orders yet"
                body="Share your store link to get your first sale."
                action={<ButtonLink variant="secondary" href={storeUrl}>View your store</ButtonLink>}
              />
            ) : (
              recent.map((o) => (
                <Tr key={o.id}>
                  <Td label="Product" className="font-medium"><span className="block min-w-0 max-w-56 truncate">{o.product.title}</span></Td>
                  <Td label="Learner"><span className="block min-w-0 max-w-40 truncate">{o.user.name}</span></Td>
                  <Td label="Status"><StatusBadge status={o.status} /></Td>
                  <MoneyCell label="Amount" paise={o.totalPaise} />
                  <DateCell label="Date" date={o.createdAt} />
                </Tr>
              ))
            )}
          </tbody>
        </Table>
      </section>
    </>
  );
}
