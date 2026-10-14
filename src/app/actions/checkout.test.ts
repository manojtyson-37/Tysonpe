import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { createCheckoutOrder } from "@/lib/orders";
import { resetDemoEnrollmentAction, settleDemoAction, settleEasebuzzDemoAction, startEasebuzzPayment } from "./checkout";

const session = vi.hoisted(() => ({ user: null as { id: string; name: string; email: string } | null }));
vi.mock("@/lib/auth/session", () => ({ requireUser: async () => session.user }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT:${to}`);
  },
}));

let n = 0;
async function setup() {
  n++;
  const cu = await db.user.create({ data: { email: `ck${n}-${Date.now()}@t.test`, name: "C", passwordHash: "x" } });
  const creator = await db.creator.create({ data: { userId: cu.id, handle: `ck${n}${Date.now()}`, displayName: "C" } });
  const product = await db.product.create({
    data: { creatorId: creator.id, slug: `ckp${n}${Date.now()}`, type: "course", title: "Intro: Wealth & Tax (2026)", pricePaise: 118000, gstRatePct: 18, status: "published" },
  });
  const buyer = await db.user.create({ data: { email: `ckb${n}-${Date.now()}@t.test`, name: "Ravi Kumar", passwordHash: "x" } });
  session.user = { id: buyer.id, name: buyer.name, email: buyer.email };
  const order = await createCheckoutOrder({ userId: buyer.id, productId: product.id });
  return { buyer, product, order };
}
const fd = (phone: string) => {
  const f = new FormData();
  f.set("phone", phone);
  return f;
};
const run = (orderId: string, phone = "9999999999") =>
  startEasebuzzPayment(orderId, undefined, fd(phone)).then(
    (r) => ({ result: r, redirect: null as string | null }),
    (e: Error) => ({ result: null, redirect: e.message.startsWith("REDIRECT:") ? e.message.slice(9) : (() => { throw e; })() }),
  );

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.stubEnv("EASEBUZZ_KEY", "testkey");
  vi.stubEnv("EASEBUZZ_SALT", "testsalt");
  vi.stubEnv("RAZORPAY_KEY_ID", "");
  vi.stubEnv("RAZORPAY_KEY_SECRET", "");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3100");
  fetchMock = vi.fn(async () => Response.json({ status: 1, data: "ACCESS123" }));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("startEasebuzzPayment", () => {
  it("sends a fresh order to the hosted page with a signed, per-attempt txnid and our return URLs", async () => {
    const { order } = await setup();
    const r = await run(order.id);
    expect(r.redirect).toBe("https://testpay.easebuzz.in/pay/ACCESS123");
    const sent = new URLSearchParams(String((fetchMock.mock.calls[0][1] as RequestInit).body));
    expect(sent.get("txnid")).toMatch(new RegExp(`^${order.providerOrderId}-[0-9a-f]{4}$`));
    expect(sent.get("amount")).toBe("1180.00");
    expect(sent.get("surl")).toBe("http://localhost:3100/api/easebuzz/return");
    expect(sent.get("furl")).toBe("http://localhost:3100/api/easebuzz/return");
    expect(sent.get("firstname")).toBe("Ravi");
    expect(sent.get("productinfo")).toBe("Intro Wealth & Tax (2026)"); // ':' stripped, sent text == hashed text
    expect(sent.has("salt")).toBe(false);
  });

  it("a retry on the same order uses a different txnid (Easebuzz rejects reuse)", async () => {
    const { order } = await setup();
    await run(order.id);
    await run(order.id);
    const ids = fetchMock.mock.calls.map((c) => new URLSearchParams(String((c[1] as RequestInit).body)).get("txnid"));
    expect(ids[0]).not.toBe(ids[1]);
  });

  it("refuses a stale order and restarts from checkout without touching the gateway", async () => {
    const { order, product } = await setup();
    await db.order.update({ where: { id: order.id }, data: { createdAt: new Date(Date.now() - 31 * 60 * 1000) } });
    expect((await run(order.id)).redirect).toBe(`/checkout/${product.id}`);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("an order just inside the 30-minute window is still payable", async () => {
    const { order } = await setup();
    await db.order.update({ where: { id: order.id }, data: { createdAt: new Date(Date.now() - 29 * 60 * 1000) } });
    expect((await run(order.id)).redirect).toMatch(/testpay\.easebuzz\.in\/pay\//);
  });

  it("never sends an already-enrolled buyer to pay again", async () => {
    const { order, buyer, product } = await setup();
    const other = await db.order.create({
      data: { userId: buyer.id, productId: product.id, creatorId: order.creatorId, subtotalPaise: 1, totalPaise: 1, gstPaise: 0, gstRatePct: 0, provider: "free", providerOrderId: `free_${Date.now()}${n}`, status: "paid" },
    });
    await db.enrollment.create({ data: { userId: buyer.id, productId: product.id, orderId: other.id } });
    expect((await run(order.id)).redirect).toBe(`/library/${product.id}`);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("a failed order whose coupon hold was released must restart from checkout", async () => {
    const { order, product } = await setup();
    const coupon = await db.coupon.create({ data: { creatorId: order.creatorId, code: `CK${n}${Date.now()}`, percentOff: 10, active: true } });
    await db.order.update({ where: { id: order.id }, data: { status: "failed", couponId: coupon.id, couponReserved: false } });
    expect((await run(order.id)).redirect).toBe(`/checkout/${product.id}`);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("redirects paid orders to success and other users' orders to the library", async () => {
    const { order } = await setup();
    await db.order.update({ where: { id: order.id }, data: { status: "paid" } });
    expect((await run(order.id)).redirect).toBe(`/checkout/success/${order.id}`);
    session.user = { id: "someone-else", name: "X", email: "x@t.test" };
    expect((await run(order.id)).redirect).toBe("/library");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a bad phone number before any network call, and normalises +91 / spaces / dashes", async () => {
    const { order } = await setup();
    for (const bad of ["12345", "abcdefghij", "", "99999999999999"]) {
      const r = await run(order.id, bad);
      expect(r.result?.error).toMatch(/10-digit/);
    }
    expect(fetchMock).not.toHaveBeenCalled();
    await run(order.id, "+91 99999-88888");
    expect(new URLSearchParams(String((fetchMock.mock.calls[0][1] as RequestInit).body)).get("phone")).toBe("9999988888");
  });

  it("returns a friendly error (and logs) when the gateway rejects the request", async () => {
    const { order } = await setup();
    fetchMock.mockResolvedValueOnce(Response.json({ status: 0, data: "Duplicate transaction id" }));
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const r = await run(order.id);
    expect(r.result?.error).toMatch(/couldn't reach the payment gateway/);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("refuses an order that belongs to a different provider", async () => {
    const { order } = await setup();
    await db.order.update({ where: { id: order.id }, data: { provider: "mock" } });
    expect((await run(order.id)).redirect).toBe("/library");
  });
});

describe("settleDemoAction and settleEasebuzzDemoAction", () => {
  beforeEach(() => {
    vi.stubEnv("PAYMENTS_MODE", "demo");
  });

  it("settleDemoAction success pays the order and enrols the buyer", async () => {
    const { order, buyer, product } = await setup();
    await db.order.update({ where: { id: order.id }, data: { provider: "mock" } });
    const res = await settleDemoAction(order.id, "success");
    expect(res).toEqual({ ok: true, to: `/checkout/success/${order.id}` });
    const updated = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(updated.status).toBe("paid");
    expect(await db.enrollment.count({ where: { userId: buyer.id, productId: product.id } })).toBe(1);
  });

  it("settleDemoAction failure marks the order failed without enrolling", async () => {
    const { order, buyer, product } = await setup();
    await db.order.update({ where: { id: order.id }, data: { provider: "mock" } });
    const res = await settleDemoAction(order.id, "failure");
    expect(res).toEqual({ ok: true, to: `/checkout/pay/${order.id}?failed=1` });
    const updated = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(updated.status).toBe("failed");
    expect(await db.enrollment.count({ where: { userId: buyer.id, productId: product.id } })).toBe(0);
  });

  it("settleEasebuzzDemoAction triggers 303 redirect to success on success", async () => {
    const { order } = await setup();
    await db.order.update({ where: { id: order.id }, data: { provider: "mock" } });
    await expect(settleEasebuzzDemoAction(order.id, "success")).rejects.toThrow(`REDIRECT:/checkout/success/${order.id}`);
  });

  it("settleEasebuzzDemoAction triggers 303 redirect to pay with failed=1 on cancel", async () => {
    const { order } = await setup();
    await db.order.update({ where: { id: order.id }, data: { provider: "mock" } });
    await expect(settleEasebuzzDemoAction(order.id, "cancel")).rejects.toThrow(`REDIRECT:/checkout/pay/${order.id}?failed=1`);
  });

  it("resetDemoEnrollmentAction removes enrollment so the user can re-test", async () => {
    const { order, buyer, product } = await setup();
    await db.order.update({ where: { id: order.id }, data: { provider: "mock" } });
    await settleDemoAction(order.id, "success");
    expect(await db.enrollment.count({ where: { userId: buyer.id, productId: product.id } })).toBe(1);
    await expect(resetDemoEnrollmentAction(product.id)).rejects.toThrow("REDIRECT:/demo");
    expect(await db.enrollment.count({ where: { userId: buyer.id, productId: product.id } })).toBe(0);
  });
});
