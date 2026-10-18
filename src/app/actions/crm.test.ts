import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { importBulkLeadsAction, createLeadAction } from "./crm";

const session = vi.hoisted(() => ({
  user: null as { id: string; name: string; email: string } | null,
  creator: null as { id: string; userId: string; handle: string; displayName: string } | null,
}));

vi.mock("@/lib/auth/session", () => ({
  requireCreator: async () => {
    if (!session.creator) throw new Error("UNAUTHORIZED");
    return { user: session.user, creator: session.creator };
  },
}));

vi.mock("@/lib/whatsapp/client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/whatsapp/client")>("@/lib/whatsapp/client");
  return {
    ...actual,
    sendWhatsAppTemplate: vi.fn().mockResolvedValue({ success: true, messageId: "wamid.TEST_BULK" }),
  };
});

let n = 0;
async function setupCreator() {
  n++;
  const user = await db.user.create({
    data: { email: `crm${n}-${Date.now()}@t.test`, name: `Creator ${n}`, passwordHash: "x" },
  });
  const creator = await db.creator.create({
    data: { userId: user.id, handle: `crmhandle${n}${Date.now()}`, displayName: `Creator ${n}` },
  });
  session.user = user;
  session.creator = creator;
  return { user, creator };
}

describe("CRM actions", () => {
  beforeEach(async () => {
    await setupCreator();
  });

  describe("importBulkLeadsAction", () => {
    it("rejects empty lead lists", async () => {
      const res = await importBulkLeadsAction({ leads: [] });
      expect(res.ok).toBe(false);
      expect(res.error).toContain("No leads provided");
    });

    it("normalizes phone numbers, deduplicates, and creates leads", async () => {
      const res = await importBulkLeadsAction({
        leads: [
          { phone: "+91 98765-43210", name: "Rahul Sharma", intent: "Webinar lead" },
          { phone: "9876543210", name: "Rahul Duplicate" }, // duplicate phone
          { phone: "919812345678", name: "Pooja Verma", intent: "Storefront inquiry" },
        ],
        status: "INQUIRY",
      });

      expect(res.ok).toBe(true);
      expect(res.importedCount).toBe(2);

      const dbLeads = await db.lead.findMany({
        where: { creatorId: session.creator!.id },
        orderBy: { phone: "asc" },
      });

      expect(dbLeads.length).toBe(2);
      expect(dbLeads[0].phone).toBe("919812345678");
      expect(dbLeads[0].status).toBe("INQUIRY");
      expect(dbLeads[1].phone).toBe("919876543210");
    });

    it("sends approved WhatsApp template if specified", async () => {
      const res = await importBulkLeadsAction({
        leads: [
          { phone: "9876500001", name: "Anil" },
          { phone: "9876500002", name: "Sunil" },
        ],
        sendTemplateName: "tysonpe_order_update_test_v1",
        templateParameters: ["{{name}}", "Masterclass", "₹1", "https://tysonpe.com"],
      });

      expect(res.ok).toBe(true);
      expect(res.importedCount).toBe(2);
      expect(res.sentCount).toBe(2);

      const messages = await db.whatsAppMessage.findMany({
        where: { creatorId: session.creator!.id },
      });
      expect(messages.length).toBe(2);
      expect(messages[0].templateName).toBe("tysonpe_order_update_test_v1");
    });
  });

  describe("createLeadAction", () => {
    it("creates a single lead with formatted phone", async () => {
      const res = await createLeadAction({
        phone: "9876512345",
        name: "Test Lead",
        notes: "Interested in consulting",
      });

      expect(res.ok).toBe(true);
      expect(res.lead?.phone).toBe("919876512345");
      expect(res.lead?.name).toBe("Test Lead");
    });
  });
});
