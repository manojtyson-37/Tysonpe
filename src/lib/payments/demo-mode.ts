/**
 * Simulated payments (mock gateway, demo settlement, enrollment reset, demo logins) are allowed outside production,
 * and in production ONLY on a deployment that explicitly opts in with DEMO_DEPLOYMENT=1. The live site must never set
 * it: with it on, anyone could mark their own order paid without paying. As a guard against that mistake it also
 * fails closed when any Razorpay keys, or Easebuzz in prod mode, are configured.
 */
let warnedMixed = false;

export function simulatedPaymentsAllowed(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  if (process.env.DEMO_DEPLOYMENT !== "1") return false;
  if (process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_SECRET || process.env.EASEBUZZ_ENV === "prod") {
    if (!warnedMixed) {
      warnedMixed = true;
      console.error("DEMO_DEPLOYMENT=1 ignored: gateway keys are configured. Remove DEMO_DEPLOYMENT from this project.");
    }
    return false;
  }
  return true;
}
