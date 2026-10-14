import { describe, expect, it } from "vitest";
import { fiscalYear, formatInvoiceNo } from "./invoice";

describe("fiscalYear (India: Apr–Mar, evaluated in IST)", () => {
  it("April starts a new FY", () => expect(fiscalYear(new Date("2026-04-01T00:00:00+05:30"))).toBe("2026-27"));
  it("March belongs to the previous FY", () => expect(fiscalYear(new Date("2026-03-31T23:59:00+05:30"))).toBe("2025-26"));
  it("uses IST, not UTC, at the boundary", () =>
    // 2026-03-31 20:00 UTC is already 2026-04-01 01:30 IST
    expect(fiscalYear(new Date("2026-03-31T20:00:00Z"))).toBe("2026-27"));
  it("October 2026", () => expect(fiscalYear(new Date("2026-10-15T10:00:00Z"))).toBe("2026-27"));
  it("January 2027", () => expect(fiscalYear(new Date("2027-01-10T10:00:00Z"))).toBe("2026-27"));
  it("century rollover pads the short year", () => expect(fiscalYear(new Date("2099-06-01T00:00:00Z"))).toBe("2099-00"));
});

describe("formatInvoiceNo", () => {
  it("pads the sequence", () => expect(formatInvoiceNo("2026-27", 7)).toBe("TP/2026-27/00007"));
  it("grows past 5 digits without truncating", () => expect(formatInvoiceNo("2026-27", 123456)).toBe("TP/2026-27/123456"));
});
