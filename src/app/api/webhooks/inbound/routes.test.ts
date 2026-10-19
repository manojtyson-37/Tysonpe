import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { saveCreatorIntegrations } from "@/lib/integrations/service";
import { GET, POST } from "./[token]/route";
import { NextRequest } from "next/server";

describe("Inbound Webhook API Route Handler", () => {
  const sampleJodoPayload = {
    event_id: "45bb1387-2a83-4fdb-a149-e7dec81043f0",
    event: "order.payment.debited",
    version: "1.0",
    timestamp: 1691143279,
    payload: {
      order_id: "order_http_test_987",
      order: {
        name: "Ron Rivest",
        phone: "9876543210",
        identifier: "STUDENT_IDENTIFIER",
        email: "ron@example.com",
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

  it("handles GET health probe on inbound endpoint", async () => {
    const handle = `creator_probe_${Date.now().toString(36)}`;
    const user = await db.user.create({
      data: {
        email: `${handle}@tysonpe.test`,
        name: "Probe Creator",
        passwordHash: "x",
      },
    });

    await db.creator.create({
      data: {
        userId: user.id,
        handle,
        displayName: "Probe Creator",
      },
    });

    const req = new NextRequest(`https://tysonpe.com/api/webhooks/inbound/${handle}`);
    const res = await GET(req, { params: Promise.resolve({ token: handle }) });
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.status).toBe("active");
  });

  it("handles POST of partner webhook and creates automated payment record", async () => {
    const handle = `creator_post_${Date.now().toString(36)}`;
    const user = await db.user.create({
      data: {
        email: `${handle}@tysonpe.test`,
        name: "Post Creator",
        passwordHash: "x",
      },
    });

    const creator = await db.creator.create({
      data: {
        userId: user.id,
        handle,
        displayName: "Post Creator",
      },
    });

    const token = `inwh_tok_${Date.now()}`;
    await saveCreatorIntegrations(creator.id, {
      webhooks: [],
      tracking: { enabled: true },
      liveClass: { defaultProvider: "zoom" },
      emailMarketing: { provider: "none", autoSyncLearners: false },
      telegram: { autoInviteOnPurchase: false },
      googleSheets: { sheetName: "Tysonpe Orders", syncOnOrder: true, syncOnLead: true, enabled: false },
      discord: { botEnabled: false, autoNotifyOnPurchase: true },
      sms: { provider: "fast2sms", senderId: "TYSONP", sendOtp: true, sendOrderConfirmation: true, enabled: false },
      customDomain: { verified: false, sslActive: false },
      inboundEndpoints: [
        {
          id: "inwh_1",
          token,
          name: "Jodo Partner Hook",
          partner: "jodo",
          enabled: true,
          createdAt: new Date().toISOString(),
          totalReceived: 0,
        },
      ],
    });

    const req = new NextRequest(`https://tysonpe.com/api/webhooks/inbound/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sampleJodoPayload),
    });

    const res = await POST(req, { params: Promise.resolve({ token }) });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.status).toBe("processed");
    expect(json.order_id).toBe("order_http_test_987");
    expect(json.invoice_no).toMatch(/^TP\//);
    expect(json.amount_paise).toBe(1000000);
  });
});
