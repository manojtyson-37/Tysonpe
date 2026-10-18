import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Money } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getCreatorIntegrations } from "@/lib/integrations/service";
import { TrackingPixels } from "@/components/integrations/TrackingPixels";
import { simulatedPaymentsAllowed } from "@/lib/payments/demo-mode";
import { resetDemoEnrollmentAction } from "@/app/actions/checkout";

export const metadata: Metadata = { title: "You're in" };

export default async function SuccessPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const user = await requireUser();
  const order = await db.order.findFirst({
    where: { id: orderId, userId: user.id },
    include: { product: true, creator: true },
  });
  if (!order) notFound();
  if (order.status !== "paid") redirect(`/checkout/pay/${order.id}`);

  const integrations = await getCreatorIntegrations(order.creatorId);
  const isDemo = simulatedPaymentsAllowed();

  return (
    <>
      <TrackingPixels
        config={integrations.tracking}
        event={{
          name: "Purchase",
          valuePaise: order.totalPaise,
          orderId: order.id,
          itemTitle: order.product.title,
        }}
      />
      <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
        <div
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-good-soft text-2xl text-good"
          aria-hidden
        >
          ✓
        </div>
        <h1 className="mt-5 text-3xl font-extrabold font-display">You&apos;re in!</h1>
        <p className="mt-2 text-muted">
          {order.product.title} by {order.creator.displayName} is now in your library.
        </p>

        {/* Telegram VIP Channel Invite (if enabled) */}
        {integrations.telegram?.autoInviteOnPurchase && integrations.telegram.channelUrl && (
          <div className="card mt-6 p-4 text-left border-2 border-brand/30 bg-surface-2/60">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-brand">
                  Private VIP Community
                </span>
                <p className="text-sm font-bold text-ink mt-0.5">
                  {integrations.telegram.groupName || "Official Telegram Channel"}
                </p>
                <p className="text-xs text-muted mt-1">
                  Connect with fellow members, ask questions, and get exclusive announcements.
                </p>
              </div>
              <a
                href={integrations.telegram.channelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-sm shrink-0"
              >
                Join Telegram →
              </a>
            </div>
          </div>
        )}

        {/* Live Class / Webinar Instructions (if applicable) */}
        {integrations.liveClass?.meetingUrl &&
          (order.product.type === "webinar" || order.product.type === "consultation") && (
            <div className="card mt-6 p-4 text-left border border-line bg-surface-2/40">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                Live Class Details ({integrations.liveClass.defaultProvider.toUpperCase()})
              </span>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                {integrations.liveClass.instructions}
              </p>
              <a
                href={integrations.liveClass.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:underline"
              >
                Access Live Room ({integrations.liveClass.meetingUrl}) →
              </a>
            </div>
          )}

        <div className="card mt-8 p-5 text-left text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Invoice</span>
            <span className="font-mono">{order.invoiceNo}</span>
          </div>
          <div className="mt-2 flex justify-between">
            <span className="text-muted">{order.totalPaise === 0 ? "Total" : "Paid"}</span>
            <span className="font-semibold tabular-nums">
              {order.totalPaise === 0 ? "Free" : <Money paise={order.totalPaise} />}
            </span>
          </div>
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
          <Link href={`/library/${order.productId}`} className="btn btn-primary btn-lg">
            Start now
          </Link>
          <Link href={`/orders/${order.id}/invoice`} className="btn btn-secondary btn-lg">
            View invoice
          </Link>
        </div>

        {isDemo && (
          <div className="mt-10 pt-6 border-t border-line text-center space-y-2">
            <p className="text-xs text-muted">Want to re-test the ₹1 UPI flow from scratch?</p>
            <form
              action={async () => {
                "use server";
                await resetDemoEnrollmentAction(
                  order.productId,
                  `/c/${order.creator.handle}/${order.product.slug}`
                );
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
    </>
  );
}
