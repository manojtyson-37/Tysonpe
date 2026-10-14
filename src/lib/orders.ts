import { createHash, randomUUID } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "./db";
import { fiscalYear, formatInvoiceNo } from "./invoice";
import { feeBreakdown, priceOrder } from "./money";
import { getProvider } from "./payments";

type Tx = Prisma.TransactionClient;

export class AppError extends Error {
  constructor(
    public code: string,
    message?: string,
  ) {
    super(message ?? code);
  }
}

const MIN_CHARGE_PAISE = 100; // gateway minimum: ₹1
/** A pending order holds its coupon redemption (and is reused on re-checkout) for this long. */
const PENDING_HOLD_MS = 30 * 60 * 1000;

const couponMessage: Record<string, string> = {
  inactive: "This coupon is no longer active.",
  expired: "This coupon has expired.",
  exhausted: "This coupon has been fully redeemed.",
  invalid: "This coupon is not valid.",
};

/* ---------- coupon reservation ---------- */

/**
 * Give back an order's coupon redemption. The couponReserved gate makes repeats harmless.
 * `onlyStatus` closes the read-then-release race: a pending-order sweep must not release an order
 * that was paid in the meantime (refunds call this without the filter).
 */
async function releaseReservation(tx: Tx, orderId: string, onlyStatus?: string) {
  const gate = await tx.order.updateMany({
    where: { id: orderId, couponReserved: true, ...(onlyStatus ? { status: onlyStatus } : {}) },
    data: { couponReserved: false },
  });
  if (gate.count === 0) return;
  const o = await tx.order.findUniqueOrThrow({ where: { id: orderId }, select: { couponId: true } });
  if (o.couponId) await tx.coupon.update({ where: { id: o.couponId }, data: { redeemed: { decrement: 1 } } });
}

/** Atomically take one redemption. The cap is enforced by the database, not by an earlier read. */
async function reserveRedemption(tx: Tx, coupon: { id: string; maxRedemptions: number | null }) {
  const r = await tx.coupon.updateMany({
    where: {
      id: coupon.id,
      active: true,
      ...(coupon.maxRedemptions === null ? {} : { redeemed: { lt: coupon.maxRedemptions } }),
    },
    data: { redeemed: { increment: 1 } },
  });
  return r.count === 1;
}

/** Pending orders older than the hold window stop counting against a coupon's cap. */
async function releaseStale(couponId: string) {
  const stale = await db.order.findMany({
    where: {
      couponId,
      couponReserved: true,
      status: "created",
      createdAt: { lt: new Date(Date.now() - PENDING_HOLD_MS) },
    },
    select: { id: true },
  });
  for (const o of stale) await db.$transaction((tx) => releaseReservation(tx, o.id, "created"));
}

/* ---------- checkout ---------- */

type OrderRow = Prisma.OrderGetPayload<object>;

/** Can this unpaid order stand in for the checkout the buyer is asking for right now? */
function isResumable(
  o: OrderRow,
  product: { pricePaise: number; gstRatePct: number },
  couponId: string | null,
  providerName: () => string,
) {
  return (
    o.createdAt.getTime() > Date.now() - PENDING_HOLD_MS &&
    o.subtotalPaise === product.pricePaise &&
    o.gstRatePct === product.gstRatePct &&
    o.couponId === couponId &&
    (o.provider === "free" || o.provider === providerName())
  );
}

export async function createCheckoutOrder(input: {
  userId: string;
  productId: string;
  couponCode?: string | null;
}) {
  const product = await db.product.findFirst({
    where: { id: input.productId, status: "published" },
    include: { creator: true },
  });
  if (!product) throw new AppError("not_found", "Product not found.");
  if (product.creator.userId === input.userId)
    throw new AppError("own_product", "You can't buy your own product.");

  const enrolled = await db.enrollment.findUnique({
    where: { userId_productId: { userId: input.userId, productId: product.id } },
  });
  if (enrolled) throw new AppError("already_enrolled", "You already own this product.");

  let coupon = null;
  const code = input.couponCode?.trim().toUpperCase();
  if (code) {
    coupon = await db.coupon.findUnique({
      where: { creatorId_code: { creatorId: product.creatorId, code } },
    });
    if (!coupon) throw new AppError("coupon_not_found", "Coupon code not found.");
    await releaseStale(coupon.id);
    coupon = await db.coupon.findUniqueOrThrow({ where: { id: coupon.id } });
  }
  const couponId = coupon?.id ?? null;

  // Resume the buyer's own unpaid order BEFORE pricing: pricing would reject a single-use coupon
  // whose last redemption is held by this very order.
  const resumable = (await db.order.findMany({
    where: { userId: input.userId, productId: product.id, status: "created" },
    orderBy: { createdAt: "desc" },
  })).find((o) => isResumable(o, product, couponId, () => getProvider().name));
  if (resumable) {
    const resumed = await resumeOrder(resumable, coupon);
    if (resumed) return resumed;
  }

  const priced = priceOrder(product, coupon, new Date());
  if (!priced.ok) throw new AppError(`coupon_${priced.reason}`, couponMessage[priced.reason]);
  if (priced.totalPaise > 0 && priced.totalPaise < MIN_CHARGE_PAISE)
    throw new AppError("below_minimum", "Order total must be at least ₹1.");

  const provider = priced.totalPaise > 0 ? getProvider() : null;
  const gateway = provider
    ? await provider.createOrder({ amountPaise: priced.totalPaise, receipt: `tp_${Date.now()}` })
    : null;

  const order = await db.$transaction(async (tx) => {
    // Re-check inside the transaction: a concurrent request (second tab) may have just created it.
    const pending = await tx.order.findMany({
      where: { userId: input.userId, productId: product.id, status: "created" },
      orderBy: { createdAt: "desc" },
    });
    const dup = pending.find(
      (o) => isResumable(o, product, couponId, () => getProvider().name) && (!o.couponId || o.couponReserved),
    );
    if (dup) return dup; // (an orphaned gateway order from a lost race is harmless: never paid or linked)

    // Other pending attempts for this purchase no longer hold a redemption.
    for (const o of pending) await releaseReservation(tx, o.id, "created");

    if (coupon && !(await reserveRedemption(tx, coupon)))
      throw new AppError("coupon_exhausted", couponMessage.exhausted);

    const created = await tx.order.create({
      data: {
        userId: input.userId,
        productId: product.id,
        creatorId: product.creatorId,
        couponId,
        couponReserved: !!coupon,
        subtotalPaise: priced.subtotalPaise,
        discountPaise: priced.discountPaise,
        totalPaise: priced.totalPaise,
        gstPaise: priced.gstPaise,
        gstRatePct: product.gstRatePct,
        provider: provider?.name ?? "free",
        providerOrderId: gateway?.providerOrderId ?? `free_${randomUUID()}`,
      },
    });
    return created;
  });

  if (order.provider === "free") return markOrderPaid({ providerOrderId: order.providerOrderId, paymentId: "free" });
  return order;
}

class ResumeRace extends Error {}

/** Continue an unpaid order. Returns null when it can't be resumed safely (caller creates a fresh one). */
async function resumeOrder(
  order: OrderRow,
  coupon: { id: string; maxRedemptions: number | null; expiresAt: Date | null } | null,
) {
  if (order.couponId && !order.couponReserved) {
    // Its hold was released earlier; take it again under the cap, or let normal pricing decide.
    if (!coupon || (coupon.expiresAt && coupon.expiresAt.getTime() <= Date.now())) return null;
    try {
      const ok = await db.$transaction(async (tx) => {
        if (!(await reserveRedemption(tx, coupon))) return false;
        // Only flip the flag if nobody (e.g. a concurrent payment) already did; otherwise roll the +1 back.
        const g = await tx.order.updateMany({
          where: { id: order.id, status: "created", couponReserved: false },
          data: { couponReserved: true },
        });
        if (g.count === 0) throw new ResumeRace();
        return true;
      });
      if (!ok) return null;
    } catch (e) {
      if (!(e instanceof ResumeRace)) throw e;
      return db.order.findUniqueOrThrow({ where: { id: order.id } }); // state moved on; report it as it is
    }
  }
  if (order.provider === "free") return markOrderPaid({ providerOrderId: order.providerOrderId, paymentId: "free" });
  return db.order.findUniqueOrThrow({ where: { id: order.id } });
}

/** Idempotent and race-safe: only the caller that wins the status gate performs side effects. */
export async function markOrderPaid(input: {
  providerOrderId: string;
  paymentId: string;
  /** Amount the gateway says it captured (webhooks). Must equal the order total when given. */
  expectedAmountPaise?: number;
}) {
  return db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { providerOrderId: input.providerOrderId },
      include: { creator: true },
    });
    if (!order) throw new AppError("not_found", "Order not found.");
    if (order.status === "paid" || order.status === "refunded") return order;
    if (input.expectedAmountPaise !== undefined && input.expectedAmountPaise !== order.totalPaise)
      throw new AppError("amount_mismatch", "Captured amount does not match the order.");

    const paidAt = new Date();
    const gate = await tx.order.updateMany({
      where: { id: order.id, status: { in: ["created", "failed"] } },
      data: { status: "paid", paidAt, providerPaymentId: input.paymentId },
    });
    if (gate.count === 0) return tx.order.findUniqueOrThrow({ where: { id: order.id } });

    // Consecutive per-seller invoice number for the fiscal year (IST), allocated only by the gate winner.
    const fy = fiscalYear(paidAt);
    const counter = await tx.invoiceCounter.upsert({
      where: { key: `${order.creatorId}:${fy}` },
      create: { key: `${order.creatorId}:${fy}`, seq: 1 },
      update: { seq: { increment: 1 } },
    });
    await tx.order.update({ where: { id: order.id }, data: { invoiceNo: formatInvoiceNo(fy, counter.seq) } });

    const existing = await tx.enrollment.findUnique({
      where: { userId_productId: { userId: order.userId, productId: order.productId } },
    });
    if (!existing) {
      await tx.enrollment.create({
        data: { userId: order.userId, productId: order.productId, orderId: order.id },
      });
    }

    if (order.totalPaise > 0) {
      await tx.ledgerEntry.create({
        data: {
          creatorId: order.creatorId,
          orderId: order.id,
          grossPaise: order.totalPaise,
          ...feeBreakdown(order.totalPaise, order.creator.planKey),
        },
      });
    }
    // Normally reserved at creation. A late payment on an order whose hold was released re-takes it
    // (the money is already captured, so the redemption is honoured even if that exceeds the cap).
    if (order.couponId && !order.couponReserved) {
      await tx.coupon.update({ where: { id: order.couponId }, data: { redeemed: { increment: 1 } } });
      await tx.order.update({ where: { id: order.id }, data: { couponReserved: true } });
    }
    return tx.order.findUniqueOrThrow({ where: { id: order.id } });
  });
}

/** Gateway reported failure. Only a still-pending order is affected; a paid order is never downgraded. */
export async function markOrderFailed(input: { providerOrderId: string }) {
  return db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { providerOrderId: input.providerOrderId } });
    if (!order) throw new AppError("not_found", "Order not found.");
    const gate = await tx.order.updateMany({
      where: { id: order.id, status: "created" },
      data: { status: "failed" },
    });
    if (gate.count === 1) await releaseReservation(tx, order.id);
    return tx.order.findUniqueOrThrow({ where: { id: order.id } });
  });
}

/** Browser callback after checkout: trust nothing until the gateway signature verifies. */
export async function confirmPayment(input: {
  userId: string;
  providerOrderId: string;
  paymentId: string;
  signature: string;
}) {
  const order = await db.order.findUnique({ where: { providerOrderId: input.providerOrderId } });
  if (!order || order.userId !== input.userId) throw new AppError("not_found", "Order not found.");

  const provider = getProvider();
  if (order.provider !== provider.name) throw new AppError("provider_mismatch");
  if (!provider.verifyPayment(order.providerOrderId, input.paymentId, input.signature))
    throw new AppError("bad_signature", "Payment could not be verified.");

  return markOrderPaid({ providerOrderId: order.providerOrderId, paymentId: input.paymentId });
}

/* ---------- webhooks ---------- */

type WebhookBody = {
  id?: string;
  event?: string;
  payload?: {
    payment?: { entity?: { id?: string; order_id?: string; amount?: number } };
    order?: { entity?: { id?: string } };
  };
};

export async function handleWebhook(rawBody: string, signature: string | null, eventId?: string | null) {
  const provider = getProvider();
  if (!provider.verifyWebhook(rawBody, signature)) throw new AppError("bad_signature");

  let body: WebhookBody;
  try {
    body = JSON.parse(rawBody);
  } catch {
    throw new AppError("invalid_payload");
  }

  const id = eventId ?? body.id ?? createHash("sha256").update(rawBody).digest("hex");
  if (await db.webhookEvent.findUnique({ where: { id } })) return { handled: false, duplicate: true };

  const payment = body.payload?.payment?.entity;
  const providerOrderId = payment?.order_id ?? body.payload?.order?.entity?.id;
  let result: { handled: boolean; reason?: string } = { handled: false };

  if (providerOrderId && payment?.id) {
    try {
      if (body.event === "payment.captured" || body.event === "order.paid") {
        await markOrderPaid({
          providerOrderId,
          paymentId: payment.id,
          expectedAmountPaise: typeof payment.amount === "number" ? payment.amount : undefined,
        });
        result = { handled: true };
      } else if (body.event === "payment.failed") {
        await markOrderFailed({ providerOrderId });
        result = { handled: true };
      }
    } catch (e) {
      if (e instanceof AppError && e.code === "amount_mismatch") {
        console.error(`webhook ${id}: captured amount mismatch for ${providerOrderId}; order left unpaid`);
        result = { handled: false, reason: "amount_mismatch" };
      } else if (!(e instanceof AppError && e.code === "not_found")) {
        throw e; // unknown order: ack, don't retry forever
      }
    }
  }

  await db.webhookEvent
    .create({ data: { id, type: body.event ?? "unknown" } })
    .catch(() => undefined); // concurrent duplicate; processing above is idempotent
  return result;
}

/* ---------- refunds ---------- */

export async function refundOrder(input: { creatorId: string; orderId: string }) {
  const order = await db.order.findFirst({
    where: { id: input.orderId, creatorId: input.creatorId },
  });
  if (!order) throw new AppError("not_found", "Order not found.");
  if (order.status !== "paid") throw new AppError("invalid_state", "Only paid orders can be refunded.");

  return db.$transaction(async (tx) => {
    const gate = await tx.order.updateMany({
      where: { id: order.id, status: "paid" },
      data: { status: "refunded", refundedAt: new Date() },
    });
    if (gate.count === 0) throw new AppError("invalid_state", "Only paid orders can be refunded.");

    await tx.enrollment.deleteMany({ where: { orderId: order.id } });
    await releaseReservation(tx, order.id);

    // The buyer may hold another paid order for the same product (e.g. a duplicate payment): keep their access.
    const other = await tx.order.findFirst({
      where: { userId: order.userId, productId: order.productId, status: "paid", NOT: { id: order.id } },
      orderBy: { paidAt: "asc" },
    });
    if (other) {
      await tx.enrollment.create({ data: { userId: other.userId, productId: other.productId, orderId: other.id } });
    }
    return tx.order.findUniqueOrThrow({ where: { id: order.id } });
  });
}
