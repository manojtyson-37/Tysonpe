import { describe, expect, it, beforeEach } from "vitest";
import { db } from "@/lib/db";
import {
  normalizeInboundPayload,
  processInboundWebhook,
} from "./service";

describe("inbound webhooks service", () => {
  const sampleJodoPayload = {
    event_id: "45bb1387-2a83-4fdb-a149-e7dec81043f0",
    event: "order.payment.debited",
    version: "1.0",
    timestamp: 1691143279,
    payload: {
      order_id: "order_12343532424",
      order: {
        name: "Ron Rivest",
        phone: "9876543210",
        identifier: "STUDENT_IDENTIFIER",
        email: "customer@example.com",
        paid_at: "2023-04-05T07:07:20Z",
        status: "paid",
        details: [{ component_type: "Admission Fee", amount: 10000.0 }],
        notes: [
          {
            key: "erp_reference_id",
            value: "REF123",
          },
        ],
      },
    },
  };

  describe("normalizeInboundPayload", () => {
    it("correctly extracts fields from Jodo / partner payload", () => {
      const normalized = normalizeInboundPayload(sampleJodoPayload);

      expect(normalized.eventId).toBe("45bb1387-2a83-4fdb-a149-e7dec81043f0");
      expect(normalized.eventType).toBe("order.payment.debited");
      expect(normalized.orderId).toBe("order_12343532424");
      expect(normalized.customerName).toBe("Ron Rivest");
      expect(normalized.customerEmail).toBe("customer@example.com");
      expect(normalized.customerPhone).toBe("9876543210");
      expect(normalized.isPaid).toBe(true);
      // 10000.0 INR = 1,000,000 paise
      expect(normalized.amountPaise).toBe(1000000);
      expect(normalized.componentTitle).toBe("Admission Fee");
      expect(normalized.notes.erp_reference_id).toBe("REF123");
      expect(normalized.notes.identifier).toBe("STUDENT_IDENTIFIER");
    });

    it("handles generic flat webhook payloads", () => {
      const genericPayload = {
        id: "evt_generic_99",
        event: "payment.captured",
        order_id: "ord_gen_88",
        name: "Alice Smith",
        email: "alice@example.com",
        amount: 4999, // 4999 INR
        status: "paid",
      };

      const normalized = normalizeInboundPayload(genericPayload);
      expect(normalized.eventId).toBe("evt_generic_99");
      expect(normalized.orderId).toBe("ord_gen_88");
      expect(normalized.customerName).toBe("Alice Smith");
      expect(normalized.customerEmail).toBe("alice@example.com");
      expect(normalized.amountPaise).toBe(499900);
      expect(normalized.isPaid).toBe(true);
    });
  });

  describe("processInboundWebhook", () => {
    let testCreatorId: string;

    beforeEach(async () => {
      // Ensure a test creator exists
      const testEmail = `creator_inbound_${Date.now()}@tysonpe.test`;
      const user = await db.user.create({
        data: {
          email: testEmail,
          name: "Dr. Creator",
          passwordHash: "x",
        },
      });

      const creator = await db.creator.create({
        data: {
          userId: user.id,
          handle: `creator_inwh_${Date.now().toString(36)}`,
          displayName: "Dr. Creator",
          planKey: "pro",
        },
      });

      testCreatorId = creator.id;
    });

    it("automates customer creation, order record, invoice, and ledger entry", async () => {
      const endpointId = "inwh_test_ep_1";
      const result = await processInboundWebhook(
        testCreatorId,
        endpointId,
        sampleJodoPayload
      );

      expect(result.ok).toBe(true);
      expect(result.orderId).toBe("order_12343532424");
      expect(result.customerName).toBe("Ron Rivest");
      expect(result.customerEmail).toBe("customer@example.com");
      expect(result.amountPaise).toBe(1000000);
      expect(result.invoiceNo).toMatch(/^TP\/\d{4}-\d{2}\/\d{5}$/);

      // Verify Order exists in database
      const order = await db.order.findUnique({
        where: { providerOrderId: "order_12343532424" },
        include: { user: true, ledger: true, enrollment: true },
      });

      expect(order).not.toBeNull();
      expect(order?.status).toBe("paid");
      expect(order?.totalPaise).toBe(1000000);
      expect(order?.user.email).toBe("customer@example.com");
      expect(order?.user.name).toBe("Ron Rivest");
      expect(order?.ledger).not.toBeNull();
      expect(order?.ledger?.grossPaise).toBe(1000000);
      expect(order?.enrollment).not.toBeNull();

      // Verify Lead exists in CRM
      const lead = await db.lead.findFirst({
        where: { creatorId: testCreatorId, phone: "9876543210" },
      });
      expect(lead).not.toBeNull();
      expect(lead?.status).toBe("BOOKED");
      expect(lead?.quoteAmount).toBe(1000000);
    });

    it("is idempotent when the same order payload is delivered twice", async () => {
      const endpointId = "inwh_test_ep_2";

      const res1 = await processInboundWebhook(
        testCreatorId,
        endpointId,
        sampleJodoPayload
      );
      expect(res1.ok).toBe(true);

      const res2 = await processInboundWebhook(
        testCreatorId,
        endpointId,
        sampleJodoPayload
      );
      expect(res2.ok).toBe(true);
      expect(res2.alreadyProcessed).toBe(true);
      expect(res2.invoiceNo).toBe(res1.invoiceNo);

      // Verify orders count did not duplicate
      const orders = await db.order.findMany({
        where: { providerOrderId: "order_12343532424" },
      });
      expect(orders.length).toBe(1);
    });
  });
});
