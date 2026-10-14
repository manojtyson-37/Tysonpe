"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { createLimiter } from "@/lib/auth/rate-limit";
import { AppError, confirmPayment, createCheckoutOrder, markOrderFailed } from "@/lib/orders";
import { getProvider } from "@/lib/payments";
import { signMockPayment } from "@/lib/payments/mock";
import type { FormState } from "./auth";

// Stops order spam and coupon-code guessing through the distinct error messages.
const checkoutByUser = createLimiter({ max: 20, windowMs: 10 * 60 * 1000 });

export async function startCheckout(productId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser(`/checkout/${productId}`);
  const coupon = String(fd.get("coupon") ?? "").trim().slice(0, 64);
  if (!checkoutByUser.hit(user.id)) return { error: "Too many checkout attempts. Please wait a few minutes." };

  let orderId: string;
  let paid: boolean;
  try {
    const order = await createCheckoutOrder({ userId: user.id, productId, couponCode: coupon || null });
    orderId = order.id;
    paid = order.status === "paid";
  } catch (e) {
    if (e instanceof AppError) {
      if (e.code === "already_enrolled") redirect("/library");
      return { error: e.message };
    }
    throw e;
  }
  redirect(paid ? `/checkout/success/${orderId}` : `/checkout/pay/${orderId}`);
}

/** Called by the Razorpay widget handler; only a verified signature marks the order paid. */
export async function confirmPaymentAction(
  orderId: string,
  paymentId: string,
  signature: string,
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  const order = await db.order.findFirst({ where: { id: orderId, userId: user.id } });
  if (!order) return { ok: false, error: "Order not found." };
  try {
    await confirmPayment({ userId: user.id, providerOrderId: order.providerOrderId, paymentId, signature });
    return { ok: true };
  } catch (e) {
    if (e instanceof AppError) return { ok: false, error: e.message };
    throw e;
  }
}

/** Dev-only: simulate the gateway completing or failing a payment. */
export async function mockPayAction(orderId: string, outcome: "success" | "failure") {
  if (process.env.NODE_ENV === "production" || getProvider().name !== "mock")
    throw new Error("Mock payments are only available in mock payments mode.");
  const user = await requireUser();
  const order = await db.order.findFirst({ where: { id: orderId, userId: user.id } });
  if (!order || order.provider !== "mock") redirect("/library");

  if (outcome === "failure") {
    await markOrderFailed({ providerOrderId: order.providerOrderId });
    redirect(`/checkout/pay/${order.id}?failed=1`);
  }
  const paymentId = `pay_mock_${order.id.slice(-10)}`;
  try {
    await confirmPayment({
      userId: user.id,
      providerOrderId: order.providerOrderId,
      paymentId,
      signature: signMockPayment(order.providerOrderId, paymentId),
    });
  } catch (e) {
    if (!(e instanceof AppError)) throw e;
    redirect(`/checkout/pay/${order.id}?failed=1`);
  }
  redirect(`/checkout/success/${order.id}`);
}
