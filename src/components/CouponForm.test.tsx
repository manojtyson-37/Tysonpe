import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { legacyStyleFindings } from "@/test/style-scan";
import { CouponForm } from "./CouponForm";

const action = async () => undefined;
type C = NonNullable<Parameters<typeof CouponForm>[0]["coupon"]>;
const coupon = (over: Partial<C> = {}): C => ({ code: "DIWALI20", percentOff: 20, flatOffPaise: null, maxRedemptions: 50, expiresAt: null, ...over });
const add = () => renderToStaticMarkup(<CouponForm action={action} submitLabel="Create coupon" />);
const edit = (c: C) => renderToStaticMarkup(<CouponForm action={action} coupon={c} submitLabel="Save coupon" />);
const names = (html: string) => [...html.matchAll(/<(?:input|select|textarea)\b[^>]*\sname="([^"]+)"/g)].map((m) => m[1]);
const value = (html: string, name: string) => new RegExp(`<input\\b[^>]*name="${name}"[^>]*>`).exec(html)?.[0].match(/\svalue="([^"]*)"/)?.[1];

describe("CouponForm fields", () => {
  it("add: code, kind, percent (the default kind), max uses, valid until", () => {
    expect(names(add())).toEqual(["code", "kind", "percent", "maxRedemptions", "expiresAt"]);
  });

  it("a flat coupon posts `flat` instead of `percent`", () => {
    expect(names(edit(coupon({ percentOff: null, flatOffPaise: 10000 })))).toEqual(["code", "kind", "flat", "maxRedemptions", "expiresAt"]);
  });

  it("edit prefills code, percent, max uses and nothing for no expiry", () => {
    const html = edit(coupon());
    expect(value(html, "code")).toBe("DIWALI20");
    expect(value(html, "percent")).toBe("20");
    expect(value(html, "maxRedemptions")).toBe("50");
    expect(value(html, "expiresAt")).toBe("");
    expect(html).toMatch(/<option value="percent" selected="">/);
  });

  it("an unlimited coupon leaves max uses empty", () => {
    expect(value(edit(coupon({ maxRedemptions: null })), "maxRedemptions")).toBe("");
  });
});

describe("CouponForm flat amount (shown in rupees from paise)", () => {
  const flat = (paise: number) => value(edit(coupon({ percentOff: null, flatOffPaise: paise })), "flat");
  it.each([
    [10000, "100"],
    [11050, "110.50"],
    [110, "1.10"],
    [30, "0.30"],
    [199, "1.99"],
  ])("%i paise shows %s, as the amount parser reads it back", (paise, shown) => expect(flat(paise)).toBe(shown));

  it("a flat coupon selects the flat kind and prints the ₹ prefix", () => {
    const html = edit(coupon({ percentOff: null, flatOffPaise: 10000 }));
    expect(html).toMatch(/<option value="flat" selected="">/);
    expect(html).toContain("₹");
  });
});

describe("CouponForm valid-until date", () => {
  it("shows the IST calendar day, not the UTC one", () => {
    // 20:00 UTC on 31 Dec is 01:30 IST on 1 Jan.
    expect(value(edit(coupon({ expiresAt: new Date("2026-12-31T20:00:00Z") })), "expiresAt")).toBe("2027-01-01");
    // The action stores end of day IST (23:59:59+05:30): that must read back as the same day.
    expect(value(edit(coupon({ expiresAt: new Date("2026-12-31T23:59:59+05:30") })), "expiresAt")).toBe("2026-12-31");
  });
});

describe("CouponForm submit", () => {
  it("renders the Button primitive's small primary look with the given label, not a hand-typed class string", () => {
    const html = add();
    const button = /<button\b[^>]*type="submit"[^>]*>/.exec(html)![0];
    expect(button).toMatch(/class="btn btn-primary btn-sm[^"]*"/);
    expect(html).toContain("Create coupon");
    expect(edit(coupon())).toContain("Save coupon");
  });

  it("source hygiene: no legacy btn/card/badge strings, rounded-xl or local date formatter", () => {
    const src = readFileSync(new URL("./CouponForm.tsx", import.meta.url), "utf8");
    expect(legacyStyleFindings(src)).toEqual([]);
    expect(src).not.toContain("Intl.DateTimeFormat");
    expect(src).not.toMatch(/flatOffPaise\s*\/\s*100/);
  });
});
