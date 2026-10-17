import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Money } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

import { simulatedPaymentsAllowed } from "@/lib/payments/demo-mode";
import { resetDemoEnrollmentAction } from "@/app/actions/checkout";

export const metadata: Metadata = { title: "You're in" };

export default async function SuccessPage({ params }: PageProps<"/checkout/success/[orderId]">) {
  const { orderId } = await params;
  const user = await requireUser();
  const order = await db.order.findFirst({ where: { id: orderId, userId: user.id }, include: { product: true, creator: true } });
  if (!order) notFound();
  if (order.status !== "paid") redirect(`/checkout/pay/${order.id}`);

  const isDemo = simulatedPaymentsAllowed();

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-good-soft text-2xl text-good" aria-hidden>✓</div>
      <h1 className="mt-5 text-3xl font-extrabold">You&apos;re in!</h1>
      <p className="mt-2 text-muted">
        {order.product.title} by {order.creator.displayName} is now in your library.
      </p>
      <div className="card mt-8 p-5 text-left text-sm">
        <div className="flex justify-between"><span className="text-muted">Invoice</span><span className="font-mono">{order.invoiceNo}</span></div>
        <div className="mt-2 flex justify-between"><span className="text-muted">{order.totalPaise === 0 ? "Total" : "Paid"}</span><span className="font-semibold">{order.totalPaise === 0 ? "Free" : <Money paise={order.totalPaise} />}</span></div>
        {order.providerPaymentId && (
          <div className="mt-2 flex justify-between">
            <span className="text-muted">Payment Ref</span>
            <span className="font-mono text-xs font-semibold text-ink">
              {order.providerPaymentId.startsWith("upi_utr_")
                ? `UPI UTR: ${order.providerPaymentId.replace("upi_utr_", "")}`
                : order.providerPaymentId}
            </span>
          </div>
        )}
      </div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link href={`/library/${order.productId}`} className="btn btn-primary btn-lg">Start now</Link>
        <Link href={`/orders/${order.id}/invoice`} className="btn btn-secondary btn-lg">View invoice</Link>
      </div>

      {isDemo && (
        <div className="mt-10 pt-6 border-t border-line text-center space-y-2">
          <p className="text-xs text-muted">
            Want to re-test the ₹1 UPI flow from scratch?
          </p>
          <form
            action={async () => {
              "use server";
              await resetDemoEnrollmentAction(order.productId, `/c/${order.creator.handle}/${order.product.slug}`);
            }}
          >
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-surface-2 hover:bg-line border border-line text-ink transition active:scale-[0.98]"
            >
              🔄 Reset Enrollment & Re-test ₹1 Checkout
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
