import { describe, it, expect, vi, beforeEach } from "vitest";
import { initiateJodoPaymentAction, verifyAndUnlockJodoOrderAction, queryJodoOrderStatusAction } from "./jodo-payment";
import * as jodoService from "@/lib/payments/jodo";

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(
    new Map([
      ["host", "tysonpe.vercel.app"],
      ["x-forwarded-proto", "https"],
    ])
  ),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Jodo Payment Server Actions", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("validates mandatory fields: name, phone, email", async () => {
    const fd = new FormData();
    fd.set("name", "R"); // too short
    fd.set("phone", "123"); // too short
    fd.set("email", "invalid");

    const res = await initiateJodoPaymentAction(null, fd);
    expect(res.ok).toBe(false);
    expect(res.error).toContain("valid full name");

    fd.set("name", "Ron Rivest");
    const res2 = await initiateJodoPaymentAction(null, fd);
    expect(res2.ok).toBe(false);
    expect(res2.error).toContain("10-digit mobile number");

    fd.set("phone", "9876543210");
    const res3 = await initiateJodoPaymentAction(null, fd);
    expect(res3.ok).toBe(false);
    expect(res3.error).toContain("valid email address");
  });

  it("calls createJodoPayOrder and returns redirectUrl upon valid input", async () => {
    const fd = new FormData();
    fd.set("name", "Ron Rivest");
    fd.set("phone", "9876543210");
    fd.set("email", "customer@example.com");
    fd.set("amount", "250");

    vi.spyOn(jodoService, "createJodoPayOrder").mockResolvedValue({
      ok: true,
      orderId: "order_xyz",
      redirectUrl: "https://pay.devtest1.jodopay.com/pages/sample",
    });

    const res = await initiateJodoPaymentAction(null, fd);
    expect(res.ok).toBe(true);
    expect(res.orderId).toBe("order_xyz");
    expect(res.redirectUrl).toBe("https://pay.devtest1.jodopay.com/pages/sample");
  });

  it("verifies and unlocks order via completeJodoOrderAndUnlock", async () => {
    vi.spyOn(jodoService, "completeJodoOrderAndUnlock").mockResolvedValue({
      ok: true,
      orderId: "order_xyz",
      invoiceNo: "TP/2026-27/00101",
      status: "paid",
      courseTitle: "AI Masterclass",
    });

    const res = await verifyAndUnlockJodoOrderAction("order_xyz");
    expect(res.ok).toBe(true);
    expect(res.invoiceNo).toBe("TP/2026-27/00101");
  });
});
