import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { safeEqualHex, verifyPaymentSignature, verifyWebhookSignature } from "./signature";

const hmac = (secret: string, data: string) =>
  createHmac("sha256", secret).update(data).digest("hex");

describe("verifyPaymentSignature (Razorpay: HMAC(order_id|payment_id))", () => {
  const secret = "key_secret_test";
  const good = hmac(secret, "order_ABC|pay_XYZ");

  it("accepts a correct signature", () =>
    expect(verifyPaymentSignature("order_ABC", "pay_XYZ", good, secret)).toBe(true));
  it("rejects a different payment id", () =>
    expect(verifyPaymentSignature("order_ABC", "pay_OTHER", good, secret)).toBe(false));
  it("rejects a different order id", () =>
    expect(verifyPaymentSignature("order_OTHER", "pay_XYZ", good, secret)).toBe(false));
  it("rejects a wrong secret", () =>
    expect(verifyPaymentSignature("order_ABC", "pay_XYZ", good, "other")).toBe(false));
  it("rejects empty / malformed signature without throwing", () => {
    expect(verifyPaymentSignature("order_ABC", "pay_XYZ", "", secret)).toBe(false);
    expect(verifyPaymentSignature("order_ABC", "pay_XYZ", "zz", secret)).toBe(false);
  });
  it("rejects when secret is empty", () =>
    expect(verifyPaymentSignature("o", "p", hmac("", "o|p"), "")).toBe(false));
});

describe("verifyWebhookSignature (HMAC(rawBody))", () => {
  const secret = "whsec_test";
  const body = '{"event":"payment.captured","payload":{}}';
  it("accepts correct", () =>
    expect(verifyWebhookSignature(body, hmac(secret, body), secret)).toBe(true));
  it("rejects tampered body", () =>
    expect(verifyWebhookSignature(body + " ", hmac(secret, body), secret)).toBe(false));
  it("rejects missing header", () =>
    expect(verifyWebhookSignature(body, null, secret)).toBe(false));
});

describe("safeEqualHex", () => {
  it("false for different lengths instead of throwing", () =>
    expect(safeEqualHex("abcd", "abcdef")).toBe(false));
  it("true for equal", () => expect(safeEqualHex("abcd", "abcd")).toBe(true));
});
