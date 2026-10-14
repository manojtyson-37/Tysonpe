import { randomUUID } from "node:crypto";
import { hmacHex, verifyPaymentSignature, verifyWebhookSignature } from "./signature";
import type { PaymentProvider } from "./types";

/**
 * Local-only provider so the full checkout loop runs without gateway keys.
 * It uses the same HMAC verification path as Razorpay. Refused in production.
 */
export function mockSecret(): string {
  return `mock:${process.env.SESSION_SECRET ?? "dev"}`;
}

/** What the gateway would hand the browser after a successful payment. */
export function signMockPayment(providerOrderId: string, paymentId: string): string {
  return hmacHex(mockSecret(), `${providerOrderId}|${paymentId}`);
}

export class MockProvider implements PaymentProvider {
  readonly name = "mock" as const;
  readonly publicKey = null;

  constructor() {
    if (process.env.NODE_ENV === "production") {
      throw new Error("MockProvider is disabled in production; configure RAZORPAY_* keys.");
    }
  }

  async createOrder() {
    return { providerOrderId: `order_mock_${randomUUID().replace(/-/g, "")}` };
  }
  verifyPayment(orderId: string, paymentId: string, signature: string) {
    return verifyPaymentSignature(orderId, paymentId, signature, mockSecret());
  }
  verifyWebhook(rawBody: string, signature: string | null) {
    return verifyWebhookSignature(rawBody, signature, mockSecret());
  }
}
