import { db } from "@/lib/db";
import { fiscalYear, formatInvoiceNo } from "@/lib/invoice";
import { feeBreakdown } from "@/lib/money";
import { dispatchCreatorWebhook } from "@/lib/integrations/service";

export const JODO_CONFIG = {
  baseUrl: process.env.JODO_BASE_URL || "https://ext.devtest1.jodopay.com",
  authHeader:
    process.env.JODO_AUTH_HEADER ||
    "Basic ODEzMjllYjVjMzIyOjgxOGE0MGQ3LWZjMTMtNDQ4MC05YjdhLTRmYzZkZTJiZDc0YQ==",
  apiKey: process.env.JODO_API_KEY || "81329eb5c322",
  apiSecret: process.env.JODO_API_SECRET || "818a40d7-fc13-4480-9b7a-4fc6de2bd74a",
  defaultComponentType: "Payable Amount",
};

export interface CreateJodoOrderInput {
  name: string;
  phone: string;
  email: string;
  amountRupees: number;
  callbackUrl: string;
  componentType?: string;
  creatorId?: string;
  productId?: string;
  notes?: Array<{ key: string; value: string }>;
  identifier?: string;
}

export interface JodoOrderDetails {
  component_type: string;
  amount: number;
  settlement_utr?: string | null;
  settled_at?: string | null;
}

export interface JodoOrderData {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: "paid" | "unpaid" | string;
  student_name?: string | null;
  identifier?: string | null;
  transaction_id?: string | null;
  paid_at?: string | null;
  details?: JodoOrderDetails[];
  notes?: Array<{ key: string; value: string }> | Record<string, string>;
}

export interface JodoCustomCredentials {
  baseUrl?: string;
  apiKey?: string;
  apiSecret?: string;
  authHeader?: string;
}

export function resolveJodoCredentials(custom?: JodoCustomCredentials) {
  const baseUrl = custom?.baseUrl?.trim() || JODO_CONFIG.baseUrl;
  let authHeader = custom?.authHeader?.trim();
  if (!authHeader && custom?.apiKey?.trim() && custom?.apiSecret?.trim()) {
    authHeader = `Basic ${Buffer.from(`${custom.apiKey.trim()}:${custom.apiSecret.trim()}`).toString("base64")}`;
  }
  if (!authHeader) {
    authHeader = JODO_CONFIG.authHeader;
  }
  return { baseUrl, authHeader };
}

/**
 * Creates a Jodo Pay Order via the DevTest1 / Production API
 * Docs: https://docs.jodo.in/pay/api/create-order/
 */
export async function createJodoPayOrder(
  input: CreateJodoOrderInput,
  customConfig?: JodoCustomCredentials
): Promise<{
  ok: boolean;
  orderId?: string;
  redirectUrl?: string;
  error?: string;
}> {
  const compType = input.componentType || JODO_CONFIG.defaultComponentType;
  const notes = [...(input.notes || [])];

  if (input.creatorId && !notes.some((n) => n.key === "creator_id")) {
    notes.push({ key: "creator_id", value: input.creatorId });
  }
  if (input.productId && !notes.some((n) => n.key === "product_id")) {
    notes.push({ key: "product_id", value: input.productId });
  }

  const payload: Record<string, unknown> = {
    name: input.name.trim(),
    phone: input.phone.replace(/\D/g, "").slice(-10),
    email: input.email.trim().toLowerCase(),
    details: [
      {
        component_type: compType,
        amount: Number(input.amountRupees),
      },
    ],
    callback_url: input.callbackUrl,
    notes,
  };

  if (input.identifier) {
    payload.identifier = input.identifier;
  }

  const { baseUrl, authHeader } = resolveJodoCredentials(customConfig);

  try {
    const res = await fetch(`${baseUrl}/api/v1/integrations/pay/orders`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || data.status === "error" || !data.data?.order_id) {
      const msg = data.message || `Jodo API Error (HTTP ${res.status})`;
      return { ok: false, error: msg };
    }

    return {
      ok: true,
      orderId: data.data.order_id,
      redirectUrl: data.data.redirect_url,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to connect to Jodo payment gateway";
    return { ok: false, error: errorMsg };
  }
}

/**
 * Retrieves the current status of a Jodo Pay Order
 * Docs: https://docs.jodo.in/pay/api/get-order/
 */
export async function getJodoPayOrder(
  orderId: string,
  customConfig?: JodoCustomCredentials
): Promise<{
  ok: boolean;
  data?: JodoOrderData;
  error?: string;
}> {
  if (!orderId) {
    return { ok: false, error: "Order ID is required" };
  }

  const { baseUrl, authHeader } = resolveJodoCredentials(customConfig);

  try {
    const url = `${baseUrl}/api/v1/integrations/pay/orders/${encodeURIComponent(orderId)}`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok || body.status === "error" || !body.data) {
      const msg = body.message || `Order not found or Jodo API error (HTTP ${res.status})`;
      return { ok: false, error: msg };
    }

    return {
      ok: true,
      data: body.data as JodoOrderData,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to fetch order status from Jodo";
    return { ok: false, error: errorMsg };
  }
}

export interface JodoUnlockResult {
  ok: boolean;
  orderId: string;
  invoiceNo?: string;
  status: string;
  courseTitle?: string;
  customerName?: string;
  customerEmail?: string;
  amountPaise?: number;
  alreadyUnlocked?: boolean;
  error?: string;
}

/**
 * Unlocks the student course, allocates the GST tax invoice, creates an Enrollment,
 * and records the ledger credit once Jodo order status is confirmed as 'paid'.
 */
export async function completeJodoOrderAndUnlock(orderId: string, options?: {
  creatorId?: string;
  productId?: string;
  tysonpeOrderId?: string;
  customConfig?: JodoCustomCredentials;
}): Promise<JodoUnlockResult> {
  const statusRes = await getJodoPayOrder(orderId, options?.customConfig);

  if (!statusRes.ok || !statusRes.data) {
    return {
      ok: false,
      orderId,
      status: "unknown",
      error: statusRes.error || "Unable to retrieve order from Jodo gateway",
    };
  }

  const jodoOrder = statusRes.data;

  // Check if status is paid
  const isPaid = jodoOrder.status === "paid";
  if (!isPaid) {
    return {
      ok: false,
      orderId,
      status: jodoOrder.status,
      error: `Order is currently '${jodoOrder.status}'. Course unlock requires payment completion.`,
    };
  }

  // Parse notes to resolve creator, product and tysonpe_order_id
  const notesMap: Record<string, string> = {};
  if (Array.isArray(jodoOrder.notes)) {
    for (const n of jodoOrder.notes) {
      if (n && n.key) notesMap[n.key] = String(n.value || "");
    }
  } else if (typeof jodoOrder.notes === "object" && jodoOrder.notes !== null) {
    for (const [k, v] of Object.entries(jodoOrder.notes)) {
      notesMap[k] = String(v);
    }
  }

  const targetTysonpeOrderId = options?.tysonpeOrderId || notesMap.tysonpe_order_id;

  // Idempotency: check if already recorded as paid
  let existingOrder = await db.order.findUnique({
    where: { providerOrderId: orderId },
    include: { product: true, user: true },
  });

  if (!existingOrder && targetTysonpeOrderId) {
    existingOrder = await db.order.findUnique({
      where: { id: targetTysonpeOrderId },
      include: { product: true, user: true },
    });
  }

  if (existingOrder && existingOrder.status === "paid") {
    return {
      ok: true,
      orderId,
      invoiceNo: existingOrder.invoiceNo || undefined,
      status: "paid",
      courseTitle: existingOrder.product.title,
      customerName: existingOrder.user.name,
      customerEmail: existingOrder.user.email,
      amountPaise: existingOrder.totalPaise,
      alreadyUnlocked: true,
    };
  }

  const targetCreatorId = options?.creatorId || notesMap.creator_id || existingOrder?.creatorId;
  const targetProductId = options?.productId || notesMap.product_id || existingOrder?.productId;

  // Resolve creator
  const creator = targetCreatorId
    ? await db.creator.findUnique({ where: { id: targetCreatorId } })
    : await db.creator.findFirst({ orderBy: { createdAt: "asc" } });

  if (!creator) {
    return { ok: false, orderId, status: "paid", error: "No creator found to allocate order" };
  }

  // Resolve product
  const product = targetProductId
    ? await db.product.findUnique({ where: { id: targetProductId } })
    : await db.product.findFirst({
        where: { creatorId: creator.id, status: "published" },
        orderBy: { createdAt: "desc" },
      });

  if (!product) {
    return { ok: false, orderId, status: "paid", error: "No active course product found for creator" };
  }

  // Calculate amount
  const itemAmount = jodoOrder.details?.[0]?.amount;
  const amountPaise = itemAmount && itemAmount > 0
    ? Math.round(itemAmount * 100)
    : existingOrder?.totalPaise || product.pricePaise;

  const paidDate = jodoOrder.paid_at ? new Date(jodoOrder.paid_at) : new Date();
  const fy = fiscalYear(paidDate);

  try {
    const result = await db.$transaction(async (tx) => {
      // 1. Find or create buyer User
      let buyer = await tx.user.findUnique({
        where: { email: jodoOrder.email.toLowerCase().trim() },
      });

      if (!buyer && existingOrder) {
        buyer = await tx.user.findUnique({
          where: { id: existingOrder.userId },
        });
      }

      if (!buyer) {
        buyer = await tx.user.create({
          data: {
            email: jodoOrder.email.toLowerCase().trim(),
            name: jodoOrder.name || "Student",
            passwordHash: "$2b$12$e82b7c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b",
            preferredGateway: "jodo",
          },
        });
      }

      // 2. Allocate consecutive GST tax invoice
      const counter = await tx.invoiceCounter.upsert({
        where: { key: `${creator.id}:${fy}` },
        create: { key: `${creator.id}:${fy}`, seq: 1 },
        update: { seq: { increment: 1 } },
      });
      const invoiceNo = formatInvoiceNo(fy, counter.seq);
      const gstPaise = Math.round((amountPaise * 18) / 118);

      // 3. Create or update Order
      let savedOrder;
      if (existingOrder) {
        savedOrder = await tx.order.update({
          where: { id: existingOrder.id },
          data: {
            provider: "jodo",
            providerOrderId: orderId,
            providerPaymentId: jodoOrder.transaction_id || `jodo_${Date.now()}`,
            status: "paid",
            paidAt: paidDate,
            invoiceNo,
          },
        });
      } else {
        savedOrder = await tx.order.upsert({
          where: { providerOrderId: orderId },
          create: {
            userId: buyer.id,
            productId: product.id,
            creatorId: creator.id,
            provider: "jodo",
            providerOrderId: orderId,
            providerPaymentId: jodoOrder.transaction_id || `jodo_${Date.now()}`,
            subtotalPaise: amountPaise,
            totalPaise: amountPaise,
            gstPaise,
            gstRatePct: 18,
            status: "paid",
            paidAt: paidDate,
            invoiceNo,
          },
          update: {
            status: "paid",
            paidAt: paidDate,
            invoiceNo,
            providerPaymentId: jodoOrder.transaction_id || undefined,
          },
        });
      }

      // 4. Create Enrollment (unlocking course content)
      const existingEnrollment = await tx.enrollment.findUnique({
        where: { userId_productId: { userId: buyer.id, productId: product.id } },
      });

      if (!existingEnrollment) {
        await tx.enrollment.create({
          data: {
            userId: buyer.id,
            productId: product.id,
            orderId: savedOrder.id,
          },
        });
      }

      // 5. Creator Ledger Credit
      const existingLedger = await tx.ledgerEntry.findUnique({
        where: { orderId: savedOrder.id },
      });

      if (!existingLedger) {
        const fees = feeBreakdown(amountPaise, creator.planKey);
        await tx.ledgerEntry.create({
          data: {
            creatorId: creator.id,
            orderId: savedOrder.id,
            grossPaise: amountPaise,
            platformFeePaise: fees.platformFeePaise,
            gatewayFeePaise: fees.gatewayFeePaise,
            netPaise: fees.netPaise,
          },
        });
      }

      // 6. CRM Lead capture
      const phoneDigits = jodoOrder.phone.replace(/\D/g, "");
      if (phoneDigits.length >= 10) {
        await tx.lead.upsert({
          where: {
            creatorId_phone: {
              creatorId: creator.id,
              phone: phoneDigits,
            },
          },
          create: {
            creatorId: creator.id,
            phone: phoneDigits,
            name: jodoOrder.name,
            email: jodoOrder.email,
            status: "BOOKED",
            notes: `Jodo Pay Order: ${orderId} | Unlocked: ${product.title}`,
          },
          update: {
            status: "BOOKED",
            name: jodoOrder.name,
            email: jodoOrder.email,
            notes: `Jodo Pay Order: ${orderId} | Unlocked: ${product.title}`,
          },
        });
      }

      return {
        order: savedOrder,
        invoiceNo,
        buyer,
      };
    });

    // Fire outbound integrations
    dispatchCreatorWebhook(creator.id, "order.paid", {
      orderId: result.order.id,
      provider: "jodo",
      providerOrderId: orderId,
      customerEmail: jodoOrder.email,
      customerName: jodoOrder.name,
      amountPaise,
      invoiceNo: result.invoiceNo,
      courseTitle: product.title,
      paidAt: paidDate.toISOString(),
    }).catch(() => {});

    return {
      ok: true,
      orderId,
      invoiceNo: result.invoiceNo,
      status: "paid",
      courseTitle: product.title,
      customerName: jodoOrder.name,
      customerEmail: jodoOrder.email,
      amountPaise,
      alreadyUnlocked: false,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Database transaction failed during course unlock";
    return { ok: false, orderId, status: "paid", error: errorMsg };
  }
}
