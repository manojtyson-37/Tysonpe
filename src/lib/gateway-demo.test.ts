import { describe, expect, it } from "vitest";
import {
  EASEBUZZ_WINDOW_SECONDS,
  canDismissRazorpay,
  countdownNotice,
  formatCountdown,
  isCountdownUrgent,
} from "./gateway-demo";

describe("formatCountdown", () => {
  it("pads minutes and seconds to MM:SS", () => {
    expect(formatCountdown(900)).toBe("15:00");
    expect(formatCountdown(899)).toBe("14:59");
    expect(formatCountdown(61)).toBe("01:01");
    expect(formatCountdown(9)).toBe("00:09");
    expect(formatCountdown(0)).toBe("00:00");
  });

  it("clamps negative input and drops fractions", () => {
    expect(formatCountdown(-5)).toBe("00:00");
    expect(formatCountdown(59.9)).toBe("00:59");
  });

  it("the window is fifteen minutes", () => {
    expect(EASEBUZZ_WINDOW_SECONDS).toBe(900);
    expect(formatCountdown(EASEBUZZ_WINDOW_SECONDS)).toBe("15:00");
  });
});

describe("countdownNotice: what a live region reads", () => {
  it("is silent above five minutes", () => {
    for (const s of [900, 600, 301]) expect(countdownNotice(s)).toBe("");
  });

  it("speaks at 5:00, 1:00 and 0:00", () => {
    expect(countdownNotice(300)).toMatch(/5 minutes left/);
    expect(countdownNotice(60)).toMatch(/1 minute left/);
    expect(countdownNotice(0)).toMatch(/Time is up/);
  });

  it("changes value exactly three times over the whole window, so a live region speaks three times, not 900", () => {
    const changes: { at: number; text: string }[] = [];
    let previous = countdownNotice(EASEBUZZ_WINDOW_SECONDS);
    for (let s = EASEBUZZ_WINDOW_SECONDS - 1; s >= 0; s--) {
      const text = countdownNotice(s);
      if (text !== previous) changes.push({ at: s, text });
      previous = text;
    }
    expect(changes.map((c) => c.at)).toEqual([300, 60, 0]);
  });

  it("makes no claim about security, encryption or compliance", () => {
    for (const s of [300, 60, 0]) expect(countdownNotice(s)).not.toMatch(/secure|encrypt|pci|bank-grade/i);
  });
});

describe("isCountdownUrgent", () => {
  it("turns on in the last two minutes", () => {
    expect(isCountdownUrgent(121)).toBe(false);
    expect(isCountdownUrgent(120)).toBe(false);
    expect(isCountdownUrgent(119)).toBe(true);
    expect(isCountdownUrgent(0)).toBe(true);
  });
});

describe("canDismissRazorpay", () => {
  it("blocks dismissal only while the payment is being settled", () => {
    expect(canDismissRazorpay("processing")).toBe(false);
    for (const s of ["idle", "success", "failed"] as const) expect(canDismissRazorpay(s)).toBe(true);
  });
});
