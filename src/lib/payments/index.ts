import { EasebuzzProvider } from "./easebuzz";
import { MockProvider } from "./mock";
import { RazorpayProvider } from "./razorpay";
import type { PaymentProvider } from "./types";

export type { PaymentProvider, ProviderName } from "./types";

let warnedWebhook = false;

/** Sandbox keys must never take real orders: production demands an explicit EASEBUZZ_ENV=prod. */
function easebuzzEnv(): "test" | "prod" {
  const e = process.env.EASEBUZZ_ENV ?? "";
  if (e !== "" && e !== "test" && e !== "prod") throw new Error('EASEBUZZ_ENV must be exactly "test" or "prod".');
  if (process.env.NODE_ENV === "production") {
    if (e !== "prod") throw new Error('Easebuzz sandbox is refused in production; set EASEBUZZ_ENV="prod" with live keys.');
    return "prod";
  }
  return e === "prod" ? "prod" : "test";
}

/** Easebuzz built straight from env (null when unconfigured) so callbacks don't depend on which gateway is the default. */
export function getEasebuzzProvider(): EasebuzzProvider | null {
  const key = process.env.EASEBUZZ_KEY;
  const salt = process.env.EASEBUZZ_SALT;
  return key && salt ? new EasebuzzProvider(key, salt, easebuzzEnv()) : null;
}

/**
 * Razorpay when keys are configured. The mock gateway must be asked for explicitly with
 * PAYMENTS_MODE=mock (never inferred from missing keys) and is refused in production.
 */
export function getProvider(): PaymentProvider {
  // Sales-demo mode: the simulated gateway wins over any configured keys (and is refused in production).
  if (process.env.PAYMENTS_MODE === "demo") return new MockProvider();
  const id = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  const ebKey = process.env.EASEBUZZ_KEY;
  const ebSalt = process.env.EASEBUZZ_SALT;
  // With both gateways configured Razorpay stays the default; PAYMENTS_PROVIDER=easebuzz opts in.
  if (ebKey && ebSalt && ((!id && !secret) || process.env.PAYMENTS_PROVIDER === "easebuzz")) {
    return new EasebuzzProvider(ebKey, ebSalt, easebuzzEnv());
  }
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
