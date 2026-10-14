import { ConfirmButton } from "@/components/ConfirmButton";
import type { Metadata } from "next";
import Link from "next/link";
import { refundOrderAction } from "@/app/actions/creator";
import { Empty, Money, PageHeader, StatusBadge, dateFmt } from "@/components/ui";
import { requireCreator } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Orders" };
const FILTERS = ["all", "paid", "refunded", "failed", "created"] as const;

export default async function OrdersPage({ searchParams }: PageProps<"/dashboard/orders">) {
  const { creator } = await requireCreator();
  const sp = await searchParams;
  const status = FILTERS.find((f) => f === sp.status) ?? "all";
  const orders = await db.order.findMany({
    where: { creatorId: creator.id, ...(status === "all" ? {} : { status }) },
    orderBy: { createdAt: "desc" }, take: 200,
    include: { user: true, product: true, coupon: true },
  });
  return (
    <>
      <PageHeader title="Orders" sub="Every checkout, with its outcome." />
      {typeof sp.error === "string" && (
        <p role="alert" className="mb-4 rounded-xl bg-bad-soft px-4 py-3 text-sm font-medium text-bad">{sp.error.slice(0, 200)}</p>
      )}
      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Filter by status">
        {FILTERS.map((f) => (
          <Link key={f} href={f === "all" ? "/dashboard/orders" : `/dashboard/orders?status=${f}`} role="tab" aria-selected={status === f}
            className={`btn btn-sm ${status === f ? "btn-primary" : "btn-secondary"} capitalize`}>{f === "created" ? "pending" : f}</Link>
        ))}
      </div>
      {orders.length === 0 ? (
        <Empty title="No orders here" body="Orders appear as soon as someone starts checkout." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead><tr><th>Date</th><th>Buyer</th><th>Product</th><th className="text-right">Total</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="whitespace-nowrap text-muted">{dateFmt(o.createdAt)}</td>
                  <td><p className="font-medium">{o.user.name}</p><p className="text-xs text-muted">{o.user.email}</p></td>
                  <td>{o.product.title}{o.coupon && <span className="ml-2 badge badge-muted">{o.coupon.code}</span>}</td>
                  <td className="text-right font-semibold tabular-nums"><Money paise={o.totalPaise} /></td>
                  <td><StatusBadge status={o.status === "created" ? "created" : o.status} /></td>
                  <td className="whitespace-nowrap text-right">
                    {(o.status === "paid" || o.status === "refunded") && <Link href={`/orders/${o.id}/invoice`} className="btn btn-ghost btn-sm">Invoice</Link>}
                    {o.status === "paid" && (
                      <form action={refundOrderAction.bind(null, o.id)} className="inline">
                        <ConfirmButton className="btn btn-danger btn-sm" message="Mark this order refunded? The buyer loses access immediately. You must send the money back from Razorpay yourself.">Mark refunded</ConfirmButton>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs text-muted">“Mark refunded” revokes the buyer&apos;s access and removes the order from payouts. Send the money back from your Razorpay dashboard.</p>
    </>
  );
}
