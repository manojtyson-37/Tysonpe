import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Money, dateFmt } from "@/components/ui";
import { getCurrentUser, requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { simulatedPaymentsAllowed } from "@/lib/payments/demo-mode";
import { approveUpiOrderAction } from "@/app/actions/creator";
import { resetDemoEnrollmentAction } from "@/app/actions/checkout";

export const metadata: Metadata = { title: "Order Status" };

export default async function OrderStatusPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const user = await requireUser();
  const order = await db.order.findFirst({
    where: { id: orderId, userId: user.id },
    include: { product: true, creator: true },
  });

  if (!order) notFound();

  // If already paid, send straight to celebration
  if (order.status === "paid") redirect(`/checkout/success/${order.id}`);

  const currentUser = await getCurrentUser();
  const isCreatorOfOrder = currentUser?.creator?.id === order.creatorId;
  const isDemo = simulatedPaymentsAllowed();

  const utr = order.providerPaymentId?.replace("upi_utr_", "") ?? "Pending";

  return (
    <div className="mx-auto max-w-lg px-4 py-12 sm:px-6">
      {/* Status Icon */}
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/15 text-2xl text-amber-600 ring-8 ring-amber-500/5">
          <span className="animate-pulse">⏳</span>
        </div>
        <h1 className="mt-5 text-2xl sm:text-3xl font-extrabold text-ink font-display">
          Awaiting Creator Verification
        </h1>
        <p className="mt-2 text-sm text-muted">
          Your payment confirmation has been sent to <strong className="text-ink">{order.creator.displayName}</strong>.
        </p>
      </div>

      {/* Order Details Card */}
      <div className="card mt-8 p-6 space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-line text-sm">
          <span className="text-muted">Item</span>
          <span className="font-semibold text-ink text-right">{order.product.title}</span>
        </div>

        <div className="flex justify-between items-center pb-3 border-b border-line text-sm">
          <span className="text-muted">Amount</span>
          <span className="font-bold text-ink"><Money paise={order.totalPaise} /></span>
        </div>

        <div className="flex justify-between items-center pb-3 border-b border-line text-sm">
          <span className="text-muted">Payee UPI VPA</span>
          <span className="font-mono text-xs font-semibold text-ink">
            {order.creator.payoutUpiId || "7619671728@ybl"}
          </span>
        </div>

        <div className="flex justify-between items-center pb-3 border-b border-line text-sm">
          <span className="text-muted">Submitted UTR</span>
          <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded">
            {utr}
          </span>
        </div>

        <div className="flex justify-between items-center text-sm">
          <span className="text-muted">Status</span>
          <span className="badge badge-warn font-semibold">
            Pending Creator Review
          </span>
        </div>
      </div>

      {/* Explainer Steps */}
      <div className="mt-6 rounded-2xl bg-surface-2 border border-line p-5 text-xs text-muted space-y-3 leading-relaxed">
        <p className="font-bold text-ink text-sm">What happens next?</p>
        <ol className="list-decimal pl-4 space-y-1.5">
          <li>
            The creator verifies that ₹{(order.totalPaise / 100).toFixed(2)} with UTR <strong className="font-mono text-ink">{utr}</strong> was credited to their bank account.
          </li>
          <li>
            Upon verification, they click <strong className="text-ink">&ldquo;Verify &amp; Activate&rdquo;</strong> in their creator console.
          </li>
          <li>
            Your course is immediately unlocked in your <strong className="text-ink">Library</strong> and an official GST invoice is generated.
          </li>
        </ol>
      </div>

      {/* Refresh / Check Action */}
      <div className="mt-6 flex flex-col gap-3">
        <Link
          href={`/checkout/status/${order.id}`}
          className="btn btn-secondary btn-lg w-full text-center"
        >
          🔄 Refresh Verification Status
        </Link>
      </div>

      {/* Demo / Creator Test Trigger */}
      {(isCreatorOfOrder || isDemo) && (
        <div className="mt-8 pt-6 border-t border-line text-center space-y-3">
          <span className="badge badge-brand text-[10px] font-extrabold uppercase">
            Testing &amp; Demo Tools
          </span>
          <p className="text-xs text-muted">
            You can verify this order directly as the creator right now:
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <form action={approveUpiOrderAction.bind(null, order.id)}>
              <button
                type="submit"
                className="btn btn-primary btn-sm w-full sm:w-auto bg-good hover:bg-emerald-600 font-bold"
              >
                ✓ Approve &amp; Activate Access Now
              </button>
            </form>
            <Link
              href="/dashboard/orders?status=pending_approval"
              className="btn btn-secondary btn-sm"
            >
              Open Creator Dashboard
            </Link>
          </div>

          <form
            action={async () => {
              "use server";
              await resetDemoEnrollmentAction(order.productId, `/c/${order.creator.handle}/${order.product.slug}`);
            }}
            className="pt-2"
          >
            <button
              type="submit"
              className="text-xs text-muted hover:text-ink underline"
            >
              Reset enrollment &amp; restart checkout
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
