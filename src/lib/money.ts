// Pure money maths. All amounts are integer paise. Product prices are GST-inclusive.

export type CouponLike = {
  percentOff: number | null;
  flatOffPaise: number | null;
  maxRedemptions: number | null;
  redeemed: number;
  expiresAt: Date | null;
  active: boolean;
};

export type CouponRejection = "inactive" | "expired" | "exhausted" | "invalid";

export function gstComponent(totalPaise: number, ratePct: number): number {
  if (totalPaise <= 0 || ratePct <= 0) return 0;
  return Math.round((totalPaise * ratePct) / (100 + ratePct));
}

export function applyCoupon(
  subtotalPaise: number,
  c: CouponLike,
  now: Date,
): { ok: true; discountPaise: number } | { ok: false; reason: CouponRejection } {
  if (!c.active) return { ok: false, reason: "inactive" };
  if (c.expiresAt && c.expiresAt.getTime() <= now.getTime()) return { ok: false, reason: "expired" };
  if (c.maxRedemptions !== null && c.redeemed >= c.maxRedemptions)
    return { ok: false, reason: "exhausted" };

  let discount: number;
  if (c.percentOff !== null && c.percentOff > 0) {
    discount = Math.round((subtotalPaise * Math.min(c.percentOff, 100)) / 100);
  } else if (c.flatOffPaise !== null && c.flatOffPaise > 0) {
    discount = c.flatOffPaise;
  } else {
    return { ok: false, reason: "invalid" };
  }
  return { ok: true, discountPaise: Math.min(discount, subtotalPaise) };
}

export type OrderPricing = {
  subtotalPaise: number;
  discountPaise: number;
  totalPaise: number;
  gstPaise: number;
};

export function priceOrder(
  product: { pricePaise: number; gstRatePct: number },
  coupon: CouponLike | null,
  now: Date,
): ({ ok: true } & OrderPricing) | { ok: false; reason: CouponRejection } {
  const subtotalPaise = product.pricePaise;
  let discountPaise = 0;
  if (coupon) {
    const r = applyCoupon(subtotalPaise, coupon, now);
    if (!r.ok) return r;
    discountPaise = r.discountPaise;
  }
  const totalPaise = subtotalPaise - discountPaise;
  return {
    ok: true,
    subtotalPaise,
    discountPaise,
    totalPaise,
    gstPaise: gstComponent(totalPaise, product.gstRatePct),
  };
}

// Basis points (1 bp = 0.01%). Platform fee falls as the creator moves up plans.
const PLANS: Record<string, { platformBps: number; gatewayBps: number }> = {
  basic: { platformBps: 1000, gatewayBps: 200 },
  pro: { platformBps: 550, gatewayBps: 200 },
  advanced: { platformBps: 350, gatewayBps: 200 },
  ultimate: { platformBps: 0, gatewayBps: 150 },
};

/** Human-readable fee rates for a plan, for UI copy that must never drift from the ledger maths. */
export function planRates(planKey: string) {
  const plan = PLANS[planKey] ?? PLANS.basic;
  const pct = (bps: number) => `${bps / 100}%`;
  return { platform: pct(plan.platformBps), gateway: pct(plan.gatewayBps) };
}

export function feeBreakdown(grossPaise: number, planKey: string) {
  const plan = PLANS[planKey] ?? PLANS.basic;
  const platformFeePaise = Math.round((grossPaise * plan.platformBps) / 10000);
  const gatewayFeePaise = Math.round((grossPaise * plan.gatewayBps) / 10000);
  return {
    platformFeePaise,
    gatewayFeePaise,
    netPaise: grossPaise - platformFeePaise - gatewayFeePaise,
  };
}

export function formatINR(paise: number): string {
  const whole = paise % 100 === 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(paise / 100);
}
