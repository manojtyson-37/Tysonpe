import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { mockPayAction } from "@/app/actions/checkout";
import { RazorpayButton } from "@/components/RazorpayButton";
import { Money } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getProvider } from "@/lib/payments";

export const metadata: Metadata = { title: "Pay" };

export default async function PayPage({ params, searchParams }: PageProps<"/checkout/pay/[orderId]">) {
  const { orderId } = await params;
  const sp = await searchParams;
  const user = await requireUser();
  const order = await db.order.findFirst({ where: { id: orderId, userId: user.id }, include: { product: true } });
  if (!order) notFound();
  if (order.status === "paid") redirect(`/checkout/success/${order.id}`);
  if (order.status === "refunded") redirect("/library");

  const failed = sp.failed === "1" || order.status === "failed";
  const provider = getProvider();

  return (
    <div className="mx-auto max-w-lg px-4 py-14 sm:px-6">
      <h1 className="text-3xl font-bold">Complete your payment</h1>
      <div className="card mt-6 p-6">
        <p className="font-semibold">{order.product.title}</p>
        <p className="mt-1 text-3xl font-extrabold"><Money paise={order.totalPaise} /></p>
        {failed && (
          <p role="alert" className="mt-4 rounded-xl bg-bad-soft px-3.5 py-2.5 text-sm font-medium text-bad">
            The last payment attempt failed. No money was taken. You can try again.
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
          ) : order.provider === "mock" && provider.name === "mock" ? (
            <div className="space-y-3">
              <p className="rounded-xl bg-warn-soft px-3.5 py-2.5 text-sm">
                <strong>Test mode.</strong> No gateway keys are configured, so this is a simulated checkout. No money moves.
              </p>
              <form action={mockPayAction.bind(null, order.id, "success")}>
                <button className="btn btn-primary btn-lg w-full" type="submit">Simulate successful payment</button>
              </form>
              <form action={mockPayAction.bind(null, order.id, "failure")}>
                <button className="btn btn-secondary w-full" type="submit">Simulate failed payment</button>
              </form>
            </div>
          ) : (
            <p className="text-sm text-bad">This order was created with a different payment setup. Please start a new checkout.</p>
          )}
        </div>
      </div>
    </div>
  );
}
