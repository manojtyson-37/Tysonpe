import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { createCheckoutOrder } from "@/lib/orders";
import { readCallbackFields } from "@/lib/payments/callback-fields";
import { responseHash } from "@/lib/payments/easebuzz";
import { POST as webhook } from "@/app/api/webhooks/easebuzz/route";
import { POST as returnRoute } from "./return/route";

const KEY = "testkey";
const SALT = "testsalt";
let n = 0;

async function newOrder() {
  n++;
  const cu = await db.user.create({ data: { email: `rt${n}-${Date.now()}@t.test`, name: "C", passwordHash: "x" } });
  const creator = await db.creator.create({ data: { userId: cu.id, handle: `rt${n}${Date.now()}`, displayName: "C" } });
  const product = await db.product.create({
    data: { creatorId: creator.id, slug: `rtp${n}${Date.now()}`, type: "course", title: "Course", pricePaise: 118000, gstRatePct: 18, status: "published" },
  });
  const buyer = await db.user.create({ data: { email: `rtb${n}-${Date.now()}@t.test`, name: "B", passwordHash: "x" } });
  return createCheckoutOrder({ userId: buyer.id, productId: product.id });
}
function fields(order: { providerOrderId: string }, over: Record<string, string> = {}) {
  const f: Record<string, string> = { key: KEY, txnid: order.providerOrderId, amount: "1180.00", productinfo: "Course", firstname: "B", email: "b@t.test", status: "success", easepayid: "E1", ...over };
  f.hash = responseHash(f, SALT);
  return f;
}
const form = (f: Record<string, string>) =>
  new Request("http://localhost/x", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(f) });
const json = (f: unknown) =>
  new Request("http://localhost/x", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(f) });

beforeEach(() => {
  vi.stubEnv("EASEBUZZ_KEY", KEY);
  vi.stubEnv("EASEBUZZ_SALT", SALT);
  vi.stubEnv("RAZORPAY_KEY_ID", "");
  vi.stubEnv("RAZORPAY_KEY_SECRET", "");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3100");
});
afterEach(() => vi.unstubAllEnvs());

describe("POST /api/easebuzz/return", () => {
  it("303s a verified success to the success page on the configured origin", async () => {
    const order = await newOrder();
    const res = await returnRoute(form(fields(order)));
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe(`http://localhost:3100/checkout/success/${order.id}`);
  });
  it("303s a failure back to the pay page", async () => {
    const order = await newOrder();
    const res = await returnRoute(form(fields(order, { status: "failure" })));
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe(`http://localhost:3100/checkout/pay/${order.id}?failed=1`);
  });
  it("400s a forged callback and pays nothing", async () => {
    const order = await newOrder();
    const res = await returnRoute(form({ ...fields(order), amount: "1.00" }));
    expect(res.status).toBe(400);
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("created");
  });
  it("400s a signed callback with a non-decimal amount (invalid_payload)", async () => {
    const order = await newOrder();
    expect((await returnRoute(form(fields(order, { amount: "1e3" })))).status).toBe(400);
  });
  it("303s userCancelled back to the pay page and a duplicate capture on a paid order to success", async () => {
    const order = await newOrder();
    const cancelled = await returnRoute(form(fields(order, { status: "userCancelled" })));
    expect(cancelled.headers.get("location")).toBe(`http://localhost:3100/checkout/pay/${order.id}?failed=1`);
    await returnRoute(form(fields(order, { easepayid: "E_A" })));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const dup = await returnRoute(form(fields(order, { easepayid: "E_B" })));
    expect(dup.status).toBe(303);
    expect(dup.headers.get("location")).toBe(`http://localhost:3100/checkout/success/${order.id}`);
  });
  it("404s an unknown order", async () => {
    expect((await returnRoute(form(fields({ providerOrderId: "eb_none" })))).status).toBe(404);
  });
  it("409s a signed amount mismatch with a support reference, not a refund promise", async () => {
    const order = await newOrder();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const res = await returnRoute(form(fields(order, { amount: "1.00" })));
    expect(res.status).toBe(409);
    const body = await res.text();
    expect(body).toContain(order.providerOrderId);
    expect(body).not.toMatch(/refund/i);
  });
  it("500s when NEXT_PUBLIC_APP_URL is unset instead of trusting the request origin", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    const order = await newOrder();
    expect((await returnRoute(form(fields(order)))).status).toBe(500);
  });
  it("503s when Easebuzz is not configured", async () => {
    const order = await newOrder();
    vi.stubEnv("EASEBUZZ_KEY", "");
    expect((await returnRoute(form(fields(order)))).status).toBe(503);
  });
});

describe("POST /api/webhooks/easebuzz", () => {
  it("accepts form-encoded and JSON bodies", async () => {
    const a = await newOrder();
    expect((await webhook(form(fields(a)))).status).toBe(200);
    const b = await newOrder();
    const res = await webhook(json(fields(b)));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ paid: true });
  });
  it("400 on bad signature, 404 unknown order, 200 (no retry storm) on amount mismatch", async () => {
    const order = await newOrder();
    expect((await webhook(form({ ...fields(order), status: "failure" }))).status).toBe(400);
    expect((await webhook(form(fields({ providerOrderId: "eb_none" })))).status).toBe(404);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const res = await webhook(form(fields(order, { amount: "1.00", easepayid: "E_RT_MM" })));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ paid: false, needsReview: true });
  });
  it("400 (no retry storm) on invalid_payload", async () => {
    const order = await newOrder();
    expect((await webhook(form(fields(order, { amount: "1e3" })))).status).toBe(400);
  });
  it("503 (retryable) when Easebuzz is not configured", async () => {
    const order = await newOrder();
    vi.stubEnv("EASEBUZZ_KEY", "");
    expect((await webhook(form(fields(order)))).status).toBe(503);
  });
});

describe("readCallbackFields", () => {
  it("keeps only string JSON values, so a numeric amount can never match the signed text", async () => {
    expect(await readCallbackFields(json({ a: "1", n: 5, o: { x: 1 } }))).toEqual({ a: "1" });
  });
  it("returns nothing for oversized or malformed bodies", async () => {
    expect(await readCallbackFields(form({ big: "x".repeat(70_000) }))).toEqual({});
    expect(await readCallbackFields(new Request("http://x", { method: "POST", headers: { "content-type": "application/json" }, body: "{nope" }))).toEqual({});
  });
});
