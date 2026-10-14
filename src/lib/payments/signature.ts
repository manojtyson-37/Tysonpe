import { createHmac, timingSafeEqual } from "node:crypto";

const hmacHex = (secret: string, data: string) =>
  createHmac("sha256", secret).update(data).digest("hex");

/** Constant-time compare of two hex strings; false (never throws) on length/format mismatch. */
export function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length || a.length === 0 || !/^[0-9a-f]+$/i.test(a) || !/^[0-9a-f]+$/i.test(b))
    return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

/** Razorpay checkout callback: signature = HMAC_SHA256(order_id + "|" + payment_id, key_secret). */
export function verifyPaymentSignature(
  providerOrderId: string,
  paymentId: string,
  signature: string,
  secret: string,
): boolean {
  if (!secret || !signature) return false;
  return safeEqualHex(hmacHex(secret, `${providerOrderId}|${paymentId}`), signature);
}

/** Razorpay webhook: signature = HMAC_SHA256(raw request body, webhook_secret). */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
  secret: string,
): boolean {
  if (!secret || !signature) return false;
  return safeEqualHex(hmacHex(secret, rawBody), signature);
}

export { hmacHex };
