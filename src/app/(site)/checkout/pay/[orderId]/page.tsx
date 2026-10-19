import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { startEasebuzzPayment } from "@/app/actions/checkout";
import { ActionForm, Field, FormError, SubmitButton } from "@/components/form";
import { DemoPayPageClient } from "@/components/DemoPayPageClient";
import { RazorpayButton } from "@/components/RazorpayButton";
import { Money } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { isOrderFresh } from "@/lib/orders";
import { getProvider } from "@/lib/payments";
import { resolveGateway } from "@/lib/payments/gateways";

import { getCreatorIntegrations } from "@/lib/integrations/service";

export const metadata: Metadata = { title: "Pay" };

export default async function PayPage({ params, searchParams }: PageProps<"/checkout/pay/[orderId]">) {
  const { orderId } = await params;
  const sp = await searchParams;
  const user = await requireUser();
  const order = await db.order.findFirst({
    where: { id: orderId, userId: user.id },
    include: { product: true, creator: true },
  });
  if (!order) notFound();
  if (order.status === "paid") redirect(`/checkout/success/${order.id}`);
  if (order.status === "pending_approval") redirect(`/checkout/status/${order.id}`);
  if (order.status === "refunded") redirect("/library");
  if (!isOrderFresh(order.createdAt)) redirect(`/checkout/${order.productId}`);

  const failed = sp.failed === "1" || order.status === "failed";
  const provider = getProvider();
  const integrations = await getCreatorIntegrations(order.creatorId);

  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
      <div className="text-center sm:text-left mb-6">
        <span className="badge badge-brand text-[11px] font-bold uppercase tracking-wider mb-2">
          Secure Payment
        </span>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink font-display">
          Complete Your Purchase
        </h1>
        <p className="text-sm text-muted mt-1">Review your order details and choose your payment method.</p>
      </div>

      <div className="card p-6 sm:p-7 shadow-sm rounded-[24px]">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-5">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Item Description</span>
            <p className="font-bold text-lg text-ink">{order.product.title}</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted block">Total Payable</span>
            <p className="text-3xl font-black text-ink tracking-tight"><Money paise={order.totalPaise} /></p>
            <span className="text-[10px] text-muted block">Includes 18% GST</span>
          </div>
        </div>

        {failed && (
          <p role="alert" className="mt-4 rounded-xl bg-bad-soft px-3.5 py-2.5 text-xs font-semibold text-bad">
            The previous payment attempt was declined or cancelled. No funds were debited. You can try again below.
          </p>
        )}

        <div className="mt-6">
          {order.provider === "razorpay" && provider.name === "razorpay" && provider.publicKey ? (
            <RazorpayButton
              orderId={order.id}
              providerOrderId={order.providerOrderId}
              keyId={provider.publicKey}
              amountPaise={order.totalPaise}
              title={order.product.title}
              buyer={{ name: user.name, email: user.email }}
              label={`Pay ${new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(order.totalPaise / 100)}`}
            />
          ) : order.provider === "easebuzz" && provider.name === "easebuzz" ? (
            <ActionForm action={startEasebuzzPayment.bind(null, order.id)} className="space-y-4">
              <Field
                name="phone"
                label="Mobile number"
                type="tel"
                autoComplete="tel-national"
                placeholder="10-digit mobile number"
                hint="Required by the payment gateway."
                required
              />
              <FormError />
              <SubmitButton pendingText="Opening secure payment page…" className="btn btn-primary btn-lg w-full">
                Pay securely with Easebuzz
              </SubmitButton>
              {process.env.EASEBUZZ_ENV !== "prod" && (
                <p className="rounded-xl bg-warn-soft px-3.5 py-2.5 text-xs">
                  <strong>Test mode.</strong> Easebuzz sandbox: use a test card on the next page. No real money moves.
                </p>
              )}
            </ActionForm>
          ) : (
            <DemoPayPageClient
              orderId={order.id}
              amountPaise={order.totalPaise}
              productTitle={order.product.title}
              initialGateway={order.provider === "jodo" ? "jodo" : resolveGateway(sp.gw, user.preferredGateway || "jodo")}
              buyer={{ name: user.name, email: user.email }}
              failed={failed}
              creatorUpiId={order.creator?.payoutUpiId ?? undefined}
              gatewaysConfig={integrations.paymentGateways}
            />
          )}
        </div>
      </div>
    </div>
  );
}
