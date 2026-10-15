import { describe, expect, it } from "vitest";
import { formatINR as moneyFormatINR } from "./money";
import { formatDate, formatDateTime, formatINR, istDate, istDay } from "./format";

// Instants chosen around the IST day boundary: 18:30 UTC is exactly midnight IST.
const noon = new Date("2026-10-15T10:00:00Z"); // 15:30 IST
const lastIstSecond = new Date("2026-10-15T18:29:59Z"); // 23:59:59 IST on the 15th
const firstIstSecond = new Date("2026-10-15T18:30:00Z"); // 00:00:00 IST on the 16th

describe("formatDate", () => {
  it("renders the short form used by ui.dateFmt, library and tables", () => {
    expect(formatDate(noon)).toBe("15 Oct 2026");
  });

  it("renders the long form used on certificates", () => {
    expect(formatDate(noon, "long")).toBe("15 October 2026");
  });

  it("uses the IST calendar day, not the host timezone", () => {
    expect(formatDate(lastIstSecond)).toBe("15 Oct 2026");
    expect(formatDate(firstIstSecond)).toBe("16 Oct 2026");
    expect(formatDate(firstIstSecond, "long")).toBe("16 October 2026");
  });

  it("renders an em dash for a missing date", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate(undefined)).toBe("—");
  });
});

describe("formatDateTime", () => {
  it("renders date and 12-hour IST time with the year (lesson unlock)", () => {
    expect(formatDateTime(noon)).toBe("15 Oct 2026, 3:30 pm");
  });

  it("can omit the year for compact community timestamps", () => {
    expect(formatDateTime(noon, { year: false })).toBe("15 Oct, 3:30 pm");
  });

  it("rolls over to the next day at IST midnight", () => {
    expect(formatDateTime(lastIstSecond)).toBe("15 Oct 2026, 11:59 pm");
    expect(formatDateTime(firstIstSecond)).toBe("16 Oct 2026, 12:00 am");
  });

  it("renders an em dash for a missing date", () => {
    expect(formatDateTime(null)).toBe("—");
  });
});

describe("istDay", () => {
  it("returns the YYYY-MM-DD key of the IST calendar day", () => {
    expect(istDay(noon)).toBe("2026-10-15");
  });

  it("flips exactly at 18:30 UTC", () => {
    expect(istDay(lastIstSecond)).toBe("2026-10-15");
    expect(istDay(firstIstSecond)).toBe("2026-10-16");
  });
});

describe("istDate", () => {
  it("matches istDay for a date and returns an empty string for null (form default value)", () => {
    expect(istDate(noon)).toBe("2026-10-15");
    expect(istDate(firstIstSecond)).toBe("2026-10-16");
    expect(istDate(null)).toBe("");
    expect(istDate(undefined)).toBe("");
  });
});

describe("formatINR", () => {
  it("is the money.ts implementation re-exported, not a copy", () => {
    expect(formatINR).toBe(moneyFormatINR);
    expect(formatINR(49900)).toBe("₹499");
    expect(formatINR(49950)).toBe("₹499.50");
  });
});
