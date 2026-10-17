"use server";

import { simulatedPaymentsAllowed } from "@/lib/payments/demo-mode";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { createLimiter } from "@/lib/auth/rate-limit";
import { AppError, confirmPayment, createCheckoutOrder, isOrderFresh, markOrderFailed } from "@/lib/orders";
import { getEasebuzzProvider, getProvider } from "@/lib/payments";
import { attemptTxnid } from "@/lib/payments/easebuzz";
import { signMockPayment } from "@/lib/payments/mock";
import { type DemoOutcome, settleDemoPayment } from "@/lib/payments/demo";
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
  if (!simulatedPaymentsAllowed() || getProvider().name !== "mock")
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

/** Settle a demo-gateway payment (Razorpay modal or Easebuzz hosted replica). */
export async function settleDemoAction(
  orderId: string,
  outcome: DemoOutcome,
): Promise<{ ok: boolean; to: string; error?: string }> {
  const user = await requireUser();
  try {
    const res = await settleDemoPayment({ userId: user.id, orderId, outcome });
    return { ok: true, to: res.to };
  } catch (e) {
    if (e instanceof AppError) return { ok: false, to: `/checkout/pay/${orderId}?failed=1`, error: e.message };
    throw e;
  }
}

/** Verify a direct UPI payment using the 12-digit UPI Reference Number / UTR. */
export async function verifyUpiPaymentAction(
  orderId: string,
  utr: string,
): Promise<{ ok: boolean; to: string; error?: string }> {
  const user = await requireUser();
  const cleanedUtr = utr.trim().replace(/\s+/g, "");
  if (!/^\d{12}$/.test(cleanedUtr)) {
    return {
      ok: false,
      to: "",
      error: "Please enter a valid 12-digit numeric UPI Reference / UTR number from your payment receipt.",
    };
  }

  // Prevent duplicate UTR redemption
  const duplicate = await db.order.findFirst({
    where: {
      providerPaymentId: `upi_utr_${cleanedUtr}`,
      status: "paid",
      id: { not: orderId },
    },
  });
  if (duplicate) {
    return {
      ok: false,
      to: "",
      error: "This UPI Reference (UTR) has already been used for another order. Each transaction requires a unique UTR.",
    };
  }

  try {
    const res = await settleDemoPayment({
      userId: user.id,
      orderId,
      outcome: "success",
      utr: cleanedUtr,
    });
    return { ok: true, to: res.to };
  } catch (e) {
    if (e instanceof AppError) return { ok: false, to: `/checkout/pay/${orderId}?failed=1`, error: e.message };
    throw e;
  }
}

/** Submit a direct UPI payment UTR for creator verification in their bank account. */
export async function submitUpiPaymentForVerificationAction(
  orderId: string,
  utr: string,
): Promise<{ ok: boolean; to: string; error?: string }> {
  const user = await requireUser();
  const cleanedUtr = utr.trim().replace(/\s+/g, "");
  if (!/^\d{12}$/.test(cleanedUtr)) {
    return {
      ok: false,
      to: "",
      error: "Please enter a valid 12-digit numeric UPI Reference / UTR number from your payment receipt.",
    };
  }

  // Prevent duplicate UTR redemption
  const duplicate = await db.order.findFirst({
    where: {
      providerPaymentId: `upi_utr_${cleanedUtr}`,
      status: { in: ["paid", "pending_approval"] },
      id: { not: orderId },
    },
  });
  if (duplicate) {
    return {
      ok: false,
      to: "",
      error: "This UPI Reference (UTR) has already been submitted for another order. Each transaction requires a unique UTR.",
    };
  }

  const order = await db.order.findFirst({ where: { id: orderId, userId: user.id } });
  if (!order) return { ok: false, to: "", error: "Order not found." };
  if (order.status === "paid") return { ok: true, to: `/checkout/success/${order.id}` };

  await db.order.update({
    where: { id: order.id },
    data: {
      status: "pending_approval",
      providerPaymentId: `upi_utr_${cleanedUtr}`,
    },
  });

  return { ok: true, to: `/checkout/status/${order.id}` };
}

/** Form action for Easebuzz replica hosted page redirect return (303). */
export async function settleEasebuzzDemoAction(orderId: string, outcome: DemoOutcome = "success") {
  const user = await requireUser();
  const res = await settleDemoPayment({ userId: user.id, orderId, outcome });
  redirect(res.to);
}

/** Allows resetting demo enrollment so presenters can test multiple gateways repeatedly. */
export async function resetDemoEnrollmentAction(productId: string, redirectTo?: string | FormData) {
  if (!simulatedPaymentsAllowed() || getProvider().name !== "mock")
    throw new Error("Demo actions are only available on a demo deployment with simulated payments.");
  const user = await requireUser();
  await db.enrollment.deleteMany({ where: { userId: user.id, productId } });
  const target = typeof redirectTo === "string" ? redirectTo : "/demo";
  redirect(target);
}

const easebuzzStart = createLimiter({ max: 15, windowMs: 10 * 60 * 1000 });
/** Easebuzz rejects odd characters in these free-text fields, and the hash must cover exactly what we send. */
const clean = (v: string, max: number) => v.replace(/[^\p{L}\p{N} .,'&()/-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, max);

/** Exchange the pending order for a one-off Easebuzz pay link and send the buyer there. */
export async function startEasebuzzPayment(orderId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  if (!easebuzzStart.hit(user.id)) return { error: "Too many attempts. Please wait a few minutes." };
  const phone = String(fd.get("phone") ?? "").replace(/[\s-]/g, "").replace(/^(\+91|91|0)(?=\d{10}$)/, "");
  if (!/^\d{10}$/.test(phone)) return { error: "Enter a valid 10-digit mobile number.", fields: { phone: "Enter a valid 10-digit mobile number." } };

  const order = await db.order.findFirst({ where: { id: orderId, userId: user.id }, include: { product: true } });
  if (!order || order.provider !== "easebuzz") redirect("/library");
  if (order.status === "paid") redirect(`/checkout/success/${order.id}`);
  if (order.status === "refunded") redirect("/library");
  // Never send an already-enrolled buyer to the gateway (e.g. a second order for the same product paid meanwhile).
  const enrolled = await db.enrollment.findUnique({ where: { userId_productId: { userId: user.id, productId: order.productId } } });
  if (enrolled) redirect(`/library/${order.productId}`);
  // A stale order may have lost its coupon hold or old price: restart from checkout instead of paying it.
  if (!isOrderFresh(order.createdAt)) redirect(`/checkout/${order.productId}`);
  // A failed attempt released its coupon hold; paying it now would re-take the redemption over the cap.
  if (order.couponId && !order.couponReserved) redirect(`/checkout/${order.productId}`);

  const provider = getEasebuzzProvider();
  const base = process.env.NEXT_PUBLIC_APP_URL;
  if (!provider || !base) return { error: "Payments are not configured." };

  let payUrl: string;
  try {
    ({ payUrl } = await provider.initiatePayment({
      txnid: attemptTxnid(order.providerOrderId), // Easebuzz rejects a reused txnid, so retries need a fresh one
      amountPaise: order.totalPaise,
      productinfo: clean(order.product.title, 100) || "Tysonpe order",
      firstname: clean(user.name.split(" ")[0] ?? "", 60) || "Customer",
      email: user.email,
      phone,
      surl: new URL("/api/easebuzz/return", base).toString(),
      furl: new URL("/api/easebuzz/return", base).toString(),
    }));
  } catch (e) {
    console.error("easebuzz initiate failed", e);
    return { error: "We couldn't reach the payment gateway. Please try again." };
  }
  redirect(payUrl);
}
