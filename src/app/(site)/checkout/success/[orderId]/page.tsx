import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { IconCheck } from "@/components/icons";
import { MetricList, MetricRow, Money, Surface } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "You're in." };

export default async function SuccessPage({ params }: PageProps<"/checkout/success/[orderId]">) {
  const { orderId } = await params;
  const user = await requireUser();
  const order = await db.order.findFirst({ where: { id: orderId, userId: user.id }, include: { product: true, creator: true } });
  if (!order) notFound();
  if (order.status !== "paid") redirect(`/checkout/pay/${order.id}`);

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
      {/* The one success moment: the check pops in once (320ms, transform and opacity). Static under reduced motion. */}
      <div className="reveal-pop mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-good-soft text-good">
        <IconCheck size={28} />
      </div>
      <h1 className="mt-5 text-3xl font-extrabold">You&apos;re in.</h1>
      <p className="mt-2 text-muted">
        {order.product.title} by {order.creator.displayName} is now in your library.
      </p>
      <Surface padding="md" className="mt-8 text-left">
        <MetricList>
          <MetricRow label="Invoice" value={<span className="font-mono">{order.invoiceNo}</span>} />
          <MetricRow
            label={order.totalPaise === 0 ? "Total" : "Paid"}
            value={order.totalPaise === 0 ? <span className="font-semibold">Free</span> : <Money paise={order.totalPaise} className="font-semibold" />}
          />
        </MetricList>
      </Surface>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link href={`/library/${order.productId}`} className="btn btn-primary btn-lg pointer-coarse:min-h-11">Start now</Link>
        <Link href={`/orders/${order.id}/invoice`} className="btn btn-secondary btn-lg pointer-coarse:min-h-11">View invoice</Link>
      </div>
    </div>
  );
}
