"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import {
  createJodoPayOrder,
  getJodoPayOrder,
  completeJodoOrderAndUnlock,
  type JodoUnlockResult,
} from "@/lib/payments/jodo";


export interface InitiateJodoPaymentResult {
  ok: boolean;
  orderId?: string;
  redirectUrl?: string;
  error?: string;
}

export async function initiateJodoPaymentAction(
  _prevState: unknown,
  formData: FormData
): Promise<InitiateJodoPaymentResult> {
  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const productId = String(formData.get("productId") || "").trim();
  const customAmountStr = String(formData.get("amount") || "").trim();
  const creatorId = String(formData.get("creatorId") || "").trim();

  // Basic validation
  if (!name || name.length < 2) {
    return { ok: false, error: "Please enter a valid full name." };
  }
  const cleanPhone = phone.replace(/\D/g, "");
  if (cleanPhone.length < 10) {
    return { ok: false, error: "Please enter a valid 10-digit mobile number." };
  }
  if (!email || !email.includes("@")) {
    return { ok: false, error: "Please enter a valid email address." };
  }

  // Resolve product and amount
  let finalAmountRupees = 100; // fallback minimum
  let targetProduct = null;

  if (productId) {
    targetProduct = await db.product.findUnique({
      where: { id: productId },
      include: { creator: true },
    });
  }

  if (!targetProduct) {
    targetProduct = await db.product.findFirst({
      where: { status: "published" },
      orderBy: { createdAt: "desc" },
      include: { creator: true },
    });
  }

  if (customAmountStr && !isNaN(Number(customAmountStr)) && Number(customAmountStr) > 0) {
    finalAmountRupees = Number(customAmountStr);
  } else if (targetProduct) {
    finalAmountRupees = Math.max(1, Math.round(targetProduct.pricePaise / 100));
  }

  // Determine origin for callback URL
  const reqHeaders = await headers();
  const host = reqHeaders.get("host") || "tysonpe.vercel.app";
  const proto = reqHeaders.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const origin = `${proto}://${host}`;
  const callbackUrl = `${origin}/payment/jodo/callback`;

  const orderResult = await createJodoPayOrder({
    name,
    phone: cleanPhone,
    email,
    amountRupees: finalAmountRupees,
    callbackUrl,
    creatorId: creatorId || targetProduct?.creatorId,
    productId: targetProduct?.id,
    notes: [
      { key: "product_title", value: targetProduct?.title || "Masterclass" },
      { key: "checkout_origin", value: "tysonpe_jodo_portal" },
    ],
  });

  if (!orderResult.ok || !orderResult.redirectUrl) {
    return {
      ok: false,
      error: orderResult.error || "Failed to create Jodo pay order. Please try again.",
    };
  }

  return {
    ok: true,
    orderId: orderResult.orderId,
    redirectUrl: orderResult.redirectUrl,
  };
}

/**
 * Checks order status with Jodo API and executes course unlock if paid
 */
export async function verifyAndUnlockJodoOrderAction(orderId: string): Promise<JodoUnlockResult> {
  if (!orderId) {
    return { ok: false, orderId: "", status: "unknown", error: "Order ID is required" };
  }

  const result = await completeJodoOrderAndUnlock(orderId);

  if (result.ok) {
    revalidatePath("/dashboard/orders");
    revalidatePath("/dashboard/learners");
    revalidatePath("/library");
  }

  return result;
}


/**
 * Queries raw order details from Jodo Get Order API without mutating DB
 */
export async function queryJodoOrderStatusAction(orderId: string) {
  if (!orderId) {
    return { ok: false, error: "Order ID is required" };
  }

  return await getJodoPayOrder(orderId);
}
