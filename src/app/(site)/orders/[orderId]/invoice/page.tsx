import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/PrintButton";
import { MetricList, MetricRow, Money, Surface, dateFmt } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Invoice" };

export default async function InvoicePage({ params }: PageProps<"/orders/[orderId]/invoice">) {
  const { orderId } = await params;
  const user = await requireUser(`/orders/${orderId}/invoice`);
  const order = await db.order.findFirst({
    where: {
      id: orderId,
      status: { in: ["paid", "refunded"] },
      OR: [{ userId: user.id }, { creator: { userId: user.id } }], // buyer or the seller
    },
    include: { user: true, product: true, creator: true, coupon: true },
  });
  if (!order) notFound();

  const taxable = order.totalPaise - order.gstPaise;
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-4 flex justify-end"><PrintButton /></div>
      <Surface as="article" tone="paper" padding="lg" className="print:border-0 print:p-0">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-6">
          <div>
            <h1 className="text-2xl font-extrabold">Tax invoice</h1>
            <p className="mt-1 font-mono text-sm text-muted">{order.invoiceNo}</p>
          </div>
          <div className="text-right text-sm">
            <p className="text-muted">Date</p>
            <p className="font-semibold">{dateFmt(order.paidAt)}</p>
            {order.status === "refunded" && <p className="badge badge-bad mt-2">Refunded {dateFmt(order.refundedAt)}</p>}
          </div>
        </header>

        <section className="grid gap-6 border-b border-line py-6 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Sold by</p>
            <p className="mt-1 font-semibold">{order.creator.displayName}</p>
            <p className="text-muted">via Tysonpe · /c/{order.creator.handle}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Billed to</p>
            <p className="mt-1 font-semibold">{order.user.name}</p>
            <p className="text-muted">{order.user.email}</p>
          </div>
        </section>

        <table className="table mt-2">
          <thead><tr><th>Item</th><th className="text-right">Amount</th></tr></thead>
          <tbody>
            <tr><td>{order.product.title}</td><td className="text-right"><Money paise={order.subtotalPaise} /></td></tr>
            {order.discountPaise > 0 && (
              <tr><td>Discount{order.coupon ? ` (${order.coupon.code})` : ""}</td><td className="text-right"><Money paise={-order.discountPaise} /></td></tr>
            )}
          </tbody>
        </table>

        <MetricList className="ml-auto mt-4 w-full max-w-xs">
          <MetricRow label="Taxable value" value={<Money paise={taxable} />} />
          <MetricRow label={`GST @ ${order.gstRatePct}% (included)`} value={<Money paise={order.gstPaise} />} />
          <MetricRow label="Total paid" value={<Money paise={order.totalPaise} />} strong />
        </MetricList>
        <p className="mt-8 text-xs text-muted">Payment reference: {order.providerPaymentId ?? "—"} ({order.provider}). This is a system-generated invoice. Payments in test mode are simulated; no real money moved.</p>
      </Surface>
    </div>
  );
}
