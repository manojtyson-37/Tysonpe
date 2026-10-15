import { simulatedPaymentsAllowed } from "@/lib/payments/demo-mode";

/** Handle of the seeded demo creator. Set NEXT_PUBLIC_DEMO_HANDLE on demo deployments; empty hides demo-only links. */
export const DEMO_HANDLE = process.env.NEXT_PUBLIC_DEMO_HANDLE ?? "";

export const DEFAULT_DEMO_PASSWORD = "tysonpe-demo-1";

/** Password of the seeded demo accounts, or null when this deployment must not advertise them (the live site). */
export function demoLoginPassword(): string | null {
  return simulatedPaymentsAllowed() ? (process.env.DEMO_PASSWORD ?? DEFAULT_DEMO_PASSWORD) : null;
}
