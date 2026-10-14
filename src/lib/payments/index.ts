import { MockProvider } from "./mock";
import { RazorpayProvider } from "./razorpay";
import type { PaymentProvider } from "./types";

export type { PaymentProvider, ProviderName } from "./types";

let warnedWebhook = false;

/**
 * Razorpay when keys are configured. The mock gateway must be asked for explicitly with
 * PAYMENTS_MODE=mock (never inferred from missing keys) and is refused in production.
 */
export function getProvider(): PaymentProvider {
  const id = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (id && secret) {
    const hook = process.env.RAZORPAY_WEBHOOK_SECRET ?? "";
    if (!hook && !warnedWebhook) {
      warnedWebhook = true;
      console.warn("RAZORPAY_WEBHOOK_SECRET is empty: every payment webhook will be rejected.");
    }
    return new RazorpayProvider(id, secret, hook);
  }
  if (process.env.PAYMENTS_MODE === "mock") return new MockProvider();
  throw new Error("No payment provider configured: set RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET, or PAYMENTS_MODE=mock for local development.");
}
