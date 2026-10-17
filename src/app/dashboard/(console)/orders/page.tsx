import { ConfirmButton } from "@/components/ConfirmButton";
import type { Metadata } from "next";
import Link from "next/link";
import { approveUpiOrderAction, refundOrderAction, rejectUpiOrderAction } from "@/app/actions/creator";
import { Empty, Money, PageHeader, StatusBadge, dateFmt } from "@/components/ui";
import { requireCreator } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Orders" };
const FILTERS = ["all", "pending_approval", "paid", "refunded", "failed", "created"] as const;

export default async function OrdersPage({ searchParams }: PageProps<"/dashboard/orders">) {
  const { creator } = await requireCreator();
  const sp = await searchParams;
  const status = FILTERS.find((f) => f === sp.status) ?? "all";

  const pendingCount = await db.order.count({
    where: { creatorId: creator.id, status: "pending_approval" },
  });

  const orders = await db.order.findMany({
    where: { creatorId: creator.id, ...(status === "all" ? {} : { status }) },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: true, product: true, coupon: true },
  });

  return (
    <>
      <PageHeader title="Orders" sub="Every checkout, with its outcome." />
      {typeof sp.error === "string" && (
        <p role="alert" className="mb-4 rounded-xl bg-bad-soft px-4 py-3 text-sm font-medium text-bad">{sp.error.slice(0, 200)}</p>
      )}

      {/* Direct UPI Verification Notice for Creator */}
      {pendingCount > 0 && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <span className="flex h-3 w-3 mt-1 sm:mt-0 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
            </span>
            <div>
              <p className="font-bold text-sm text-ink">
                {pendingCount} direct UPI payment{pendingCount > 1 ? "s" : ""} awaiting your bank verification
              </p>
              <p className="text-xs text-muted">
                Match the 12-digit UTR against your PhonePe/GPay or bank statement, then click &ldquo;Verify &amp; Activate&rdquo; to unlock access.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/orders?status=pending_approval"
            className="btn btn-sm btn-primary shrink-0 self-start sm:self-auto"
          >
            Review ({pendingCount})
          </Link>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Filter by status">
        {FILTERS.map((f) => {
          let label = f as string;
          if (f === "created") label = "pending checkout";
          else if (f === "pending_approval") label = `Awaiting Verification (${pendingCount})`;

          return (
            <Link
              key={f}
              href={f === "all" ? "/dashboard/orders" : `/dashboard/orders?status=${f}`}
              role="tab"
              aria-selected={status === f}
              className={`btn btn-sm ${status === f ? "btn-primary" : "btn-secondary"} capitalize`}
            >
              {label}
            </Link>
          );
        })}
      </div>

      {orders.length === 0 ? (
        <Empty title="No orders here" body="Orders appear as soon as someone starts checkout." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Buyer</th>
                <th>Product</th>
                <th className="text-right">Total</th>
                <th>Status</th>
                <th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="whitespace-nowrap text-muted">{dateFmt(o.createdAt)}</td>
                  <td>
                    <p className="font-medium">{o.user.name}</p>
                    <p className="text-xs text-muted">{o.user.email}</p>
                    {o.providerPaymentId?.startsWith("upi_utr_") && (
                      <p className="mt-1 font-mono text-[11px] font-semibold text-emerald-700 bg-emerald-500/10 px-1.5 py-0.5 rounded inline-block">
                        UTR: {o.providerPaymentId.replace("upi_utr_", "")}
                      </p>
                    )}
                  </td>
                  <td>
                    {o.product.title}
                    {o.coupon && <span className="ml-2 badge badge-muted">{o.coupon.code}</span>}
                  </td>
                  <td className="text-right font-semibold tabular-nums"><Money paise={o.totalPaise} /></td>
                  <td><StatusBadge status={o.status} /></td>
                  <td className="whitespace-nowrap text-right space-x-1.5">
                    {o.status === "pending_approval" && (
                      <div className="inline-flex items-center gap-1.5">
                        <form action={approveUpiOrderAction.bind(null, o.id)} className="inline">
                          <button
                            type="submit"
                            className="btn btn-sm bg-good text-white hover:bg-emerald-600 font-bold shadow-xs active:scale-[0.98]"
                          >
                            ✓ Verify &amp; Activate
                          </button>
                        </form>
                        <form action={rejectUpiOrderAction.bind(null, o.id)} className="inline">
                          <ConfirmButton
                            className="btn btn-ghost btn-sm text-bad hover:bg-bad-soft"
                            message="Reject this payment? The buyer will be notified that the UTR could not be verified in your account."
                          >
                            Reject
                          </ConfirmButton>
                        </form>
                      </div>
                    )}
                    {(o.status === "paid" || o.status === "refunded") && (
                      <Link href={`/orders/${o.id}/invoice`} className="btn btn-ghost btn-sm">Invoice</Link>
                    )}
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
      <p className="mt-3 text-xs text-muted">
        When a buyer submits direct UPI payment, verify the 12-digit UTR in your bank app before clicking &ldquo;Verify &amp; Activate&rdquo;.
      </p>
    </>
  );
}
