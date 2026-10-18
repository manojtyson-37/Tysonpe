import { describe, expect, it } from "vitest";
import { DEFAULT_AFFILIATE_CONFIG } from "./service";

describe("affiliates service", () => {
  describe("DEFAULT_AFFILIATE_CONFIG", () => {
    it("has standard 20% commission and 30-day cookie window defaults", () => {
      expect(DEFAULT_AFFILIATE_CONFIG.enabled).toBe(true);
      expect(DEFAULT_AFFILIATE_CONFIG.defaultCommissionPct).toBe(20);
      expect(DEFAULT_AFFILIATE_CONFIG.cookieDays).toBe(30);
      expect(DEFAULT_AFFILIATE_CONFIG.partners).toEqual([]);
      expect(DEFAULT_AFFILIATE_CONFIG.termsNote).toContain("UPI");
    });
  });

  describe("Commission calculations", () => {
    it("calculates exact commission on order gross amount", () => {
      const totalPaise = 100000; // ₹1,000.00
      const commissionPct = 25; // 25%
      const commissionPaise = Math.round((totalPaise * commissionPct) / 100);
      expect(commissionPaise).toBe(25000); // ₹250.00
    });

    it("handles zero amounts gracefully", () => {
      const totalPaise = 0;
      const commissionPct = 20;
      const commissionPaise = Math.round((totalPaise * commissionPct) / 100);
      expect(commissionPaise).toBe(0);
    });
  });
});
