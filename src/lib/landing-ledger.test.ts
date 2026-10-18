import { describe, expect, it } from "vitest";
import { feeBreakdown, formatINR, gstComponent, PLAN_MONTHLY_PAISE, planRates } from "./money";
import { GST_RATES } from "./validation";
import {
  DEFAULT_GST_RATE,
  DEFAULT_LEDGER,
  DEFAULT_PLAN,
  DEFAULT_PRICE_RUPEES,
  MAX_PRICE_RUPEES,
  MIN_PRICE_RUPEES,
  PLAN_OPTIONS,
  ledgerFor,
  ledgerFromInput,
  parsePriceRupees,
} from "./landing-ledger";

describe("landing ledger: defaults are the page's published sale", () => {
  it("is a Rs 2,999 sale at 18% GST on Basic", () => {
    expect([DEFAULT_PRICE_RUPEES, DEFAULT_GST_RATE, DEFAULT_PLAN]).toEqual([2999, 18, "basic"]);
    expect(GST_RATES as readonly number[]).toContain(DEFAULT_GST_RATE);
  });

  it("matches the figures the page printed before the rebuild (independent oracle, in paise)", () => {
    expect(DEFAULT_LEDGER).toMatchObject({
      rupees: 2999,
      salePaise: 299900,
      gstRate: 18,
      gstPaise: 45747,
      planKey: "basic",
      platformFeePaise: 29990,
      gatewayFeePaise: 5998,
      netPaise: 263912,
      platformRate: "10%",
      gatewayRate: "2%",
    });
    expect(formatINR(DEFAULT_LEDGER.netPaise)).toBe("₹2,639.12");
    expect(formatINR(DEFAULT_LEDGER.gstPaise)).toBe("₹457.47");
  });

  it("is built by money.ts, not retyped", () => {
    const fees = feeBreakdown(299900, "basic");
    expect(DEFAULT_LEDGER.netPaise).toBe(fees.netPaise);
    expect(DEFAULT_LEDGER.gstPaise).toBe(gstComponent(299900, 18));
    expect({ platform: DEFAULT_LEDGER.platformRate, gateway: DEFAULT_LEDGER.gatewayRate }).toEqual(planRates("basic"));
  });

  it("conserves paise: sale = platform + gateway + net", () => {
    for (const plan of PLAN_OPTIONS) for (const rupees of [1, 7, 333, 2999, 99999]) {
      const l = ledgerFor(rupees, 18, plan.key);
      expect(l.platformFeePaise + l.gatewayFeePaise + l.netPaise).toBe(l.salePaise);
    }
  });
});

describe("landing ledger: GST rate and plan variations", () => {
  it.each(GST_RATES)("GST at %s%% is the inclusive component, never added on top", (rate) => {
    const l = ledgerFor(2999, rate, "basic");
    expect(l.gstPaise).toBe(gstComponent(299900, rate));
    expect(l.salePaise).toBe(299900);
    // GST does not change what the creator nets: it sits inside the price and is not deducted
    expect(l.netPaise).toBe(263912);
  });

  it("0% GST is zero", () => {
    expect(ledgerFor(2999, 0, "basic").gstPaise).toBe(0);
    expect(ledgerFor(2999, 0, "basic").gstRate).toBe(0);
  });

  it("a rate below 100 is kept and a rate of 100 or more is not (it would make the GST the whole price)", () => {
    expect(ledgerFor(2999, 99, "basic").gstRate).toBe(99);
    expect(ledgerFor(2999, 100, "basic").gstRate).toBe(18);
    expect(ledgerFor(2999, 100, "basic").gstPaise).toBe(45747);
  });

  it.each([
    ["basic", 29990, 5998, 263912, true],
    ["pro", 16495, 5998, 277407, false],
    ["advanced", 10497, 5998, 283405, false],
    ["ultimate", 0, 4499, 295401, false],
  ])("%s plan: platform %i, gateway %i, net %i, live=%s", (plan, platform, gateway, net, live) => {
    const l = ledgerFor(2999, 18, plan);
    expect([l.platformFeePaise, l.gatewayFeePaise, l.netPaise]).toEqual([platform, gateway, net]);
    expect(l.planLive).toBe(live);
  });

  it("names and prices the four plans as published", () => {
    expect(PLAN_OPTIONS.map((p) => [p.key, p.name, p.monthlyPaise])).toEqual([
      ["basic", "Basic", 0],
      ["pro", "Pro", 500000],
      ["advanced", "Advanced", 1500000],
      ["ultimate", "Ultimate", 3000000],
    ]);
  });

  it("only Basic is live; the others are flagged draft, as the pricing table does", () => {
    expect(PLAN_OPTIONS.map((p) => [p.key, p.live])).toEqual([
      ["basic", true],
      ["pro", false],
      ["advanced", false],
      ["ultimate", false],
    ]);
  });

  it("monthly plan fees are carried for display but NOT netted", () => {
    const pro = ledgerFor(2999, 18, "pro");
    expect(pro.monthlyPaise).toBe(PLAN_MONTHLY_PAISE.pro);
    expect(pro.monthlyPaise).toBeGreaterThan(0);
    expect(pro.netPaise).toBe(pro.salePaise - pro.platformFeePaise - pro.gatewayFeePaise);
    expect(PLAN_OPTIONS.map((p) => p.monthlyPaise)).toEqual(PLAN_OPTIONS.map((p) => PLAN_MONTHLY_PAISE[p.key]));
  });

  it("an unknown plan or a nonsense GST rate falls back to the defaults instead of inventing a ledger", () => {
    expect(ledgerFor(2999, 18, "platinum").planKey).toBe("basic");
    expect(ledgerFromInput("2999", Number.NaN, "basic").gstRate).toBe(18);
    expect(ledgerFromInput("2999", -5, "basic").gstRate).toBe(18);
    expect(ledgerFromInput("2999", 250, "basic").gstRate).toBe(18);
  });
});

describe("landing ledger: rounding in paise", () => {
  it("rounds half a paisa up, per fee, like feeBreakdown", () => {
    // Rs 1 = 100 paise. Pro platform 5.5% = 5.5 paise -> 6. Advanced 3.5% = 3.5 -> 4. Gateway 2% = 2.
    expect(ledgerFor(1, 18, "pro")).toMatchObject({ platformFeePaise: 6, gatewayFeePaise: 2, netPaise: 92 });
    expect(ledgerFor(1, 18, "advanced")).toMatchObject({ platformFeePaise: 4, gatewayFeePaise: 2, netPaise: 94 });
    expect(ledgerFor(1, 18, "ultimate")).toMatchObject({ platformFeePaise: 0, gatewayFeePaise: 2, netPaise: 98 });
  });

  it("GST rounds to the nearest paisa", () => {
    // 100 * 18 / 118 = 15.254... -> 15
    expect(ledgerFor(1, 18, "basic").gstPaise).toBe(15);
    // 100 * 5 / 105 = 4.76 -> 5
    expect(ledgerFor(1, 5, "basic").gstPaise).toBe(5);
  });

  it("net prints with paise when it is not a whole rupee", () => {
    expect(formatINR(ledgerFor(2999, 18, "basic").netPaise)).toBe("₹2,639.12");
    expect(formatINR(ledgerFor(1000, 18, "basic").netPaise)).toBe("₹880");
  });
});

describe("landing ledger: price input", () => {
  it.each([
    ["2999", 2999],
    ["1", 1],
    [" 450 ", 450],
    [String(MAX_PRICE_RUPEES), MAX_PRICE_RUPEES],
  ])("%j parses to %i", (text, rupees) => {
    expect(parsePriceRupees(text)).toBe(rupees);
  });

  it.each([
    [""], ["   "], ["0"], ["00"], ["-5"], ["12.5"], ["1e3"], ["abc"], ["₹500"], ["NaN"], ["Infinity"], [String(MAX_PRICE_RUPEES + 1)],
    ["29,99"], ["2,99"], ["1,0,0"], ["1,00,0"], ["1,0000"], [",100"], ["100,"], ["1,,000"], ["0,500"], ["1, 000"], ["1 2"], ["1 000"], ["1\u00a0000"],
    ["1,000,00"], ["12,3456"], ["10,00,00,00,000"],
    // one rule for leading zeros, plain or grouped: a price never starts with 0 ("007" is refused like "01,000")
    ["007"], ["05"], ["01"], ["0999"], ["01,000"], ["00,500"], ["01,00,000"], ["0,500"],
  ])(
    "%j is not a usable price",
    (text) => {
      expect(parsePriceRupees(text)).toBeNull();
    },
  );

  it("the bounds are Rs 1 and Rs 10,00,000", () => {
    expect([MIN_PRICE_RUPEES, MAX_PRICE_RUPEES]).toEqual([1, 1_000_000]);
  });

  it("a valid price drives every row and does not say it fell back", () => {
    const l = ledgerFromInput("5000", 18, "basic");
    expect(l.usedDefault).toBe(false);
    expect(l.rupees).toBe(5000);
    expect(l.salePaise).toBe(500000);
    expect(l.netPaise).toBe(440000);
  });

  it.each([[""], ["0"], ["abc"], ["99999999"]])("%j falls back to the default sale and says so", (text) => {
    const l = ledgerFromInput(text, 18, "basic");
    expect(l.usedDefault).toBe(true);
    expect(l.rupees).toBe(DEFAULT_PRICE_RUPEES);
    expect(l.netPaise).toBe(DEFAULT_LEDGER.netPaise);
  });

  it("the fallback keeps the chosen GST rate and plan, and the GST of the default sale at that rate", () => {
    const l = ledgerFromInput("", 5, "pro");
    expect(l).toMatchObject({ usedDefault: true, rupees: 2999, gstRate: 5, planKey: "pro", gstPaise: 14281 }); // 299900 * 5 / 105
    expect(ledgerFromInput("29.99", 18, "basic").gstPaise).toBe(45747);
  });

  it.each([
    ["1,000", 1000], ["12,345", 12345], ["1,00,000", 100000], ["10,00,000", 1000000], ["1,000,000", 1000000], ["100,000", 100000],
    ["1,23,456", 123456], ["123,456", 123456], ["999", 999], [" 1,000 ", 1000], ["\u00a01,000\u202f", 1000],
  ])("%j is a price when its commas are well-formed Indian or Western grouping", (text, rupees) => {
    expect(parsePriceRupees(text)).toBe(rupees);
  });

  it("decimals are not prices, and the rupee sign is the field's job to strip, not the parser's", () => {
    for (const text of ["29.99", "2999.00", "₹500", "₹1,000"]) expect(parsePriceRupees(text), text).toBeNull();
  });

  it("a comma grouped price over the maximum is refused, not wrapped", () => {
    expect(parsePriceRupees("10,00,001")).toBeNull();
    expect(parsePriceRupees("1,000,001")).toBeNull();
  });
});
