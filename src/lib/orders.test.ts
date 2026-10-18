import { beforeEach, describe, expect, it } from "vitest";
import { db } from "./db";
import {
  AppError,
  confirmPayment,
  createCheckoutOrder,
  handleWebhook,
  markOrderFailed,
  markOrderPaid,
  refundOrder,
} from "./orders";
import { hmacHex } from "./payments/signature";
import { mockSecret, signMockPayment } from "./payments/mock";

let seq = 0;
async function makeUser(name = "U") {
  seq++;
  return db.user.create({
    data: { email: `u${seq}-${Date.now()}@t.test`, name, passwordHash: "x" },
  });
}
async function makeCreator(planKey = "basic") {
  const user = await makeUser("Creator");
  const creator = await db.creator.create({
    data: { userId: user.id, handle: `c${seq}${Date.now()}`, displayName: "C", planKey },
  });
  return { user, creator };
}
async function makeProduct(creatorId: string, over: Record<string, unknown> = {}) {
  seq++;
  return db.product.create({
    data: {
      creatorId,
      slug: `p${seq}`,
      type: "course",
      title: "Course",
      pricePaise: 118000,
      gstRatePct: 18,
      status: "published",
      ...over,
    },
  });
}

let ctx: Awaited<ReturnType<typeof setup>>;
async function setup() {
  const { creator, user: creatorUser } = await makeCreator();
  const product = await makeProduct(creator.id);
  const buyer = await makeUser("Buyer");
  return { creator, creatorUser, product, buyer };
}
beforeEach(async () => {
  ctx = await setup();
});

describe("createCheckoutOrder", () => {
  it("creates a created order with GST-inclusive breakdown", async () => {
    const o = await createCheckoutOrder({ userId: ctx.buyer.id, productId: ctx.product.id });
    expect(o.status).toBe("created");
    expect(o.totalPaise).toBe(118000);
    expect(o.gstPaise).toBe(18000);
    expect(o.provider).toBe("mock");
    expect(o.providerOrderId).toMatch(/^order_mock_/);
  });

  it("applies a valid coupon", async () => {
    await db.coupon.create({
      data: { creatorId: ctx.creator.id, code: "HALF", percentOff: 50 },
    });
    const o = await createCheckoutOrder({
      userId: ctx.buyer.id,
      productId: ctx.product.id,
      couponCode: "half",
    });
    expect(o.discountPaise).toBe(59000);
    expect(o.totalPaise).toBe(59000);
    expect(o.couponId).toBeTruthy();
  });

  it("rejects a coupon from another creator", async () => {
    const other = await makeCreator();
    await db.coupon.create({ data: { creatorId: other.creator.id, code: "NOPE", percentOff: 50 } });
    await expect(
      createCheckoutOrder({ userId: ctx.buyer.id, productId: ctx.product.id, couponCode: "NOPE" }),
    ).rejects.toMatchObject({ code: "coupon_not_found" });
  });

  it("rejects an expired coupon with a reason", async () => {
    await db.coupon.create({
      data: {
        creatorId: ctx.creator.id,
        code: "OLD",
        percentOff: 10,
        expiresAt: new Date(Date.now() - 1000),
      },
    });
    await expect(
      createCheckoutOrder({ userId: ctx.buyer.id, productId: ctx.product.id, couponCode: "OLD" }),
    ).rejects.toMatchObject({ code: "coupon_expired" });
  });

  it("rejects unpublished products", async () => {
    const draft = await makeProduct(ctx.creator.id, { status: "draft" });
    await expect(
      createCheckoutOrder({ userId: ctx.buyer.id, productId: draft.id }),
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("rejects a creator buying their own product", async () => {
    await expect(
      createCheckoutOrder({ userId: ctx.creatorUser.id, productId: ctx.product.id }),
    ).rejects.toMatchObject({ code: "own_product" });
  });

  it("rejects when already enrolled", async () => {
    const o = await createCheckoutOrder({ userId: ctx.buyer.id, productId: ctx.product.id });
    await markOrderPaid({ providerOrderId: o.providerOrderId, paymentId: "pay_1" });
    await expect(
      createCheckoutOrder({ userId: ctx.buyer.id, productId: ctx.product.id }),
    ).rejects.toMatchObject({ code: "already_enrolled" });
  });

  it("100% coupon completes immediately with no gateway", async () => {
    await db.coupon.create({ data: { creatorId: ctx.creator.id, code: "FREE", percentOff: 100 } });
    const o = await createCheckoutOrder({
      userId: ctx.buyer.id,
      productId: ctx.product.id,
      couponCode: "FREE",
    });
    expect(o.status).toBe("paid");
    expect(o.provider).toBe("free");
    expect(
      await db.enrollment.count({ where: { userId: ctx.buyer.id, productId: ctx.product.id } }),
    ).toBe(1);
  });
});

describe("markOrderPaid", () => {
  it("enrols, writes ledger, invoice number, counts coupon", async () => {
    const coupon = await db.coupon.create({
      data: { creatorId: ctx.creator.id, code: "TEN", percentOff: 10 },
    });
    const o = await createCheckoutOrder({
      userId: ctx.buyer.id,
      productId: ctx.product.id,
      couponCode: "TEN",
    });
    const paid = await markOrderPaid({ providerOrderId: o.providerOrderId, paymentId: "pay_1" });
    expect(paid.status).toBe("paid");
    expect(paid.invoiceNo).toMatch(/^TP\/\d{4}-\d{2}\/\d{5}$/);
    expect(paid.providerPaymentId).toBe("pay_1");

    const ledger = await db.ledgerEntry.findUniqueOrThrow({ where: { orderId: o.id } });
    expect(ledger.grossPaise).toBe(106200);
    expect(ledger.platformFeePaise + ledger.gatewayFeePaise + ledger.netPaise).toBe(106200);
    expect((await db.coupon.findUniqueOrThrow({ where: { id: coupon.id } })).redeemed).toBe(1);
  });

  it("is idempotent: replaying creates no duplicates", async () => {
    await db.coupon.create({ data: { creatorId: ctx.creator.id, code: "TEN", percentOff: 10 } });
    const o = await createCheckoutOrder({
      userId: ctx.buyer.id,
      productId: ctx.product.id,
      couponCode: "TEN",
    });
    const a = await markOrderPaid({ providerOrderId: o.providerOrderId, paymentId: "pay_1" });
    const b = await markOrderPaid({ providerOrderId: o.providerOrderId, paymentId: "pay_1" });
    expect(b.invoiceNo).toBe(a.invoiceNo);
    expect(await db.enrollment.count({ where: { orderId: o.id } })).toBe(1);
    expect(await db.ledgerEntry.count({ where: { orderId: o.id } })).toBe(1);
    expect((await db.coupon.findFirstOrThrow({ where: { code: "TEN", creatorId: ctx.creator.id } })).redeemed).toBe(1);
  });

  it("is idempotent under concurrent replays", async () => {
    const o = await createCheckoutOrder({ userId: ctx.buyer.id, productId: ctx.product.id });
    await Promise.allSettled([
      markOrderPaid({ providerOrderId: o.providerOrderId, paymentId: "pay_1" }),
      markOrderPaid({ providerOrderId: o.providerOrderId, paymentId: "pay_1" }),
      markOrderPaid({ providerOrderId: o.providerOrderId, paymentId: "pay_1" }),
    ]);
    expect(await db.enrollment.count({ where: { orderId: o.id } })).toBe(1);
    expect(await db.ledgerEntry.count({ where: { orderId: o.id } })).toBe(1);
  });

  it("does not resurrect a refunded order", async () => {
    const o = await createCheckoutOrder({ userId: ctx.buyer.id, productId: ctx.product.id });
    await markOrderPaid({ providerOrderId: o.providerOrderId, paymentId: "pay_1" });
    await refundOrder({ creatorId: ctx.creator.id, orderId: o.id });
    const again = await markOrderPaid({ providerOrderId: o.providerOrderId, paymentId: "pay_1" });
    expect(again.status).toBe("refunded");
    expect(await db.enrollment.count({ where: { orderId: o.id } })).toBe(0);
  });

  it("throws for an unknown provider order", async () => {
    await expect(
      markOrderPaid({ providerOrderId: "order_nope", paymentId: "pay_1" }),
    ).rejects.toBeInstanceOf(AppError);
  });
});

describe("confirmPayment (browser callback)", () => {
  it("accepts a valid signature from the buyer", async () => {
    const o = await createCheckoutOrder({ userId: ctx.buyer.id, productId: ctx.product.id });
    const sig = signMockPayment(o.providerOrderId, "pay_9");
    const paid = await confirmPayment({
      userId: ctx.buyer.id,
      providerOrderId: o.providerOrderId,
      paymentId: "pay_9",
      signature: sig,
    });
    expect(paid.status).toBe("paid");
  });

  it("rejects a forged signature and leaves the order unpaid", async () => {
    const o = await createCheckoutOrder({ userId: ctx.buyer.id, productId: ctx.product.id });
    await expect(
      confirmPayment({
        userId: ctx.buyer.id,
        providerOrderId: o.providerOrderId,
        paymentId: "pay_9",
        signature: "deadbeef",
      }),
    ).rejects.toMatchObject({ code: "bad_signature" });
    expect((await db.order.findUniqueOrThrow({ where: { id: o.id } })).status).toBe("created");
  });

  it("rejects confirmation by a different user", async () => {
    const o = await createCheckoutOrder({ userId: ctx.buyer.id, productId: ctx.product.id });
    const stranger = await makeUser("Stranger");
    await expect(
      confirmPayment({
        userId: stranger.id,
        providerOrderId: o.providerOrderId,
        paymentId: "pay_9",
        signature: signMockPayment(o.providerOrderId, "pay_9"),
      }),
    ).rejects.toMatchObject({ code: "not_found" });
  });
});

describe("handleWebhook", () => {
  const body = (event: string, orderId: string, id: string) =>
    JSON.stringify({
      id,
      event,
      payload: { payment: { entity: { id: "pay_w1", order_id: orderId } } },
    });
  const sign = (raw: string) => hmacHex(mockSecret(), raw);

  it("rejects a bad signature", async () => {
    await expect(handleWebhook(body("payment.captured", "x", "evt_1"), "bad")).rejects.toMatchObject({
      code: "bad_signature",
    });
  });

  it("captures payment once, ignores duplicate event ids", async () => {
    const o = await createCheckoutOrder({ userId: ctx.buyer.id, productId: ctx.product.id });
    const raw = body("payment.captured", o.providerOrderId, "evt_dup");
    expect(await handleWebhook(raw, sign(raw))).toEqual({ handled: true });
    expect(await handleWebhook(raw, sign(raw))).toEqual({ handled: false, duplicate: true });
    expect(await db.enrollment.count({ where: { orderId: o.id } })).toBe(1);
  });

  it("marks order failed on payment.failed", async () => {
    const o = await createCheckoutOrder({ userId: ctx.buyer.id, productId: ctx.product.id });
    const raw = body("payment.failed", o.providerOrderId, "evt_fail");
    await handleWebhook(raw, sign(raw));
    expect((await db.order.findUniqueOrThrow({ where: { id: o.id } })).status).toBe("failed");
  });

  it("a failed order can still be paid later (retry)", async () => {
    const o = await createCheckoutOrder({ userId: ctx.buyer.id, productId: ctx.product.id });
    const f = body("payment.failed", o.providerOrderId, "evt_f2");
    await handleWebhook(f, sign(f));
    const p = body("payment.captured", o.providerOrderId, "evt_p2");
    await handleWebhook(p, sign(p));
    expect((await db.order.findUniqueOrThrow({ where: { id: o.id } })).status).toBe("paid");
  });
});

describe("refundOrder", () => {
  it("revokes access and marks refunded", async () => {
    const o = await createCheckoutOrder({ userId: ctx.buyer.id, productId: ctx.product.id });
    await markOrderPaid({ providerOrderId: o.providerOrderId, paymentId: "pay_1" });
    const r = await refundOrder({ creatorId: ctx.creator.id, orderId: o.id });
    expect(r.status).toBe("refunded");
    expect(await db.enrollment.count({ where: { orderId: o.id } })).toBe(0);
  });

  it("forbids another creator", async () => {
    const o = await createCheckoutOrder({ userId: ctx.buyer.id, productId: ctx.product.id });
    await markOrderPaid({ providerOrderId: o.providerOrderId, paymentId: "pay_1" });
    const other = await makeCreator();
    await expect(
      refundOrder({ creatorId: other.creator.id, orderId: o.id }),
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("only refunds paid orders", async () => {
    const o = await createCheckoutOrder({ userId: ctx.buyer.id, productId: ctx.product.id });
    await expect(refundOrder({ creatorId: ctx.creator.id, orderId: o.id })).rejects.toMatchObject({
      code: "invalid_state",
    });
  });
});

const redeemed = async (code: string) =>
  (await db.coupon.findFirstOrThrow({ where: { code, creatorId: ctx.creator.id } })).redeemed;
const mkCoupon = (over: Record<string, unknown> = {}) =>
  db.coupon.create({ data: { creatorId: ctx.creator.id, code: "ONE", percentOff: 10, maxRedemptions: 1, ...over } });

describe("coupon redemption cap (reserved at order creation)", () => {
  it("a 1-use coupon cannot be held by two buyers", async () => {
    await mkCoupon();
    const other = await makeUser();
    await createCheckoutOrder({ userId: ctx.buyer.id, productId: ctx.product.id, couponCode: "ONE" });
    await expect(
      createCheckoutOrder({ userId: other.id, productId: ctx.product.id, couponCode: "ONE" }),
    ).rejects.toMatchObject({ code: "coupon_exhausted" });
    expect(await redeemed("ONE")).toBe(1);
  });

  it("concurrent creation cannot exceed the cap", async () => {
    await mkCoupon();
    const users = await Promise.all([makeUser(), makeUser(), makeUser()]);
    const results = await Promise.allSettled(
      users.map((u) => createCheckoutOrder({ userId: u.id, productId: ctx.product.id, couponCode: "ONE" })),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await redeemed("ONE")).toBe(1);
  });

  it("paying does not count the redemption twice", async () => {
    await mkCoupon({ maxRedemptions: 5 });
    const o = await createCheckoutOrder({ userId: ctx.buyer.id, productId: ctx.product.id, couponCode: "ONE" });
    await markOrderPaid({ providerOrderId: o.providerOrderId, paymentId: "p" });
    expect(await redeemed("ONE")).toBe(1);
  });

  it("a failed payment releases the redemption; a later retry re-reserves it", async () => {
    await mkCoupon();
    const other = await makeUser();
    const a = await createCheckoutOrder({ userId: ctx.buyer.id, productId: ctx.product.id, couponCode: "ONE" });
    await markOrderFailed({ providerOrderId: a.providerOrderId });
    expect(await redeemed("ONE")).toBe(0);
    const b = await createCheckoutOrder({ userId: other.id, productId: ctx.product.id, couponCode: "ONE" });
    expect(b.couponReserved).toBe(true);
    await markOrderPaid({ providerOrderId: a.providerOrderId, paymentId: "late" }); // gateway retry succeeded
    expect(await redeemed("ONE")).toBe(2); // honoured: money was taken
  });

  it("abandoned pending orders stop holding the coupon after 30 minutes", async () => {
    await mkCoupon();
    const other = await makeUser();
    const a = await createCheckoutOrder({ userId: ctx.buyer.id, productId: ctx.product.id, couponCode: "ONE" });
    await db.order.update({ where: { id: a.id }, data: { createdAt: new Date(Date.now() - 31 * 60 * 1000) } });
    const b = await createCheckoutOrder({ userId: other.id, productId: ctx.product.id, couponCode: "ONE" });
    expect(b.status).toBe("created");
    expect(await redeemed("ONE")).toBe(1);
    expect((await db.order.findUniqueOrThrow({ where: { id: a.id } })).couponReserved).toBe(false);
  });

  it("refund releases the redemption", async () => {
    await mkCoupon();
    const o = await createCheckoutOrder({ userId: ctx.buyer.id, productId: ctx.product.id, couponCode: "ONE" });
    await markOrderPaid({ providerOrderId: o.providerOrderId, paymentId: "p" });
    await refundOrder({ creatorId: ctx.creator.id, orderId: o.id });
    expect(await redeemed("ONE")).toBe(0);
  });

  it("surfaces inactive and exhausted coupons at order level", async () => {
    await db.coupon.create({ data: { creatorId: ctx.creator.id, code: "OFF", percentOff: 10, active: false } });
    await expect(
      createCheckoutOrder({ userId: ctx.buyer.id, productId: ctx.product.id, couponCode: "off" }),
    ).rejects.toMatchObject({ code: "coupon_inactive" });
  });
});

describe("duplicate open orders", () => {
  it("re-clicking checkout reuses the pending order (no second gateway order)", async () => {
    const a = await createCheckoutOrder({ userId: ctx.buyer.id, productId: ctx.product.id });
    const b = await createCheckoutOrder({ userId: ctx.buyer.id, productId: ctx.product.id });
    expect(b.id).toBe(a.id);
    expect(await db.order.count({ where: { userId: ctx.buyer.id, productId: ctx.product.id } })).toBe(1);
  });

  it("changing the coupon creates a new order and frees the old reservation", async () => {
    await mkCoupon({ maxRedemptions: 5 });
    const a = await createCheckoutOrder({ userId: ctx.buyer.id, productId: ctx.product.id, couponCode: "ONE" });
    const b = await createCheckoutOrder({ userId: ctx.buyer.id, productId: ctx.product.id });
    expect(b.id).not.toBe(a.id);
    expect(await redeemed("ONE")).toBe(0);
  });

  it("if two orders do get paid, refunding one keeps the buyer's access", async () => {
    const a = await createCheckoutOrder({ userId: ctx.buyer.id, productId: ctx.product.id });
    const b = await db.order.create({
      data: { userId: ctx.buyer.id, productId: ctx.product.id, creatorId: ctx.creator.id, subtotalPaise: a.subtotalPaise,
        totalPaise: a.totalPaise, gstPaise: a.gstPaise, gstRatePct: a.gstRatePct, provider: "mock", providerOrderId: "order_mock_dup" },
    });
    await markOrderPaid({ providerOrderId: a.providerOrderId, paymentId: "p1" });
    await markOrderPaid({ providerOrderId: b.providerOrderId, paymentId: "p2" });
    expect(await db.enrollment.count({ where: { userId: ctx.buyer.id, productId: ctx.product.id } })).toBe(1);
    await refundOrder({ creatorId: ctx.creator.id, orderId: a.id });
    const left = await db.enrollment.findMany({ where: { userId: ctx.buyer.id, productId: ctx.product.id } });
    expect(left).toHaveLength(1);
    expect(left[0].orderId).toBe(b.id);
  });
});

describe("payment amount check", () => {
  it("rejects a captured amount that differs from the order total", async () => {
    const o = await createCheckoutOrder({ userId: ctx.buyer.id, productId: ctx.product.id });
    await expect(
      markOrderPaid({ providerOrderId: o.providerOrderId, paymentId: "p", expectedAmountPaise: 100 }),
    ).rejects.toMatchObject({ code: "amount_mismatch" });
    expect((await db.order.findUniqueOrThrow({ where: { id: o.id } })).status).toBe("created");
    expect(await db.enrollment.count({ where: { orderId: o.id } })).toBe(0);
  });

  it("webhook with a wrong amount does not grant access", async () => {
    const o = await createCheckoutOrder({ userId: ctx.buyer.id, productId: ctx.product.id });
    const raw = JSON.stringify({ id: "evt_amt", event: "payment.captured",
      payload: { payment: { entity: { id: "pay_x", order_id: o.providerOrderId, amount: 1 } } } });
    expect(await handleWebhook(raw, hmacHex(mockSecret(), raw))).toEqual({ handled: false, reason: "amount_mismatch" });
    expect(await db.enrollment.count({ where: { orderId: o.id } })).toBe(0);
  });

  it("webhook with the right amount succeeds", async () => {
    const o = await createCheckoutOrder({ userId: ctx.buyer.id, productId: ctx.product.id });
    const raw = JSON.stringify({ id: "evt_amt2", event: "payment.captured",
      payload: { payment: { entity: { id: "pay_x", order_id: o.providerOrderId, amount: o.totalPaise } } } });
    expect(await handleWebhook(raw, hmacHex(mockSecret(), raw))).toEqual({ handled: true });
  });
});

describe("webhook edge cases", () => {
  const sign = (raw: string) => hmacHex(mockSecret(), raw);
  it("payment.failed after paid does not downgrade the order", async () => {
    const o = await createCheckoutOrder({ userId: ctx.buyer.id, productId: ctx.product.id });
    await markOrderPaid({ providerOrderId: o.providerOrderId, paymentId: "p" });
    const raw = JSON.stringify({ id: "evt_late_fail", event: "payment.failed",
      payload: { payment: { entity: { id: "p2", order_id: o.providerOrderId } } } });
    await handleWebhook(raw, sign(raw));
    expect((await db.order.findUniqueOrThrow({ where: { id: o.id } })).status).toBe("paid");
  });
  it("malformed JSON with a valid signature is rejected", async () => {
    await expect(handleWebhook("{not json", sign("{not json"))).rejects.toMatchObject({ code: "invalid_payload" });
  });
  it("unknown order is acknowledged, not retried forever", async () => {
    const raw = JSON.stringify({ id: "evt_unknown", event: "payment.captured",
      payload: { payment: { entity: { id: "p", order_id: "order_nope" } } } });
    expect(await handleWebhook(raw, sign(raw))).toEqual({ handled: false });
  });
  it("unhandled event types are acknowledged", async () => {
    const raw = JSON.stringify({ id: "evt_other", event: "refund.created", payload: {} });
    expect(await handleWebhook(raw, sign(raw))).toEqual({ handled: false });
  });
});

describe("other order rules", () => {
  it("rejects totals under ₹1 that aren't zero", async () => {
    await db.coupon.create({ data: { creatorId: ctx.creator.id, code: "ALMOST", flatOffPaise: 117950 } });
    await expect(
      createCheckoutOrder({ userId: ctx.buyer.id, productId: ctx.product.id, couponCode: "ALMOST" }),
    ).rejects.toMatchObject({ code: "below_minimum" });
    expect(await redeemed("ALMOST")).toBe(0); // nothing reserved on rejection
  });

  it("free orders write no ledger entry", async () => {
    await db.coupon.create({ data: { creatorId: ctx.creator.id, code: "FREE2", percentOff: 100 } });
    const o = await createCheckoutOrder({ userId: ctx.buyer.id, productId: ctx.product.id, couponCode: "FREE2" });
    expect(await db.ledgerEntry.count({ where: { orderId: o.id } })).toBe(0);
  });

  it("invoice numbers are consecutive per seller", async () => {
    const u2 = await makeUser();
    const p2 = await makeProduct(ctx.creator.id);
    const a = await markOrderPaid({ ...(await pay(ctx.buyer.id, ctx.product.id)) });
    const b = await markOrderPaid({ ...(await pay(u2.id, p2.id)) });
    const seq = (n: string | null) => Number(n!.split("/")[2]);
    expect(seq(b.invoiceNo)).toBe(seq(a.invoiceNo) + 1);

    const other = await makeCreator();
    const op = await makeProduct(other.creator.id);
    const c = await markOrderPaid({ ...(await pay(ctx.buyer.id, op.id)) });
    expect(seq(c.invoiceNo)).toBe(1); // separate series for a different seller
  });
});

async function pay(userId: string, productId: string) {
  const o = await createCheckoutOrder({ userId, productId });
  return { providerOrderId: o.providerOrderId, paymentId: "p" };
}

describe("pending-order reuse (review round 2)", () => {
  it("re-clicking checkout with a single-use coupon resumes the buyer's own order", async () => {
    await mkCoupon(); // maxRedemptions: 1
    const a = await createCheckoutOrder({ userId: ctx.buyer.id, productId: ctx.product.id, couponCode: "ONE" });
    const b = await createCheckoutOrder({ userId: ctx.buyer.id, productId: ctx.product.id, couponCode: "ONE" });
    expect(b.id).toBe(a.id);
    expect(await redeemed("ONE")).toBe(1);
  });

  it("two simultaneous checkouts by the same buyer create one order", async () => {
    const results = await Promise.all([
      createCheckoutOrder({ userId: ctx.buyer.id, productId: ctx.product.id }),
      createCheckoutOrder({ userId: ctx.buyer.id, productId: ctx.product.id }),
      createCheckoutOrder({ userId: ctx.buyer.id, productId: ctx.product.id }),
    ]);
    expect(new Set(results.map((r: { id: string }) => r.id)).size).toBe(1);
    expect(await db.order.count({ where: { userId: ctx.buyer.id, productId: ctx.product.id } })).toBe(1);
  });

  it("resuming an order whose coupon hold was released re-reserves it under the cap", async () => {
    await mkCoupon();
    await createCheckoutOrder({ userId: ctx.buyer.id, productId: ctx.product.id, couponCode: "ONE" });
    await createCheckoutOrder({ userId: ctx.buyer.id, productId: ctx.product.id }); // no coupon: supersedes + releases the first
    expect(await redeemed("ONE")).toBe(0);
    const again = await createCheckoutOrder({ userId: ctx.buyer.id, productId: ctx.product.id, couponCode: "ONE" });
    expect(again.couponReserved).toBe(true);
    expect(await redeemed("ONE")).toBe(1);
  });

  it("does not resume a released order if someone else has taken the last redemption", async () => {
    await mkCoupon();
    const other = await makeUser();
    await createCheckoutOrder({ userId: ctx.buyer.id, productId: ctx.product.id, couponCode: "ONE" });
    await createCheckoutOrder({ userId: ctx.buyer.id, productId: ctx.product.id }); // releases the hold
    await createCheckoutOrder({ userId: other.id, productId: ctx.product.id, couponCode: "ONE" }); // takes it
    await expect(
      createCheckoutOrder({ userId: ctx.buyer.id, productId: ctx.product.id, couponCode: "ONE" }),
    ).rejects.toMatchObject({ code: "coupon_exhausted" });
    expect(await redeemed("ONE")).toBe(1);
  });

  it("a stuck free order is completed on retry instead of sent to a gateway page", async () => {
    const c = await db.coupon.create({ data: { creatorId: ctx.creator.id, code: "FREE3", percentOff: 100, redeemed: 1 } });
    await db.order.create({
      data: { userId: ctx.buyer.id, productId: ctx.product.id, creatorId: ctx.creator.id, couponId: c.id, couponReserved: true,
        subtotalPaise: 118000, discountPaise: 118000, totalPaise: 0, gstPaise: 0, gstRatePct: 18, provider: "free", providerOrderId: "free_stuck" },
    });
    const o = await createCheckoutOrder({ userId: ctx.buyer.id, productId: ctx.product.id, couponCode: "FREE3" });
    expect(o.status).toBe("paid");
    expect(o.providerOrderId).toBe("free_stuck");
  });

  it("a paid order keeps its coupon hold even if old enough to look stale", async () => {
    await mkCoupon({ maxRedemptions: 2 });
    const other = await makeUser();
    const a = await createCheckoutOrder({ userId: ctx.buyer.id, productId: ctx.product.id, couponCode: "ONE" });
    await markOrderPaid({ providerOrderId: a.providerOrderId, paymentId: "p" });
    await db.order.update({ where: { id: a.id }, data: { createdAt: new Date(Date.now() - 3 * 3600 * 1000) } });
    await createCheckoutOrder({ userId: other.id, productId: ctx.product.id, couponCode: "ONE" });
    expect(await redeemed("ONE")).toBe(2);
    expect((await db.order.findUniqueOrThrow({ where: { id: a.id } })).couponReserved).toBe(true);
  });

  it("does not resume a released order once its coupon has expired", async () => {
    const c = await mkCoupon({ maxRedemptions: 5 });
    await createCheckoutOrder({ userId: ctx.buyer.id, productId: ctx.product.id, couponCode: "ONE" });
    await createCheckoutOrder({ userId: ctx.buyer.id, productId: ctx.product.id }); // releases the hold
    await db.coupon.update({ where: { id: c.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    await expect(
      createCheckoutOrder({ userId: ctx.buyer.id, productId: ctx.product.id, couponCode: "ONE" }),
    ).rejects.toMatchObject({ code: "coupon_expired" });
    expect(await redeemed("ONE")).toBe(0);
  });
});
