// Pure coupon display helpers (no "use client", so server pages can import them).
// Kept free of component imports so a lib never depends on the UI layer; the tones below are values of the Badge `tone` prop.
type CouponTone = "good" | "neutral" | "warn";

export type CouponStatus = "active" | "inactive" | "expired" | "used-up";

/**
 * What a creator reads on a coupon row. The order mirrors `applyCoupon` (money.ts), the rule checkout enforces:
 * a switched-off coupon is Inactive whatever else is true, then expiry, then the redemption cap.
 */
export function couponStatus(
  c: { active: boolean; expiresAt: Date | null; maxRedemptions: number | null; redeemed: number },
  nowMs: number,
): CouponStatus {
  if (!c.active) return "inactive";
  if (c.expiresAt && c.expiresAt.getTime() <= nowMs) return "expired";
  if (c.maxRedemptions !== null && c.redeemed >= c.maxRedemptions) return "used-up";
  return "active";
}

export const COUPON_STATUS_BADGE: Record<CouponStatus, { label: string; tone: CouponTone }> = {
  active: { label: "Active", tone: "good" },
  inactive: { label: "Inactive", tone: "neutral" },
  expired: { label: "Expired", tone: "warn" },
  "used-up": { label: "Used up", tone: "warn" },
};

/**
 * Paise as the text of a rupee input: "100" for a whole amount, "100.50" otherwise (always two decimals, like formatINR).
 * Built from integer arithmetic, never `paise / 100`, so no float artefact can reach the field. Empty when there is no amount.
 */
export function rupeesFieldValue(paise: number | null | undefined): string {
  if (paise == null || !Number.isInteger(paise) || paise <= 0) return "";
  const rupees = Math.floor(paise / 100);
  const rest = paise % 100;
  return rest === 0 ? String(rupees) : `${rupees}.${String(rest).padStart(2, "0")}`;
}
