import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { startEasebuzzPayment } from "@/app/actions/checkout";
import { ActionForm, Field, FormError, SubmitButton } from "@/components/form";
import { DemoPayPageClient } from "@/components/DemoPayPageClient";
import { RazorpayButton } from "@/components/RazorpayButton";
import { ButtonLink, Callout, MetricList, MetricRow, Money, PageHeader, Surface } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { isOrderFresh } from "@/lib/orders";
import { getProvider } from "@/lib/payments";
import { resolveGateway } from "@/lib/payments/gateways";

export const metadata: Metadata = { title: "Pay" };

export default async function PayPage({ params, searchParams }: PageProps<"/checkout/pay/[orderId]">) {
  const { orderId } = await params;
  const sp = await searchParams;
  const user = await requireUser();
  const order = await db.order.findFirst({ where: { id: orderId, userId: user.id }, include: { product: true } });
  if (!order) notFound();
  if (order.status === "paid") redirect(`/checkout/success/${order.id}`);
  if (order.status === "refunded") redirect("/library");
  if (!isOrderFresh(order.createdAt)) redirect(`/checkout/${order.productId}`);

  const failed = sp.failed === "1" || order.status === "failed";
  const provider = getProvider();

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <PageHeader title="Complete your purchase" sub="Review your order and choose how to pay." />

      <Surface as="section" aria-labelledby="pay-order-heading" padding="lg">
        <h2 id="pay-order-heading" className="t-label">Your order</h2>
        <p className="mt-2 text-lg font-semibold">{order.product.title}</p>
        {/* The order's own snapshot: it prints the GST rate it was charged at, not today's product rate. */}
        <MetricList className="mt-4 border-t border-line">
          <MetricRow label="Total payable" value={<Money paise={order.totalPaise} size="lg" />} strong />
          {order.gstPaise > 0 && (
            <MetricRow label={`Includes GST (${order.gstRatePct}%)`} value={<Money paise={order.gstPaise} />} />
          )}
        </MetricList>

        {failed && (
          <Callout tone="bad" className="mt-4">
            The previous attempt didn&apos;t complete. Check your bank statement before retrying; nothing is charged in test mode.
          </Callout>
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
              label={`Pay ${formatINR(order.totalPaise)}`}
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
              <SubmitButton pendingText="Opening the Easebuzz page…" size="lg" className="w-full">
                Continue to Easebuzz
              </SubmitButton>
              {process.env.EASEBUZZ_ENV !== "prod" && (
                <Callout tone="info">
                  <strong>Test mode.</strong> Easebuzz sandbox: use a test card on the next page. No real money moves.
                </Callout>
              )}
            </ActionForm>
          ) : order.provider === "mock" && provider.name === "mock" ? (
            <DemoPayPageClient
              orderId={order.id}
              amountPaise={order.totalPaise}
              productTitle={order.product.title}
              initialGateway={resolveGateway(sp.gw, user.preferredGateway)}
              buyer={{ name: user.name, email: user.email }}
            />
          ) : (
            <Callout
              tone="bad"
              action={
                <ButtonLink variant="secondary" href={`/checkout/${order.productId}`}>
                  Start a new checkout
                </ButtonLink>
              }
            >
              This order was created with a different payment setup.
            </Callout>
          )}
        </div>
      </Surface>
    </div>
  );
}
