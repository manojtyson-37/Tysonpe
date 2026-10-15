/**
 * Simulated payments (mock gateway, demo settlement, enrollment reset) are allowed outside production, and in
 * production ONLY on a deployment that explicitly opts in with DEMO_DEPLOYMENT=1. The live site must never set it:
 * with it on, anyone could mark their own order paid without paying.
 */
export function simulatedPaymentsAllowed(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.DEMO_DEPLOYMENT === "1";
}
