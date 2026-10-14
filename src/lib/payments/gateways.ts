/** Gateways the demo can imitate. Purely presentational: every demo order settles through the same mock path. */
export const GATEWAYS = [
  { id: "razorpay", name: "Razorpay", blurb: "Pop-up checkout over the page: UPI, cards, netbanking, wallets." },
  { id: "easebuzz", name: "Easebuzz", blurb: "Hosted payment page: redirect out, pay, redirect back." },
] as const;

export type GatewayId = (typeof GATEWAYS)[number]["id"];

export const isGatewayId = (v: unknown): v is GatewayId => GATEWAYS.some((g) => g.id === v);

/** First valid candidate (e.g. `?gw=`, then the user's saved choice), else Razorpay. */
export function resolveGateway(...candidates: unknown[]): GatewayId {
  return candidates.find(isGatewayId) ?? "razorpay";
}
