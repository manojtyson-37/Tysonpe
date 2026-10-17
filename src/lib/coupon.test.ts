import { describe, expect, it } from "vitest";
import { rupeesToPaise } from "./validation";
import { COUPON_STATUS_BADGE, couponStatus, rupeesFieldValue } from "./coupon";

const NOW = Date.parse("2026-10-18T06:00:00Z");
const base = { active: true, expiresAt: null as Date | null, maxRedemptions: null as number | null, redeemed: 0 };

describe("couponStatus", () => {
  it("is active with no expiry and no cap", () => expect(couponStatus(base, NOW)).toBe("active"));
  it("is inactive when switched off", () => expect(couponStatus({ ...base, active: false }, NOW)).toBe("inactive"));
  it("is expired from the instant of expiry (<=, as checkout applies it)", () => {
    expect(couponStatus({ ...base, expiresAt: new Date(NOW + 1) }, NOW)).toBe("active");
    expect(couponStatus({ ...base, expiresAt: new Date(NOW) }, NOW)).toBe("expired");
    expect(couponStatus({ ...base, expiresAt: new Date(NOW - 1) }, NOW)).toBe("expired");
  });
  it("is used up when redemptions reach the cap (>=), never for an uncapped coupon", () => {
    expect(couponStatus({ ...base, maxRedemptions: 5, redeemed: 4 }, NOW)).toBe("active");
    expect(couponStatus({ ...base, maxRedemptions: 5, redeemed: 5 }, NOW)).toBe("used-up");
    expect(couponStatus({ ...base, maxRedemptions: 5, redeemed: 9 }, NOW)).toBe("used-up");
    expect(couponStatus({ ...base, redeemed: 999 }, NOW)).toBe("active");
  });
  it("precedence: inactive beats expired beats used up", () => {
    const all = { active: true, expiresAt: new Date(NOW - 1), maxRedemptions: 1, redeemed: 1 };
    expect(couponStatus(all, NOW)).toBe("expired");
    expect(couponStatus({ ...all, active: false }, NOW)).toBe("inactive");
  });
  it("has an honest label for every status", () => {
    expect(Object.values(COUPON_STATUS_BADGE).map((b) => b.label)).toEqual(["Active", "Inactive", "Expired", "Used up"]);
  });
});

describe("rupeesFieldValue", () => {
  it.each([
    [10000, "100"],
    [100, "1"],
    [110, "1.10"],
    [10050, "100.50"],
    [10005, "100.05"],
    [199, "1.99"],
    [30, "0.30"],
    [1, "0.01"],
    [123456700, "1234567"],
  ])("%i paise -> %s", (paise, text) => expect(rupeesFieldValue(paise)).toBe(text));

  it.each([null, undefined, 0, -100, 1.5, NaN, Infinity])("%s -> empty", (v) => expect(rupeesFieldValue(v as number | null)).toBe(""));

  it("round-trips through the action's own parser for every paise value up to ₹1,000", () => {
    for (let p = 1; p <= 100000; p++) expect(rupeesToPaise.parse(rupeesFieldValue(p))).toBe(p);
  });

  it("pads the paise part to two digits and keeps trailing zeros, from integer paise only", () => {
    expect(rupeesFieldValue(30)).toBe("0.30");
    expect(rupeesFieldValue(130)).toBe("1.30");
    expect(rupeesFieldValue(5)).toBe("0.05");
  });
});
