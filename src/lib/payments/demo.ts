import { db } from "@/lib/db";
import { AppError, confirmPayment, markOrderFailed } from "@/lib/orders";
import { simulatedPaymentsAllowed } from "./demo-mode";
import { signMockPayment } from "./mock";

export const DEMO_OUTCOMES = ["success", "failure", "cancel"] as const;
export type DemoOutcome = (typeof DEMO_OUTCOMES)[number];

/**
 * Settle a demo-gateway payment. The simulated Razorpay/Easebuzz screens send ONLY an outcome: no card, UPI or
 * bank detail ever reaches the server. Success goes through the same signature-verified confirmPayment as a real
 * gateway callback, so paid orders, invoices, enrolment and the ledger behave exactly as in production.
 */
export async function settleDemoPayment(input: {
  userId: string;
  orderId: string;
  outcome: DemoOutcome;
  utr?: string;
}) {
  if (!simulatedPaymentsAllowed()) throw new Error("Demo payments are disabled in production.");
  if (!DEMO_OUTCOMES.includes(input.outcome)) throw new AppError("invalid_outcome");
  const order = await db.order.findFirst({ where: { id: input.orderId, userId: input.userId } });
  if (!order || order.provider !== "mock") throw new AppError("not_found", "Order not found.");

  if (input.outcome !== "success") {
    const o = await markOrderFailed({ providerOrderId: order.providerOrderId }); // a paid order is never downgraded
    return o.status === "paid"
      ? ({ status: "paid", to: `/checkout/success/${order.id}` } as const)
      : ({ status: "failed", to: `/checkout/pay/${order.id}?failed=1` } as const);
  }
  const paymentId = input.utr?.trim()
    ? `upi_utr_${input.utr.trim()}`
    : `pay_demo_${order.id.slice(-10)}`;
  await confirmPayment({
    userId: input.userId,
    providerOrderId: order.providerOrderId,
    paymentId,
    signature: signMockPayment(order.providerOrderId, paymentId),
  });
  return { status: "paid", to: `/checkout/success/${order.id}` } as const;
}
