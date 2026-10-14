import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "./db";
import { createCheckoutOrder, handleEasebuzzCallback } from "./orders";
import { attemptTxnid, responseHash } from "./payments/easebuzz";

const KEY = "testkey";
const SALT = "testsalt";

let seq = 0;
async function makeUser(name = "U") {
  seq++;
  return db.user.create({ data: { email: `eb${seq}-${Date.now()}@t.test`, name, passwordHash: "x" } });
}

async function setup() {
  const cu = await makeUser("Creator");
  const creator = await db.creator.create({
    data: { userId: cu.id, handle: `eb${seq}${Date.now()}`, displayName: "C" },
  });
  seq++;
  const product = await db.product.create({
    data: { creatorId: creator.id, slug: `ebp${seq}`, type: "course", title: "Course", pricePaise: 118000, gstRatePct: 18, status: "published" },
  });
  const buyer = await makeUser("Buyer");
  const order = await createCheckoutOrder({ userId: buyer.id, productId: product.id });
  return { buyer, product, order };
}

/** What Easebuzz POSTs to surl/furl/webhook, signed with the real reverse sequence. */
function signed(order: { providerOrderId: string }, over: Record<string, string> = {}) {
  const f: Record<string, string> = {
    key: KEY,
    txnid: order.providerOrderId,
    amount: "1180.00",
    productinfo: "Course",
    firstname: "Buyer",
    email: "b@t.test",
    status: "success",
    easepayid: "E2610140001",
    ...over,
  };
  f.hash = responseHash(f, SALT);
  return f;
}

beforeEach(() => {
  vi.stubEnv("EASEBUZZ_KEY", KEY);
  vi.stubEnv("EASEBUZZ_SALT", SALT);
  vi.stubEnv("RAZORPAY_KEY_ID", "");
  vi.stubEnv("RAZORPAY_KEY_SECRET", "");
});
afterEach(() => vi.unstubAllEnvs());

describe("handleEasebuzzCallback", () => {
  it("creates an easebuzz order whose txnid is the providerOrderId", async () => {
    const { order } = await setup();
    expect(order.provider).toBe("easebuzz");
    expect(order.providerOrderId).toMatch(/^eb_/);
    expect(order.status).toBe("created");
  });

  it("a verified success marks the order paid, enrols the buyer and books the ledger once", async () => {
    const { order, buyer, product } = await setup();
    const r = await handleEasebuzzCallback(signed(order));
    expect(r).toEqual({ orderId: order.id, paid: true, needsReview: false });

    const paid = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(paid.status).toBe("paid");
    expect(paid.providerPaymentId).toBe("E2610140001");
    expect(paid.invoiceNo).toBeTruthy();
    expect(await db.enrollment.count({ where: { userId: buyer.id, productId: product.id } })).toBe(1);
    expect(await db.ledgerEntry.count({ where: { orderId: order.id } })).toBe(1);
  });

  it("is idempotent: replaying the callback (return + webhook) changes nothing", async () => {
    const { order } = await setup();
    await handleEasebuzzCallback(signed(order));
    const again = await handleEasebuzzCallback(signed(order));
    expect(again.paid).toBe(true);
    expect(await db.enrollment.count({ where: { orderId: order.id } })).toBe(1);
    expect(await db.ledgerEntry.count({ where: { orderId: order.id } })).toBe(1);
  });

  it("rejects a callback whose hash does not verify, leaving the order unpaid", async () => {
    const { order } = await setup();
    const forged = { ...signed(order), amount: "1.00" };
    await expect(handleEasebuzzCallback(forged)).rejects.toMatchObject({ code: "bad_signature" });
    const forgedStatus = { ...signed(order, { status: "failure" }), status: "success" };
    await expect(handleEasebuzzCallback(forgedStatus)).rejects.toMatchObject({ code: "bad_signature" });
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("created");
  });

  it("rejects a callback signed for a different merchant key", async () => {
    const { order } = await setup();
    await expect(handleEasebuzzCallback(signed(order, { key: "otherkey" }))).rejects.toMatchObject({ code: "bad_signature" });
  });

  it("a validly signed success for the wrong amount leaves the order unpaid and is flagged for review", async () => {
    const { order } = await setup();
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const r = await handleEasebuzzCallback(signed(order, { amount: "1.00", easepayid: "E_MISMATCH" }));
    expect(r).toEqual({ orderId: order.id, paid: false, needsReview: true });
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("E_MISMATCH"));
    spy.mockRestore();
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("created");
    expect(await db.enrollment.count({ where: { orderId: order.id } })).toBe(0);
    expect(await db.webhookEvent.count({ where: { id: `easebuzz_amount_mismatch_${order.providerOrderId}` } })).toBe(1);
    // replaying the same mismatch must not throw on the unique event id
    await expect(handleEasebuzzCallback(signed(order, { amount: "1.00", easepayid: "E_MISMATCH" }))).resolves.toMatchObject({ needsReview: true });
  });

  it.each([["1e3"], ["0x10"], [""], ["-5.00"], ["12.345"]])("rejects a non-decimal signed amount %j as invalid_payload", async (amount) => {
    const { order } = await setup();
    await expect(handleEasebuzzCallback(signed(order, { amount }))).rejects.toMatchObject({ code: "invalid_payload" });
  });

  it("a success without easepayid is invalid (refunds need the real payment id)", async () => {
    const { order } = await setup();
    await expect(handleEasebuzzCallback(signed(order, { easepayid: "" }))).rejects.toMatchObject({ code: "invalid_payload" });
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("created");
  });

  it("per-attempt txnids (<orderId>-xyz) resolve to the same order, and the unsuffixed form still works", async () => {
    const { order } = await setup();
    const attempt = attemptTxnid(order.providerOrderId);
    expect(attempt).toMatch(/^eb_[0-9a-f]{32}-[0-9a-f]{4}$/);
    expect(attempt.length).toBeLessThanOrEqual(40);
    expect(attempt).not.toBe(attemptTxnid(order.providerOrderId) + "x");
    expect(await handleEasebuzzCallback(signed(order, { txnid: attempt }))).toMatchObject({ orderId: order.id, paid: true });
  });

  it("a second capture by a different attempt on an already-paid order is flagged, not silently absorbed", async () => {
    const { order } = await setup();
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await handleEasebuzzCallback(signed(order, { easepayid: "E_FIRST" }));
    const r = await handleEasebuzzCallback(signed(order, { txnid: attemptTxnid(order.providerOrderId), easepayid: "E_SECOND" }));
    spy.mockRestore();
    expect(r).toMatchObject({ paid: true, needsReview: true });
    expect(await db.webhookEvent.count({ where: { id: `easebuzz_duplicate_capture_${order.providerOrderId}_E_SECOND` } })).toBe(1);
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).providerPaymentId).toBe("E_FIRST");
    expect(await db.enrollment.count({ where: { orderId: order.id } })).toBe(1);
  });

  it("an easepayid with odd characters is invalid_payload (it is not covered by the hash)", async () => {
    const { order } = await setup();
    await expect(handleEasebuzzCallback(signed(order, { easepayid: "E1; DROP" }))).rejects.toMatchObject({ code: "invalid_payload" });
  });

  it("the browser return path cannot raise duplicate-capture flags from its unsigned easepayid", async () => {
    const { order } = await setup();
    await handleEasebuzzCallback(signed(order, { easepayid: "E_REAL" }));
    const r = await handleEasebuzzCallback(signed(order, { easepayid: "E_FORGED" }), "return");
    expect(r).toMatchObject({ paid: true, needsReview: false });
    expect(await db.webhookEvent.count({ where: { id: { startsWith: "easebuzz_duplicate_capture_" }, AND: { id: { contains: order.providerOrderId } } } })).toBe(0);
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).providerPaymentId).toBe("E_REAL");
  });

  it("concurrent callbacks (return + webhook racing) enrol once and book one ledger entry and one invoice", async () => {
    const { order } = await setup();
    await Promise.all([handleEasebuzzCallback(signed(order)), handleEasebuzzCallback(signed(order)), handleEasebuzzCallback(signed(order))]);
    expect(await db.enrollment.count({ where: { orderId: order.id } })).toBe(1);
    expect(await db.ledgerEntry.count({ where: { orderId: order.id } })).toBe(1);
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).invoiceNo).toBeTruthy();
  });

  it("a replay after a refund never re-pays or re-enrols", async () => {
    const { order, product } = await setup();
    await handleEasebuzzCallback(signed(order));
    await db.order.update({ where: { id: order.id }, data: { status: "refunded", refundedAt: new Date() } });
    await db.enrollment.deleteMany({ where: { orderId: order.id } });
    const r = await handleEasebuzzCallback(signed(order));
    expect(r.paid).toBe(false);
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("refunded");
    expect(await db.enrollment.count({ where: { productId: product.id } })).toBe(0);
  });

  it("a signed callback naming a non-Easebuzz order is not_found", async () => {
    const { order } = await setup();
    await db.order.update({ where: { id: order.id }, data: { provider: "mock" } });
    await expect(handleEasebuzzCallback(signed(order))).rejects.toMatchObject({ code: "not_found" });
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("created");
  });

  it("verifies end-to-end when the gateway adds additional_charges", async () => {
    const { order } = await setup();
    const f = signed(order, { additional_charges: "5.00" }); // signed() hashes with the prefix included
    expect(await handleEasebuzzCallback(f)).toMatchObject({ paid: true });
  });

  it("failure and cancel mark a pending order failed; a later success still pays it (retry)", async () => {
    const { order } = await setup();
    expect(await handleEasebuzzCallback(signed(order, { status: "userCancelled" }))).toMatchObject({ orderId: order.id, paid: false });
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("failed");
    expect((await handleEasebuzzCallback(signed(order))).paid).toBe(true);
  });

  it("a late failure never downgrades a paid order", async () => {
    const { order } = await setup();
    await handleEasebuzzCallback(signed(order));
    const r = await handleEasebuzzCallback(signed(order, { status: "failure" }));
    expect(r.paid).toBe(true);
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("paid");
  });

  it("a still-pending gateway status leaves the order alone", async () => {
    const { order } = await setup();
    const r = await handleEasebuzzCallback(signed(order, { status: "pending" }));
    expect(r.paid).toBe(false);
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("created");
  });

  it("unknown transaction ids are not_found", async () => {
    await expect(handleEasebuzzCallback(signed({ providerOrderId: "eb_nope" }))).rejects.toMatchObject({ code: "not_found" });
  });

  it("refuses (provider_mismatch) when Easebuzz keys are not configured", async () => {
    const { order } = await setup();
    vi.stubEnv("EASEBUZZ_KEY", "");
    await expect(handleEasebuzzCallback(signed(order))).rejects.toMatchObject({ code: "provider_mismatch" });
  });

  it("still verifies callbacks when another gateway is the active default", async () => {
    const { order } = await setup();
    vi.stubEnv("RAZORPAY_KEY_ID", "rzp_test_x");
    vi.stubEnv("RAZORPAY_KEY_SECRET", "s"); // Razorpay now wins getProvider(); the callback must not care
    expect(await handleEasebuzzCallback(signed(order))).toMatchObject({ paid: true });
  });
});
