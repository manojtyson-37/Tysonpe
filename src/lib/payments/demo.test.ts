import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { createCheckoutOrder } from "@/lib/orders";
import { makeCreatorWithProduct, makeUser } from "@/test/factories";
import { settleDemoPayment } from "./demo";

async function pending() {
  const { product } = await makeCreatorWithProduct({ pricePaise: 99900, gstRatePct: 18 });
  const buyer = await makeUser("Buyer");
  const order = await createCheckoutOrder({ userId: buyer.id, productId: product.id });
  return { buyer, product, order };
}

beforeEach(() => {
  vi.stubEnv("PAYMENTS_MODE", "demo");
  vi.stubEnv("EASEBUZZ_KEY", "");
  vi.stubEnv("EASEBUZZ_SALT", "");
});

describe("settleDemoPayment", () => {
  it("success pays the order through the verified mock path and enrols the buyer", async () => {
    const { buyer, order, product } = await pending();
    expect(order.provider).toBe("mock");
    const r = await settleDemoPayment({ userId: buyer.id, orderId: order.id, outcome: "success" });
    expect(r).toEqual({ status: "paid", to: `/checkout/success/${order.id}` });
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("paid");
    expect(await db.enrollment.count({ where: { userId: buyer.id, productId: product.id } })).toBe(1);
  });
  it("failure and cancel mark the order failed and send the buyer back to the pay page", async () => {
    for (const outcome of ["failure", "cancel"] as const) {
      const { buyer, order } = await pending();
      const r = await settleDemoPayment({ userId: buyer.id, orderId: order.id, outcome });
      expect(r).toEqual({ status: "failed", to: `/checkout/pay/${order.id}?failed=1` });
      expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("failed");
    }
  });
  it("a failed attempt can be retried to success", async () => {
    const { buyer, order } = await pending();
    await settleDemoPayment({ userId: buyer.id, orderId: order.id, outcome: "failure" });
    expect((await settleDemoPayment({ userId: buyer.id, orderId: order.id, outcome: "success" })).status).toBe("paid");
  });
  it("is idempotent for double clicks, and a late failure never downgrades a paid order", async () => {
    const { buyer, order } = await pending();
    await settleDemoPayment({ userId: buyer.id, orderId: order.id, outcome: "success" });
    await settleDemoPayment({ userId: buyer.id, orderId: order.id, outcome: "success" });
    const late = await settleDemoPayment({ userId: buyer.id, orderId: order.id, outcome: "failure" });
    expect(late.status).toBe("paid");
    expect(await db.enrollment.count({ where: { orderId: order.id } })).toBe(1);
    expect(await db.ledgerEntry.count({ where: { orderId: order.id } })).toBe(1);
  });
  it("rejects unknown outcomes, other users' orders and non-demo orders", async () => {
    const { buyer, order } = await pending();
    await expect(settleDemoPayment({ userId: buyer.id, orderId: order.id, outcome: "refund" as never })).rejects.toMatchObject({ code: "invalid_outcome" });
    const stranger = await makeUser("Stranger");
    await expect(settleDemoPayment({ userId: stranger.id, orderId: order.id, outcome: "success" })).rejects.toMatchObject({ code: "not_found" });
    await db.order.update({ where: { id: order.id }, data: { provider: "razorpay" } });
    await expect(settleDemoPayment({ userId: buyer.id, orderId: order.id, outcome: "success" })).rejects.toMatchObject({ code: "not_found" });
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("created");
  });
  it("is refused in production", async () => {
    const { buyer, order } = await pending();
    vi.stubEnv("NODE_ENV", "production");
    await expect(settleDemoPayment({ userId: buyer.id, orderId: order.id, outcome: "success" })).rejects.toThrow(/production/);
  });
});
