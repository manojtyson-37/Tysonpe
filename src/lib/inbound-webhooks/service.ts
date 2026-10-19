import { db } from "@/lib/db";
import { fiscalYear, formatInvoiceNo } from "@/lib/invoice";
import { feeBreakdown } from "@/lib/money";
import {
  getCreatorIntegrations,
  saveCreatorIntegrations,
  dispatchCreatorWebhook,
} from "@/lib/integrations/service";
import type {
  InboundWebhookEndpoint,
  InboundWebhookLog,
} from "@/lib/integrations/types";

export interface NormalizedInboundPayment {
  eventId: string;
  eventType: string;
  isPaid: boolean;
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  paidAt: string;
  amountPaise: number;
  componentTitle: string;
  notes: Record<string, string>;
  rawStatus: string;
}

/**
 * Normalizes partner payloads into a consistent payment representation.
 * Supports Jodo / Institutional gateways, generic webhooks, and custom partners.
 */
export function normalizeInboundPayload(raw: Record<string, unknown>): NormalizedInboundPayment {
  const eventId = String(
    raw.event_id || raw.id || raw.eventId || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  );
  const eventType = String(raw.event || raw.type || raw.event_type || "order.payment.debited");

  // Inspect nested payload (e.g., Jodo format: raw.payload.order)
  const payloadObj = (raw.payload && typeof raw.payload === "object" ? raw.payload : {}) as Record<string, unknown>;
  const orderObj = (payloadObj.order && typeof payloadObj.order === "object" ? payloadObj.order : {}) as Record<string, unknown>;
  const customerObj = (payloadObj.customer && typeof payloadObj.customer === "object" ? payloadObj.customer : {}) as Record<string, unknown>;

  // Order ID
  const orderId = String(
    payloadObj.order_id ||
    orderObj.order_id ||
    orderObj.id ||
    raw.order_id ||
    raw.orderId ||
    `ord_in_${Date.now()}`
  );

  // Customer identity
  const customerName = String(
    orderObj.name ||
    customerObj.name ||
    raw.customer_name ||
    raw.name ||
    "Partner Customer"
  );

  const customerEmail = String(
    orderObj.email ||
    customerObj.email ||
    raw.customer_email ||
    raw.email ||
    "customer@example.com"
  );

  const customerPhone = String(
    orderObj.phone ||
    customerObj.phone ||
    raw.customer_phone ||
    raw.phone ||
    ""
  );

  // Paid timestamp
  let paidAt = String(orderObj.paid_at || payloadObj.paid_at || raw.paid_at || "");
  if (!paidAt) {
    if (typeof raw.timestamp === "number") {
      paidAt = new Date(raw.timestamp * 1000).toISOString();
    } else {
      paidAt = new Date().toISOString();
    }
  }

  // Raw status & payment check
  const rawStatus = String(orderObj.status || payloadObj.status || raw.status || "paid").toLowerCase();
  const isPaid =
    rawStatus === "paid" ||
    rawStatus === "success" ||
    rawStatus === "debited" ||
    rawStatus === "captured" ||
    eventType.includes("debited") ||
    eventType.includes("paid") ||
    eventType.includes("success") ||
    eventType.includes("captured");

  // Amount computation
  let amountPaise = 0;
  let componentTitle = "Partner Payment";

  if (Array.isArray(orderObj.details) && orderObj.details.length > 0) {
    // Sum component amounts (in INR floats e.g. 10000.0 -> paise)
    let totalInr = 0;
    for (const item of orderObj.details as Array<{ component_type?: string; amount?: number }>) {
      if (item && typeof item.amount === "number") {
        totalInr += item.amount;
      }
      if (item?.component_type && componentTitle === "Partner Payment") {
        componentTitle = String(item.component_type);
      }
    }
    amountPaise = Math.round(totalInr * 100);
  } else if (typeof orderObj.amount === "number") {
    // If order.amount is already large (>= 10000 and integer) check if paise
    amountPaise = orderObj.amount >= 10000 && Number.isInteger(orderObj.amount)
      ? orderObj.amount
      : Math.round(orderObj.amount * 100);
  } else if (typeof raw.amount === "number") {
    amountPaise = raw.amount >= 10000 && Number.isInteger(raw.amount)
      ? raw.amount
      : Math.round(raw.amount * 100);
  } else {
    // Default fallback to 10,000 INR
    amountPaise = 1000000;
  }

  // Notes extraction
  const notes: Record<string, string> = {};
  if (Array.isArray(orderObj.notes)) {
    for (const note of orderObj.notes as Array<{ key?: string; value?: string }>) {
      if (note && note.key) {
        notes[String(note.key)] = String(note.value || "");
      }
    }
  } else if (typeof orderObj.notes === "object" && orderObj.notes !== null) {
    for (const [k, v] of Object.entries(orderObj.notes)) {
      notes[k] = String(v);
    }
  }

  if (orderObj.identifier) {
    notes.identifier = String(orderObj.identifier);
  }

  return {
    eventId,
    eventType,
    isPaid,
    orderId,
    customerName,
    customerEmail,
    customerPhone,
    paidAt,
    amountPaise,
    componentTitle,
    notes,
    rawStatus,
  };
}

/**
 * Finds the creator owning the given endpoint token
 */
export async function findCreatorByInboundToken(token: string): Promise<{
  creatorId: string;
  creatorHandle: string;
  creatorName: string;
  planKey: string;
  endpoint: InboundWebhookEndpoint;
} | null> {
  if (!token) return null;

  // Search by token in storefrontConfig
  const creators = await db.creator.findMany({
    where: {
      storefrontConfig: {
        contains: token,
      },
    },
    select: {
      id: true,
      handle: true,
      displayName: true,
      planKey: true,
      storefrontConfig: true,
    },
  });

  for (const c of creators) {
    if (!c.storefrontConfig) continue;
    try {
      const parsed = JSON.parse(c.storefrontConfig);
      const endpoints: InboundWebhookEndpoint[] = parsed.integrations?.inboundEndpoints || [];
      const match = endpoints.find((ep) => ep.token === token && ep.enabled);
      if (match) {
        return {
          creatorId: c.id,
          creatorHandle: c.handle,
          creatorName: c.displayName,
          planKey: c.planKey,
          endpoint: match,
        };
      }
    } catch {
      // ignore parse errors
    }
  }

  // Fallback: check if token matches creator handle directly
  const creatorByHandle = await db.creator.findUnique({
    where: { handle: token },
    select: {
      id: true,
      handle: true,
      displayName: true,
      planKey: true,
      storefrontConfig: true,
    },
  });

  if (creatorByHandle) {
    const config = await getCreatorIntegrations(creatorByHandle.id);
    const primary = config.inboundEndpoints?.[0] || {
      id: `inwh_default_${creatorByHandle.id}`,
      token: creatorByHandle.handle,
      name: "Default Inbound Gateway",
      partner: "jodo" as const,
      enabled: true,
      createdAt: new Date().toISOString(),
      totalReceived: 0,
    };

    return {
      creatorId: creatorByHandle.id,
      creatorHandle: creatorByHandle.handle,
      creatorName: creatorByHandle.displayName,
      planKey: creatorByHandle.planKey,
      endpoint: primary,
    };
  }

  return null;
}

/**
 * Processes an inbound payment webhook and automates:
 * 1. Customer User creation (if not exists)
 * 2. Order creation & status 'paid'
 * 3. Fiscal year sequential tax invoice allocation
 * 4. Course / cohort enrollment
 * 5. Net creator ledger credit & payout reconciliation
 * 6. CRM Lead capture
 * 7. Inbound event log record
 */
export async function processInboundWebhook(
  creatorId: string,
  endpointId: string,
  rawPayload: Record<string, unknown>
): Promise<{
  ok: boolean;
  orderId: string;
  invoiceNo?: string;
  amountPaise: number;
  customerName: string;
  customerEmail: string;
  alreadyProcessed?: boolean;
  error?: string;
}> {
  const parsed = normalizeInboundPayload(rawPayload);

  // Check idempotency: order already paid
  const existingOrder = await db.order.findUnique({
    where: { providerOrderId: parsed.orderId },
    select: { id: true, status: true, invoiceNo: true, totalPaise: true },
  });

  if (existingOrder && existingOrder.status === "paid") {
    return {
      ok: true,
      orderId: parsed.orderId,
      invoiceNo: existingOrder.invoiceNo || undefined,
      amountPaise: existingOrder.totalPaise,
      customerName: parsed.customerName,
      customerEmail: parsed.customerEmail,
      alreadyProcessed: true,
    };
  }

  try {
    const creator = await db.creator.findUniqueOrThrow({
      where: { id: creatorId },
      select: { id: true, planKey: true, handle: true, displayName: true },
    });

    const result = await db.$transaction(async (tx) => {
      // 1. Find or create buyer User
      let buyer = await tx.user.findUnique({
        where: { email: parsed.customerEmail },
      });

      if (!buyer) {
        buyer = await tx.user.create({
          data: {
            email: parsed.customerEmail,
            name: parsed.customerName,
            passwordHash: "$2b$12$e82b7c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b", // secure unusable placeholder
          },
        });
      }

      // 2. Find a product for this creator or auto-create an inbound institutional offering
      let product = await tx.product.findFirst({
        where: { creatorId: creator.id, status: "published" },
        orderBy: { createdAt: "desc" },
      });

      if (!product) {
        const slug = `partner-${Date.now().toString(36)}`;
        product = await tx.product.create({
          data: {
            creatorId: creator.id,
            title: parsed.componentTitle || "Admission & Program Access",
            slug,
            type: "course",
            status: "published",
            pricePaise: parsed.amountPaise,
            gstRatePct: 18,
          },
        });
      }

      // 3. Create or update Order
      const paidDate = new Date(parsed.paidAt);
      const fy = fiscalYear(paidDate);

      // Allocate consecutive invoice number
      const counter = await tx.invoiceCounter.upsert({
        where: { key: `${creator.id}:${fy}` },
        create: { key: `${creator.id}:${fy}`, seq: 1 },
        update: { seq: { increment: 1 } },
      });
      const invoiceNo = formatInvoiceNo(fy, counter.seq);

      const gstPaise = Math.round((parsed.amountPaise * 18) / 118);

      const order = await tx.order.create({
        data: {
          userId: buyer.id,
          productId: product.id,
          creatorId: creator.id,
          provider: "jodo",
          providerOrderId: parsed.orderId,
          providerPaymentId: parsed.eventId,
          subtotalPaise: parsed.amountPaise,
          totalPaise: parsed.amountPaise,
          gstPaise,
          gstRatePct: 18,
          status: "paid",
          paidAt: paidDate,
          invoiceNo,
        },
      });

      // 4. Create Enrollment
      const existingEnrollment = await tx.enrollment.findUnique({
        where: { userId_productId: { userId: buyer.id, productId: product.id } },
      });
      if (!existingEnrollment) {
        await tx.enrollment.create({
          data: {
            userId: buyer.id,
            productId: product.id,
            orderId: order.id,
          },
        });
      }

      // 5. Create Ledger Entry for creator earnings
      const fees = feeBreakdown(parsed.amountPaise, creator.planKey);
      await tx.ledgerEntry.create({
        data: {
          creatorId: creator.id,
          orderId: order.id,
          grossPaise: parsed.amountPaise,
          platformFeePaise: fees.platformFeePaise,
          gatewayFeePaise: fees.gatewayFeePaise,
          netPaise: fees.netPaise,
        },
      });

      // 6. CRM Lead Sync
      if (parsed.customerPhone) {
        const cleanPhone = parsed.customerPhone.replace(/\D/g, "");
        if (cleanPhone.length >= 10) {
          await tx.lead.upsert({
            where: {
              creatorId_phone: {
                creatorId: creator.id,
                phone: cleanPhone,
              },
            },
            create: {
              creatorId: creator.id,
              phone: cleanPhone,
              name: parsed.customerName,
              email: parsed.customerEmail,
              status: "BOOKED",
              notes: `Inbound payment automated. Invoice: ${invoiceNo}, Order: ${parsed.orderId}`,
              quoteAmount: parsed.amountPaise,
            },
            update: {
              status: "BOOKED",
              name: parsed.customerName,
              email: parsed.customerEmail,
              notes: `Inbound payment automated. Invoice: ${invoiceNo}, Order: ${parsed.orderId}`,
              quoteAmount: parsed.amountPaise,
            },
          });
        }
      }

      return { order, invoiceNo };
    });

    // 7. Record Inbound Webhook Event Log in creator integrations config
    const currentConfig = await getCreatorIntegrations(creator.id);
    const updatedEndpoints = (currentConfig.inboundEndpoints || []).map((ep) => {
      if (ep.id === endpointId || ep.token === endpointId) {
        return {
          ...ep,
          totalReceived: (ep.totalReceived || 0) + 1,
          lastReceivedAt: new Date().toISOString(),
          lastStatus: 200,
          lastEvent: parsed.eventType,
          lastOrderId: parsed.orderId,
        };
      }
      return ep;
    });

    const newLog: InboundWebhookLog = {
      id: `inlog_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      endpointId,
      eventId: parsed.eventId,
      event: parsed.eventType,
      orderId: parsed.orderId,
      customerName: parsed.customerName,
      customerEmail: parsed.customerEmail,
      customerPhone: parsed.customerPhone,
      amountPaise: parsed.amountPaise,
      status: "processed",
      statusCode: 200,
      receivedAt: new Date().toISOString(),
      invoiceNo: result.invoiceNo,
      rawPayload,
    };

    const updatedLogs = [newLog, ...(currentConfig.inboundLogs || [])].slice(0, 30);

    await saveCreatorIntegrations(creator.id, {
      ...currentConfig,
      inboundEndpoints: updatedEndpoints,
      inboundLogs: updatedLogs,
    });

    // 8. Fire outbound webhook to creator's own webhook listeners if configured
    dispatchCreatorWebhook(creator.id, "order.paid", {
      orderId: result.order.id,
      amountPaise: parsed.amountPaise,
      currency: "INR",
      buyerName: parsed.customerName,
      buyerEmail: parsed.customerEmail,
      invoiceNo: result.invoiceNo,
      source: "inbound_webhook",
      erpReferenceId: parsed.notes.erp_reference_id || undefined,
    }).catch(() => {});

    return {
      ok: true,
      orderId: parsed.orderId,
      invoiceNo: result.invoiceNo,
      amountPaise: parsed.amountPaise,
      customerName: parsed.customerName,
      customerEmail: parsed.customerEmail,
    };
  } catch (err) {
    console.error("Failed to process inbound webhook:", err);
    return {
      ok: false,
      orderId: parsed.orderId,
      amountPaise: parsed.amountPaise,
      customerName: parsed.customerName,
      customerEmail: parsed.customerEmail,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
