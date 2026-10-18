import { describe, expect, it } from "vitest";
import {
  COUNTDOWN_LENGTH_SECONDS,
  COUNTDOWN_START_SECONDS,
  DEFAULT_SALES_RUPEES,
  DEMO_APPS,
  DEMO_GST_PAISE,
  DEMO_INVOICE_NO,
  DEMO_MODES,
  DEMO_TOTAL_PAISE,
  FEE_PLAN_KEYS,
  INITIAL_FLOW,
  SALES_MAX_RUPEES,
  SALES_MIN_RUPEES,
  SETTLE_MS,
  appName,
  deltaSentence,
  feeRows,
  flowReducer,
  formatTimer,
  isDemoMode,
  nextCountdown,
  parseSalesRupees,
  promptTitle,
  settleDelay,
  stepAnnouncement,
  ultimateDeltaPaise,
  type DemoFlow,
  type FlowAction,
} from "./demo-model";
import { PLAN_MONTHLY_PAISE, feeBreakdown, formatINR, planRates } from "./money";

const run = (actions: FlowAction[], from: DemoFlow = INITIAL_FLOW) => actions.reduce(flowReducer, from);

describe("demo model: the sample order", () => {
  it("is Rs 1,180 with the Rs 180 of GST inside it, worked out by hand", () => {
    expect(DEMO_TOTAL_PAISE).toBe(118000);
    expect(DEMO_GST_PAISE).toBe(18000); // 118000 * 18 / 118
    expect(formatINR(DEMO_TOTAL_PAISE)).toBe("₹1,180");
    expect(formatINR(DEMO_GST_PAISE)).toBe("₹180");
  });

  it("numbers the sample invoice in the real format", () => {
    expect(DEMO_INVOICE_NO).toBe("TP/2026-27/00001");
  });
});

describe("demo model: modes", () => {
  it("lists the three tabs and recognises only those", () => {
    expect(DEMO_MODES.map((m) => m.value)).toEqual(["upi-qr", "easebuzz", "fees"]);
    expect(isDemoMode("fees")).toBe(true);
    expect(isDemoMode("razorpay-qr")).toBe(false);
    expect(isDemoMode("")).toBe(false);
  });
});

describe("demo model: countdown", () => {
  it("formats mm:ss with zero padding", () => {
    expect(formatTimer(892)).toBe("14:52");
    expect(formatTimer(900)).toBe("15:00");
    expect(formatTimer(61)).toBe("01:01");
    expect(formatTimer(9)).toBe("00:09");
    expect(formatTimer(0)).toBe("00:00");
  });

  it("counts down one second at a time and wraps 00:00 to a fresh 15:00", () => {
    expect(COUNTDOWN_START_SECONDS).toBe(892);
    expect(COUNTDOWN_LENGTH_SECONDS).toBe(900);
    expect(nextCountdown(892)).toBe(891);
    expect(nextCountdown(1)).toBe(0);
    expect(formatTimer(nextCountdown(0))).toBe("15:00");
    expect(nextCountdown(nextCountdown(1))).toBe(900);
  });

  it("takes 892 ticks to reach 00:00 and one more to wrap", () => {
    let c = COUNTDOWN_START_SECONDS;
    for (let i = 0; i < 892; i++) c = nextCountdown(c);
    expect(formatTimer(c)).toBe("00:00");
    expect(formatTimer(nextCountdown(c))).toBe("15:00");
  });
});

describe("demo model: the step machine", () => {
  it("starts untouched on the checkout step", () => {
    expect(INITIAL_FLOW).toEqual({ step: "checkout", app: "upi", outcome: null, touched: false });
  });

  it("walks checkout -> phone-prompt -> processing -> success -> checkout", () => {
    const prompt = run([{ type: "choose-app", app: "gpay" }]);
    expect(prompt).toEqual({ step: "phone-prompt", app: "gpay", outcome: null, touched: true });
    const processing = run([{ type: "approve" }], prompt);
    expect(processing).toMatchObject({ step: "processing", outcome: "success", app: "gpay" });
    const done = run([{ type: "settle" }], processing);
    expect(done.step).toBe("success");
    const again = run([{ type: "reset" }], done);
    expect(again).toEqual({ ...INITIAL_FLOW, touched: true });
  });

  it("walks the decline path to failed", () => {
    const f = run([{ type: "choose-app", app: "paytm" }, { type: "decline" }, { type: "settle" }]);
    expect(f).toMatchObject({ step: "failed", outcome: "failed", app: "paytm" });
  });

  it("lets the hosted page pay or cancel straight from checkout (no phone prompt)", () => {
    expect(run([{ type: "approve" }, { type: "settle" }]).step).toBe("success");
    expect(run([{ type: "decline" }, { type: "settle" }]).step).toBe("failed");
  });

  it("ignores an action that does not fit the step, returning the same object", () => {
    const processing = run([{ type: "choose-app", app: "gpay" }, { type: "approve" }]);
    expect(flowReducer(processing, { type: "choose-app", app: "paytm" })).toBe(processing);
    expect(flowReducer(processing, { type: "approve" })).toBe(processing);
    expect(flowReducer(processing, { type: "decline" })).toBe(processing);
    expect(flowReducer(INITIAL_FLOW, { type: "settle" })).toBe(INITIAL_FLOW); // a late timer after a reset
    expect(flowReducer(INITIAL_FLOW, { type: "reset" })).toBe(INITIAL_FLOW);
    const success = run([{ type: "approve" }, { type: "settle" }]);
    expect(flowReducer(success, { type: "settle" })).toBe(success);
    expect(flowReducer(success, { type: "approve" })).toBe(success);
  });

  it("choose-app only works from checkout: from the prompt, a result or a failure it returns the same object", () => {
    const prompt = run([{ type: "choose-app", app: "gpay" }]);
    const success = run([{ type: "approve" }, { type: "settle" }]);
    const failed = run([{ type: "decline" }, { type: "settle" }]);
    for (const state of [prompt, success, failed]) {
      expect(flowReducer(state, { type: "choose-app", app: "paytm" }), state.step).toBe(state);
    }
    // and from the prompt it must not swap the app mid-request
    expect(flowReducer(prompt, { type: "choose-app", app: "paytm" }).app).toBe("gpay");
  });

  it("approve and decline only work from checkout or the prompt; a result screen ignores them", () => {
    const failed = run([{ type: "decline" }, { type: "settle" }]);
    expect(flowReducer(failed, { type: "approve" })).toBe(failed);
    expect(flowReducer(failed, { type: "decline" })).toBe(failed);
  });

  it("reset returns to an untouched-looking checkout that still counts as touched (so focus and enter still run)", () => {
    for (const from of [run([{ type: "choose-app", app: "gpay" }]), run([{ type: "approve" }]), run([{ type: "approve" }, { type: "settle" }]), run([{ type: "decline" }, { type: "settle" }])]) {
      expect(flowReducer(from, { type: "reset" }), from.step).toEqual({ step: "checkout", app: "upi", outcome: null, touched: true });
    }
  });

  it("a settle after a reset cannot resurrect a result", () => {
    const processing = run([{ type: "approve" }]);
    const reset = run([{ type: "reset" }], processing);
    expect(run([{ type: "settle" }], reset).step).toBe("checkout");
  });

  it("schedules the settle only while processing: 1.2s to success, 0.6s to failed", () => {
    expect(SETTLE_MS).toEqual({ success: 1200, failed: 600 });
    expect(settleDelay(INITIAL_FLOW)).toBeNull();
    expect(settleDelay(run([{ type: "choose-app", app: "gpay" }]))).toBeNull();
    expect(settleDelay(run([{ type: "approve" }]))).toBe(1200);
    expect(settleDelay(run([{ type: "decline" }]))).toBe(600);
    expect(settleDelay(run([{ type: "approve" }, { type: "settle" }]))).toBeNull();
  });
});

describe("demo model: apps and announcements", () => {
  it("names four apps, the last one generic", () => {
    expect(DEMO_APPS.map((a) => a.name)).toEqual(["Google Pay", "PhonePe", "Paytm", "Other UPI app"]);
    expect(appName("phonepe")).toBe("PhonePe");
  });

  it("titles the phone prompt by app, and says 'your UPI app' for the generic one (the QR scan path)", () => {
    expect(promptTitle("gpay")).toBe("Payment request in Google Pay");
    expect(promptTitle("phonepe")).toBe("Payment request in PhonePe");
    expect(promptTitle("upi")).toBe("Payment request in your UPI app");
    const scan = run([{ type: "choose-app", app: "upi" }]);
    expect(stepAnnouncement(scan, "upi")).toBe("Simulated payment request in your UPI app for ₹1,180. Approve or decline.");
    expect(stepAnnouncement(scan, "upi")).not.toContain("Other UPI app");
  });

  it("announces every step as a simulation, with the amount where one is shown", () => {
    const prompt = run([{ type: "choose-app", app: "gpay" }]);
    const processing = run([{ type: "approve" }], prompt);
    const success = run([{ type: "settle" }], processing);
    const failed = run([{ type: "decline" }, { type: "settle" }], prompt);
    const all = [
      stepAnnouncement(INITIAL_FLOW, "upi"),
      stepAnnouncement(INITIAL_FLOW, "hosted"),
      stepAnnouncement(prompt, "upi"),
      stepAnnouncement(processing, "upi"),
      stepAnnouncement(success, "upi"),
      stepAnnouncement(failed, "upi"),
      stepAnnouncement(failed, "hosted"),
    ];
    for (const line of all) expect(line).toMatch(/Simulated/);
    expect(new Set(all).size).toBe(all.length);
    expect(stepAnnouncement(prompt, "upi")).toContain("Google Pay");
    expect(stepAnnouncement(success, "upi")).toContain("₹1,180");
    expect(stepAnnouncement(failed, "hosted")).toContain("cancelled");
    expect(stepAnnouncement(failed, "upi")).toContain("declined");
    for (const line of all) expect(line).not.toContain("!");
  });
});

describe("demo model: fee calculator", () => {
  it("defaults to Rs 2,50,000 a month and clamps the slider range", () => {
    expect(DEFAULT_SALES_RUPEES).toBe(250000);
    expect(parseSalesRupees(250000)).toBe(250000);
    expect(parseSalesRupees(10)).toBe(SALES_MIN_RUPEES);
    expect(parseSalesRupees(99999999)).toBe(SALES_MAX_RUPEES);
    expect(parseSalesRupees(NaN)).toBe(DEFAULT_SALES_RUPEES);
    expect(parseSalesRupees(Infinity)).toBe(DEFAULT_SALES_RUPEES);
    expect(parseSalesRupees(123456.7)).toBe(123457);
  });

  it("pins every plan at the default sales against a hand-worked oracle, in paise", () => {
    // gross 25,000,000 paise. Rates: basic 10%+2%, pro 5.5%+2%, advanced 3.5%+2%, ultimate 0%+1.5%.
    const rows = feeRows(DEFAULT_SALES_RUPEES);
    expect(rows.map((r) => r.key)).toEqual([...FEE_PLAN_KEYS]);
    expect(rows.map((r) => [r.platformFeePaise, r.gatewayFeePaise, r.netPaise, r.monthlyPaise, r.takeHomePaise])).toEqual([
      [2500000, 500000, 22000000, 0, 22000000],
      [1375000, 500000, 23125000, 500000, 22625000],
      [875000, 500000, 23625000, 1500000, 22125000],
      [0, 375000, 24625000, 3000000, 21625000],
    ]);
  });

  it("derives rows from money.ts, not from typed figures", () => {
    for (const row of feeRows(DEFAULT_SALES_RUPEES)) {
      expect(row.monthlyPaise).toBe(PLAN_MONTHLY_PAISE[row.key]);
      expect(row).toMatchObject(feeBreakdown(DEFAULT_SALES_RUPEES * 100, row.key));
      const rates = planRates(row.key);
      expect(row.rate).toBe(`${rates.platform} + ${rates.gateway} gateway`);
    }
    expect(feeRows(DEFAULT_SALES_RUPEES).map((r) => r.label)).toEqual(["Basic", "Pro", "Advanced", "Ultimate"]);
  });

  it("shows Ultimate NEGATIVE against Basic at the default sales, after the Rs 30,000 plan fee", () => {
    const delta = ultimateDeltaPaise(feeRows(DEFAULT_SALES_RUPEES));
    expect(PLAN_MONTHLY_PAISE.ultimate).toBe(3000000);
    expect(delta).toBe(-375000); // 21,625,000 - 22,000,000
    expect(delta).toBeLessThan(0);
    expect(formatINR(Math.abs(delta))).toBe("₹3,750");
    expect(deltaSentence(delta)).toBe("Ultimate leaves you ₹3,750 less than Basic each month");
  });

  it("flips positive only above the break-even (0.105 x sales = Rs 30,000, about Rs 2,85,714)", () => {
    expect(ultimateDeltaPaise(feeRows(275000))).toBe(-112500);
    expect(ultimateDeltaPaise(feeRows(300000))).toBe(150000);
    expect(deltaSentence(150000)).toBe("Ultimate leaves you ₹1,500 more than Basic each month");
    expect(deltaSentence(0)).toBe("Ultimate and Basic leave you the same each month");
    expect(ultimateDeltaPaise(feeRows(SALES_MAX_RUPEES))).toBeGreaterThan(0);
    expect(ultimateDeltaPaise(feeRows(SALES_MIN_RUPEES))).toBeLessThan(0);
  });

  it("nets the monthly fee off take-home but never off the ledger net", () => {
    for (const r of feeRows(500000)) expect(r.takeHomePaise).toBe(r.netPaise - r.monthlyPaise);
    // the ledger net is the plain feeBreakdown net: the monthly fee is a separate line
    expect(feeRows(500000)[3].netPaise).toBe(feeBreakdown(50000000, "ultimate").netPaise);
  });
});
