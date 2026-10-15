import { describe, expect, it } from "vitest";
import {
  PLAN_MONTHLY_PAISE,
  applyCoupon,
  feeBreakdown,
  formatINR,
  gstComponent,
  priceOrder,
  type CouponLike,
} from "./money";

const now = new Date("2026-10-15T10:00:00Z");
const coupon = (over: Partial<CouponLike> = {}): CouponLike => ({
  percentOff: 20,
  flatOffPaise: null,
  maxRedemptions: null,
  redeemed: 0,
  expiresAt: null,
  active: true,
  ...over,
});

describe("gstComponent (price is GST-inclusive)", () => {
  it("extracts 18% from 118.00", () => expect(gstComponent(11800, 18)).toBe(1800));
  it("rounds to nearest paisa", () => expect(gstComponent(99900, 18)).toBe(15239));
  it("is 0 for 0% rate or 0 total", () => {
    expect(gstComponent(5000, 0)).toBe(0);
    expect(gstComponent(0, 18)).toBe(0);
  });
});

describe("applyCoupon", () => {
  it("percent off", () =>
    expect(applyCoupon(100000, coupon(), now)).toEqual({ ok: true, discountPaise: 20000 }));
  it("flat off", () =>
    expect(
      applyCoupon(100000, coupon({ percentOff: null, flatOffPaise: 15000 }), now),
    ).toEqual({ ok: true, discountPaise: 15000 }));
  it("flat off is capped at subtotal", () =>
    expect(
      applyCoupon(5000, coupon({ percentOff: null, flatOffPaise: 15000 }), now),
    ).toEqual({ ok: true, discountPaise: 5000 }));
  it("100% off gives full discount", () =>
    expect(applyCoupon(5000, coupon({ percentOff: 100 }), now)).toEqual({
      ok: true,
      discountPaise: 5000,
    }));
  it("rejects inactive", () =>
    expect(applyCoupon(5000, coupon({ active: false }), now)).toEqual({
      ok: false,
      reason: "inactive",
    }));
  it("rejects expired", () =>
    expect(
      applyCoupon(5000, coupon({ expiresAt: new Date("2026-10-14T00:00:00Z") }), now),
    ).toEqual({ ok: false, reason: "expired" }));
  it("rejects when redemptions exhausted", () =>
    expect(
      applyCoupon(5000, coupon({ maxRedemptions: 3, redeemed: 3 }), now),
    ).toEqual({ ok: false, reason: "exhausted" }));
  it("rejects a coupon with neither percent nor flat", () =>
    expect(
      applyCoupon(5000, coupon({ percentOff: null, flatOffPaise: null }), now),
    ).toEqual({ ok: false, reason: "invalid" }));
});

describe("priceOrder", () => {
  it("no coupon", () =>
    expect(priceOrder({ pricePaise: 11800, gstRatePct: 18 }, null, now)).toEqual({
      ok: true,
      subtotalPaise: 11800,
      discountPaise: 0,
      totalPaise: 11800,
      gstPaise: 1800,
    }));
  it("GST is computed on the discounted total", () => {
    const r = priceOrder({ pricePaise: 20000, gstRatePct: 18 }, coupon({ percentOff: 50 }), now);
    expect(r).toEqual({
      ok: true,
      subtotalPaise: 20000,
      discountPaise: 10000,
      totalPaise: 10000,
      gstPaise: 1525,
    });
  });
  it("surfaces coupon rejection", () =>
    expect(
      priceOrder({ pricePaise: 20000, gstRatePct: 18 }, coupon({ active: false }), now),
    ).toEqual({ ok: false, reason: "inactive" }));
});

describe("feeBreakdown", () => {
  it("basic plan: 10% platform + 2% gateway", () =>
    expect(feeBreakdown(100000, "basic")).toEqual({
      platformFeePaise: 10000,
      gatewayFeePaise: 2000,
      netPaise: 88000,
    }));
  it("ultimate plan: 0% platform + 1.5% gateway", () =>
    expect(feeBreakdown(100000, "ultimate")).toEqual({
      platformFeePaise: 0,
      gatewayFeePaise: 1500,
      netPaise: 98500,
    }));
  it("unknown plan falls back to basic", () =>
    expect(feeBreakdown(100000, "nope").platformFeePaise).toBe(10000));
  it("net + fees always equals gross", () => {
    const f = feeBreakdown(33333, "pro");
    expect(f.platformFeePaise + f.gatewayFeePaise + f.netPaise).toBe(33333);
  });
});

describe("formatINR", () => {
  it("formats whole rupees", () => expect(formatINR(49900)).toBe("₹499"));
  it("keeps paise when present", () => expect(formatINR(49950)).toBe("₹499.50"));
  it("groups Indian style", () => expect(formatINR(12345600)).toBe("₹1,23,456"));
});

describe("PLAN_MONTHLY_PAISE (plan comparison must net off the monthly fee)", () => {
  const takeHome = (plan: string, monthlySalesPaise: number) =>
    feeBreakdown(monthlySalesPaise, plan).netPaise - PLAN_MONTHLY_PAISE[plan];

  it("lists a monthly fee for every plan, zero on basic", () => {
    expect(PLAN_MONTHLY_PAISE.basic).toBe(0);
    for (const p of ["pro", "advanced", "ultimate"]) expect(PLAN_MONTHLY_PAISE[p]).toBeGreaterThan(0);
  });

  it("ultimate loses to basic at ₹50,000/month and wins at ₹10,00,000/month", () => {
    expect(takeHome("ultimate", 5_000_000)).toBeLessThan(takeHome("basic", 5_000_000));
    expect(takeHome("ultimate", 100_000_000)).toBeGreaterThan(takeHome("basic", 100_000_000));
  });
});
